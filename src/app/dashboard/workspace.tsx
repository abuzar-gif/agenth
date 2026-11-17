'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  Blocks,
  Bot,
  BrainCircuit,
  Cpu,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CirclePause,
  CirclePlay,
  Globe2,
  House,
  Languages,
  ListTodo,
  LoaderCircle,
  LogOut,
  Menu,
  MessageCircle,
  MessagesSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  SendHorizontal,
  Share2,
  SlidersHorizontal,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import Onboarding, { questions, type Profile } from '@/components/onboarding';
import Voice from '@/components/voice';
import WhatsAppLinkedConnect from '@/components/WhatsAppLinkedConnect';
import WhatsAppAgentPanel from '@/components/WhatsAppAgentPanel';
import ChatPanel from '@/components/chat/ChatPanel';
import BrowserStudio from '@/components/browser/BrowserStudio';
import AISettings from '@/components/settings/AISettings';
import UsageSummary from '@/components/settings/UsageSummary';
import { useOrbState } from '@/hooks/useOrbState';
import ToolIcon from '@/components/ToolIcon';
import { AgentAvatar, BrandMark, EmptyState, IconButton, StatusPill } from '@/components/dashboard/primitives';
import AgentBuilder from '@/components/agents/AgentBuilder';
import AgentEditor from '@/components/agents/AgentEditor';
import styles from './workspace.module.css';

type TaskEvent = {
  id: string;
  agent: string;
  kind: string;
  message: string;
  data?: unknown;
  createdAt: string;
};

type Task = {
  id: string;
  instruction: string;
  status: string;
  result?: string;
  error?: string;
  plan?: unknown;
  approval?: { step?: unknown };
  model?: string;
  tokens?: number;
  durationMs?: number;
  createdAt: string;
  events: TaskEvent[];
};

type Connector = {
  provider: string;
  name: string;
  auth: string;
  scopes: string[];
  actions: string[];
  connection: { updatedAt?: string; metadata?: unknown } | null;
};

type Agent = {
  id?: string;
  name: string;
  role: string;
  permissions: string[];
  builtin?: boolean;
  connector?: string;
  avatarColor?: string | null;
  avatarShape?: string | null;
  template?: string | null;
  description?: string | null;
  systemInstructions?: string | null;
  memoryEnabled?: boolean;
  approvalRequired?: boolean;
  status?: string;
};

type Schedule = {
  id: string;
  instruction: string;
  nextRun: string;
  timezone: string;
  cron?: string;
  paused: boolean;
};

type BrowserSnapshot = { url?: string; updatedAt?: string } | null;
type SystemStatus = Record<string, unknown> | null;
type Tab =
  | 'home' | 'search' | 'chat' | 'chief' | 'history' | 'tasks' | 'browser'
  | 'apps' | 'explore' | 'agents' | 'schedules' | 'usage' | 'plans' | 'settings'
  | 'setup' | 'whatsapp-agent';
type DashboardDialog = 'apps' | 'market' | 'settings' | 'share' | null;

type NavItem = {
  key: Tab;
  label: string;
  icon: LucideIcon;
  group: 'Workspace' | 'History' | 'Agents & automation' | 'Integrations' | 'Account';
  description: string;
};

const navigation: NavItem[] = [
  { key: 'home', label: 'Home', icon: House, group: 'Workspace', description: 'Your command center' },
  { key: 'search', label: 'Search', icon: Search, group: 'Workspace', description: 'Find conversations and work' },
  { key: 'chat', label: 'Chat', icon: MessageCircle, group: 'Workspace', description: 'Talk with AgentH' },
  { key: 'chief', label: 'Chief tasks', icon: BrainCircuit, group: 'Workspace', description: 'Plan and run approved work' },
  { key: 'history', label: 'Chat history', icon: MessagesSquare, group: 'History', description: 'Saved conversations' },
  { key: 'tasks', label: 'Tasks & history', icon: ListTodo, group: 'History', description: 'Task records and approvals' },
  { key: 'usage', label: 'Activity & usage', icon: Activity, group: 'History', description: 'Usage and recent activity' },
  { key: 'explore', label: 'Explore agents', icon: Bot, group: 'Agents & automation', description: 'Available specialists' },
  { key: 'agents', label: 'Agent team', icon: UsersRound, group: 'Agents & automation', description: 'Manage your specialists' },
  { key: 'schedules', label: 'Schedules', icon: CalendarClock, group: 'Agents & automation', description: 'Recurring work' },
  { key: 'browser', label: 'Browser', icon: Globe2, group: 'Agents & automation', description: 'Worker browser workspace' },
  { key: 'apps', label: 'Connected apps', icon: Blocks, group: 'Integrations', description: 'Authorize services' },
  { key: 'plans', label: 'Plans', icon: Sparkles, group: 'Account', description: 'Workspace configuration' },
  { key: 'settings', label: 'Settings', icon: Settings2, group: 'Account', description: 'Profile and preferences' },
  { key: 'setup', label: 'Setup status', icon: ShieldCheck, group: 'Account', description: 'System readiness' },
  { key: 'whatsapp-agent', label: 'WhatsApp Manager', icon: MessageCircle, group: 'Integrations', description: 'Your dedicated WhatsApp assistant' },
];

const navGroups: NavItem['group'][] = ['Workspace', 'History', 'Agents & automation', 'Integrations', 'Account'];

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' {
  if (status === 'completed') return 'success';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  if (status === 'waiting_approval' || status === 'paused') return 'warning';
  if (status === 'running' || status === 'planning') return 'info';
  return 'neutral';
}

function readableStatus(status: string) {
  return status.replaceAll('_', ' ');
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || '';
}

function sidebarAgentLabel(agent: Agent) {
  return agent.connector === 'whatsapp' ? 'WhatsApp Manager' : agent.name;
}

function greetingFor(timezone: string) {
  try {
    const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(new Date()));
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
  } catch {
    // The regular welcome fallback remains valid for an unknown timezone.
  }
  return 'Good evening';
}

async function request<T = unknown>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

function formatDate(value: string, timezone = 'Asia/Karachi') {
  try {
    return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleTimeString();
  }
}

export default function Dashboard({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const query = useSearchParams();
  const [tab, setTab] = useState<Tab>('chat');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connector[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [team, setTeam] = useState<{ builtIn: Agent[]; custom: Agent[]; messages: { id: string; agent: string; content: string; createdAt: string }[] }>({ builtIn: [], custom: [], messages: [] });
  const [status, setStatus] = useState<SystemStatus>(null);
  const [browser, setBrowser] = useState<BrowserSnapshot>(null);
  const [stamp, setStamp] = useState(0);
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [dashboardDialog, setDashboardDialog] = useState<DashboardDialog>(null);
  const [agentSearch, setAgentSearch] = useState('');
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [whatsappAgent, setWhatsAppAgent] = useState<Agent | null>(null);
  const [whatsappState, setWhatsAppState] = useState('checking');
  const [greeting, setGreeting] = useState('Welcome');
  const orb = useOrbState();

  const navigateTab = useCallback((next: Tab) => {
    setTab(next);
    setWorkspaceMenuOpen(false);
    setAccountOpen(false);
    router.push(`/dashboard?tab=${encodeURIComponent(next)}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        navigateTab('search');
      }
      if (event.key === 'Escape') {
        setWorkspaceMenuOpen(false);
        setAccountOpen(false);
        setMenuOpen(false);
        setDashboardDialog(null);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [navigateTab]);

  useEffect(() => {
    const current = query.get('tab') as Tab | null;
    setTab(navigation.some(item => item.key === current) ? current! : 'chat');
    setMenuOpen(false);
  }, [query]);

  useEffect(() => {
    const storedCollapsed = localStorage.getItem('agenth-sidebar-collapsed') === 'true';
    setCollapsed(storedCollapsed);
    setDark(localStorage.getItem('agenth-theme') === 'dark');
    try {
      setCollapsedGroups(JSON.parse(localStorage.getItem('agenth-sidebar-groups') || '{}') as Record<string, boolean>);
    } catch {
      setCollapsedGroups({});
    }
    const listener = (event: Event) => setDark((event as CustomEvent).detail !== 'light');
    window.addEventListener('agenth:theme', listener);
    return () => window.removeEventListener('agenth:theme', listener);
  }, []);

  useEffect(() => {
    setGreeting(greetingFor(profile?.timezone || 'Asia/Karachi'));
  }, [profile?.timezone]);

  useEffect(() => {
    const loadWhatsAppAgent = () => fetch('/api/whatsapp/linked')
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data) { setWhatsAppAgent(data.agent || null); setWhatsAppState(data.state || 'unknown'); } })
      .catch(() => {});
    void loadWhatsAppAgent();
    const timer = window.setInterval(loadWhatsAppAgent, 12_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const activeTask = tasks.find(task => ['running', 'planning'].includes(task.status));
    const waiting = tasks.some(task => task.status === 'waiting_approval');
    orb.setActivity(
      'tasks',
      activeTask ? (activeTask.status === 'planning' ? 'thinking' : 'working') : waiting ? 'paused' : null,
      activeTask ? `${activeTask.status}: ${activeTask.instruction.slice(0, 65)}` : waiting ? 'Waiting for your approval' : undefined,
    );
    return () => orb.setActivity('tasks', null);
  }, [orb, tasks]);

  const refresh = useCallback(async () => {
    try {
      const [nextProfile, nextTasks, nextConnections] = await Promise.all([
        request<Profile>('/api/profile'),
        request<Task[]>('/api/tasks'),
        request<Connector[]>('/api/connectors').catch(() => []),
      ]);
      setProfile(nextProfile);
      setTasks(nextTasks);
      setConnections(nextConnections);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load workspace.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('error')) setError(url.searchParams.get('error') || 'A request failed.');
    setDark(localStorage.getItem('agenth-theme') === 'dark');
    void refresh();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('agenth-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    let connected = false;
    const events = new EventSource('/api/events');
    events.onopen = () => { connected = true; };
    events.onerror = () => { connected = false; };
    events.onmessage = event => {
      try { setTasks(JSON.parse(event.data) as Task[]); } catch { /* Ignore malformed event data. */ }
    };
    events.addEventListener('backend-error', () => setError('Database unavailable. Check Setup status.'));
    const poll = window.setInterval(() => {
      if (!connected) request<Task[]>('/api/tasks').then(setTasks).catch(() => {});
    }, 5_000);
    return () => {
      events.close();
      window.clearInterval(poll);
    };
  }, []);

  const loadTab = useCallback(async () => {
    try {
      if (tab === 'apps') setConnections(await request<Connector[]>('/api/connectors'));
      if (tab === 'schedules') setSchedules(await request<Schedule[]>('/api/schedules'));
      if (tab === 'agents' || tab === 'explore' || tab === 'search' || tab === 'home' || tab === 'chat') {
        setTeam(await request<{ builtIn: Agent[]; custom: Agent[]; messages: { id: string; agent: string; content: string; createdAt: string }[] }>('/api/agents'));
        setAgentsLoaded(true);
      }
      if (['setup', 'home', 'agents', 'explore'].includes(tab)) setStatus(await request<SystemStatus>('/api/status'));
      if (tab === 'browser') {
        setBrowser(await request<BrowserSnapshot>('/api/browser'));
        setStamp(Date.now());
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this page.');
    }
  }, [tab]);

  useEffect(() => {
    void loadTab();
    if (tab !== 'browser') return;
    const timer = window.setInterval(() => void loadTab(), 4_000);
    return () => window.clearInterval(timer);
  }, [loadTab, tab]);

  const run = useCallback(async (operation: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }, []);

  const saveProfile = useCallback(async (next: Profile) => {
    const result = await request<Profile>('/api/profile', 'PUT', next);
    setProfile(result);
  }, []);

  const sendTask = useCallback(async (text = instruction) => {
    if (!text.trim()) return;
    await run(async () => {
      const task = await request<Task>('/api/tasks', 'POST', { instruction: text });
      setInstruction('');
      setSelectedTask(task.id);
      await refresh();
    });
  }, [instruction, refresh, run]);

  const taskAction = useCallback(async (task: Task, action: string) => {
    await run(async () => {
      if (action === 'resume' && task.status === 'failed' && !confirm('The previous action may have reached an external service. Check its activity log before retrying. Resume?')) return;
      await request(`/api/tasks/${task.id}`, 'POST', { action });
      await refresh();
    });
  }, [refresh, run]);

  const activeTasks = useMemo(() => tasks.filter(task => ['queued', 'planning', 'running', 'waiting_approval'].includes(task.status)), [tasks]);
  const isWorking = activeTasks.some(task => ['running', 'planning'].includes(task.status));
  const needsApproval = activeTasks.some(task => task.status === 'waiting_approval');
  const isQueued = activeTasks.some(task => task.status === 'queued');
  const workspaceStatus = isWorking ? 'working' : needsApproval ? 'approval needed' : isQueued ? 'queued' : 'idle';
  const workspaceStatusTone: 'info' | 'warning' | 'neutral' = isWorking || isQueued ? 'info' : needsApproval ? 'warning' : 'neutral';
  const waitingTasks = useMemo(() => tasks.filter(task => task.status === 'waiting_approval'), [tasks]);
  const failedTasks = useMemo(() => tasks.filter(task => task.status === 'failed'), [tasks]);
  const recentEvents = useMemo(() => tasks
    .flatMap(task => task.events.map(event => ({ ...event, taskId: task.id, taskInstruction: task.instruction, taskStatus: task.status })))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 12), [tasks]);
  const lang = profile?.language || 'en';
  const currentName = String(profile?.answers.name || name);
  const userFirstName = firstName(currentName);
  const currentNavigation = navigation.find(item => item.key === tab) || navigation[2];
  const showOnboarding = profile && !profile.onboarded && !['setup', 'settings'].includes(tab);
  const isChatWorkspace = tab === 'chat';
  const visibleNavigation = navigation.filter(item => item.key !== 'whatsapp-agent' || whatsappAgent);
  const sidebarAgents = useMemo(() => {
    const whatsapp = team.custom.find(agent => agent.connector === 'whatsapp')
      || team.custom.find(agent => ['whatsapp manager', 'whatsapp agent'].includes(agent.name.toLowerCase()));
    const custom = team.custom.filter(agent => agent !== whatsapp && !['whatsapp manager', 'whatsapp agent'].includes(agent.name.toLowerCase()));
    const builtIn = team.builtIn;
    return [...builtIn, ...(whatsapp ? [whatsapp] : []), ...custom];
  }, [team]);
  const selectedChatAgent = [...team.builtIn, ...team.custom].find(agent => agent.id === (query.get('agent') || 'builtin-chief'));
  const selectedChatName = selectedChatAgent?.name || 'Chief';
  const filteredSidebarAgents = useMemo(() => {
    const needle = agentSearch.trim().toLowerCase();
    return needle
      ? sidebarAgents.filter(agent => `${sidebarAgentLabel(agent)} ${agent.description || ''} ${agent.role}`.toLowerCase().includes(needle))
      : sidebarAgents;
  }, [agentSearch, sidebarAgents]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    void request<{ theme: 'dark' | 'light' }>('/api/settings')
      .then(settings => request('/api/settings', 'PUT', { ...settings, theme: next ? 'dark' : 'light' }))
      .catch(caught => setError(caught instanceof Error ? caught.message : 'Could not save the theme preference.'));
  }

  function toggleSidebar() {
    setCollapsed(value => {
      const next = !value;
      localStorage.setItem('agenth-sidebar-collapsed', String(next));
      return next;
    });
  }

  function toggleNavigationGroup(group: NavItem['group']) {
    setCollapsedGroups(previous => {
      const next = { ...previous, [group]: !previous[group] };
      localStorage.setItem('agenth-sidebar-groups', JSON.stringify(next));
      return next;
    });
  }

  function openSidebarAgent(agent: Agent) {
    if (agent.connector === 'whatsapp' || agent.name.toLowerCase().includes('whatsapp')) {
      navigateTab('whatsapp-agent');
    } else {
      setTab('chat');
      router.push(`/dashboard?tab=chat&agent=${encodeURIComponent(agent.id || 'builtin-chief')}`, { scroll: false });
    }
  }

  function removeSidebarAgent(agent: Agent) {
    if (!agent.id || agent.builtin || agent.connector || !confirm(`Remove ${agent.name}?`)) return;
    void run(async () => {
      await request('/api/agents', 'DELETE', { id: agent.id });
      await loadTab();
    });
  }

  async function shareWorkspace() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'AgentH', url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setNotice('Dashboard link copied.');
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : 'Could not share this page.');
    }
  }

  function agentReadiness(agent: Agent) {
    if (tasks.some(task => task.status === 'running' && task.events.some(event => event.agent === agent.name))) return { label: 'Working', tone: 'info' as const };
    if (agent.connector === 'whatsapp') return { label: whatsappState === 'connected' ? 'Connected' : 'Reconnect required', tone: whatsappState === 'connected' ? 'success' as const : 'warning' as const };
    if (agent.permissions.some(permission => permission.startsWith('gmail.')) && !connections.some(connection => connection.provider === 'gmail' && connection.connection)) return { label: 'Connect Gmail', tone: 'warning' as const };
    if (!status) return { label: 'Not checked', tone: 'neutral' as const };
    if (!status.worker) return { label: 'Worker offline', tone: 'warning' as const };
    if (!status.ai) return { label: 'AI setup needed', tone: 'warning' as const };
    return { label: 'Configured', tone: 'accent' as const };
  }

  function taskCard(task: Task) {
    return (
      <article className="premium-task-card" key={task.id}>
        <div className="task-card-topline">
          <AgentAvatar name={task.status === 'planning' ? 'Chief' : 'Reporter'} size="sm" active={['running', 'planning'].includes(task.status)} />
          <div className="task-card-title">
            <strong>{task.instruction}</strong>
            <small>{formatDate(task.createdAt, profile?.timezone || 'Asia/Karachi')}</small>
          </div>
          <StatusPill tone={statusTone(task.status)}>{readableStatus(task.status)}</StatusPill>
        </div>
        {(task.result || task.error) && <div className={task.error ? 'task-card-result is-error' : 'task-card-result'}>{task.error || task.result}</div>}
        {task.status === 'waiting_approval' && (
          <section className="task-approval">
            <div><CircleAlert aria-hidden="true" /><strong>Approval required</strong></div>
            <p>Review the exact external action before it is allowed to continue.</p>
            {task.approval?.step !== undefined && <details><summary>View proposed action</summary><pre>{JSON.stringify(task.approval.step, null, 2)}</pre></details>}
            <div className="button-row">
              <button className="primary-button" disabled={busy} onClick={() => void taskAction(task, 'approve')}><CheckCircle2 aria-hidden="true" /> Approve</button>
              <button className="secondary-button" disabled={busy} onClick={() => void taskAction(task, 'reject')}>Reject</button>
            </div>
          </section>
        )}
        <footer className="task-card-footer">
          <span>{task.model || 'No model call'}{task.tokens != null ? ` · ${task.tokens} tokens` : ''}{task.durationMs != null ? ` · ${(task.durationMs / 1000).toFixed(1)}s` : ''}</span>
          <div className="button-row">
            {['queued', 'planning', 'running'].includes(task.status) && <button className="quiet-button" disabled={busy} onClick={() => void taskAction(task, 'pause')}><CirclePause aria-hidden="true" /> Pause</button>}
            {['paused', 'failed'].includes(task.status) && <button className="quiet-button" disabled={busy} onClick={() => void taskAction(task, 'resume')}><CirclePlay aria-hidden="true" /> Resume</button>}
            {!['cancelled', 'completed', 'failed'].includes(task.status) && <button className="quiet-button" disabled={busy} onClick={() => void taskAction(task, 'cancel')}>Cancel</button>}
            <button className="quiet-button" onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}>{selectedTask === task.id ? 'Hide activity' : `Activity · ${task.events.length}`}</button>
          </div>
        </footer>
        {selectedTask === task.id && (
          <ol className="task-event-list">
            {task.events.length ? task.events.map(event => <li key={event.id}><time>{formatTime(event.createdAt)}</time><span>{event.agent}</span><p>{event.message}</p></li>) : <li><p>No activity events are available yet.</p></li>}
          </ol>
        )}
      </article>
    );
  }

  function chiefComposer() {
    return (
      <form className="premium-task-composer" onSubmit={event => { event.preventDefault(); void sendTask(); }}>
        <div className="task-composer-heading"><span><Sparkles aria-hidden="true" /> Chief task</span><small>External actions pause for your approval.</small></div>
        <textarea
          aria-label="Task for Chief"
          placeholder={lang === 'roman-ur' ? 'Chief ko kya karna hai?' : lang === 'ur' ? 'چیف کو کیا کرنا ہے؟' : 'What would you like Chief to do?'}
          value={instruction}
          onChange={event => setInstruction(event.target.value)}
          maxLength={12_000}
          rows={2}
        />
        <div className="task-composer-actions">
          <Voice language={lang} onText={setInstruction} composer disabled={busy} />
          <button className="primary-button" disabled={busy || !instruction.trim()}><SendHorizontal aria-hidden="true" /> Send to Chief</button>
        </div>
      </form>
    );
  }

  function pageContent(): ReactNode {
    if (loading) return <div className="premium-loading"><p>Loading your workspace…</p></div>;
    if (showOnboarding) return <Onboarding profile={profile} onSave={saveProfile} />;

    if (tab === 'home') {
      const connected = connections.filter(connection => connection.connection && !connection.provider.startsWith('whatsapp'));
      if (whatsappState === 'connected') connected.push({ provider: 'whatsapp-linked', name: 'WhatsApp', auth: 'Linked device', actions: [], scopes: [], connection: {} });
      return (
        <div className="home-command-center">
          <section className="home-hero">
            <div>
              <span className="section-kicker">YOUR AI WORKSPACE</span>
              <h2>{userFirstName ? `${greeting}, ${userFirstName}.` : 'Welcome to AgentH.'}</h2>
              <p>A little clarity. A powerful team. Bring your next idea to life with AgentH.</p>
              <div className="button-row"><button className="primary-button" onClick={() => navigateTab('chief')}><Plus aria-hidden="true" /> Start new task</button><button className="secondary-button" onClick={() => navigateTab('chat')}><MessageCircle aria-hidden="true" /> Chat with Chief</button></div>
            </div>
            <div className="home-system-status" aria-label="System checks">
              <span className="section-kicker">System pulse</span>
              <div><Cpu /><span>AI provider<small>{status ? String(status.model || status.provider || 'Unknown') : 'Checking configuration…'}</small></span><StatusPill tone={!status ? 'neutral' : status.ai ? 'accent' : 'warning'}>{!status ? 'Not checked' : status.ai ? 'Configured' : 'Unavailable'}</StatusPill></div>
              <div><Activity /><span>Background worker<small>Recent heartbeat</small></span><StatusPill tone={!status ? 'neutral' : status.worker ? 'success' : 'warning'}>{!status ? 'Not checked' : status.worker ? 'Reachable' : 'Offline'}</StatusPill></div>
              <div><Blocks /><span>Connected apps<small>Saved authorizations</small></span><strong>{connected.length}</strong></div>
              <button className="quiet-button" onClick={() => navigateTab('setup')}>View system checks <ChevronRight /></button>
            </div>
          </section>
          <section className="quick-actions" aria-label="Quick actions">
            {[
              ['Research', 'Plan a research task', Search, 'chief'],
              ['Browse', 'Your browser workspace', Globe2, 'browser'],
              ['Automate', 'Give Chief a goal', BrainCircuit, 'chief'],
              ['Connect app', 'Manage integrations', Blocks, 'apps'],
              ['Agents', 'Explore specialists', Bot, 'explore'],
              ['Schedules', 'Manage automation', CalendarClock, 'schedules'],
            ].map(([label, description, Icon, target]) => {
              const ActionIcon = Icon as LucideIcon;
              return <button className="quick-action" key={label as string} onClick={() => navigateTab(target as Tab)}><ActionIcon aria-hidden="true" /><span><strong>{label as string}</strong><small>{description as string}</small></span><ChevronRight aria-hidden="true" /></button>;
            })}
          </section>
          <section className="metric-grid" aria-label="Task overview">
            <MetricCard label="Active" value={activeTasks.filter(task => ['queued', 'planning', 'running'].includes(task.status)).length} icon={LoaderCircle} tone="info" onClick={() => navigateTab('tasks')} />
            <MetricCard label="Needs approval" value={waitingTasks.length} icon={CircleAlert} tone="warning" onClick={() => navigateTab('tasks')} />
            <MetricCard label="Completed" value={tasks.filter(task => task.status === 'completed').length} icon={CheckCircle2} tone="success" onClick={() => navigateTab('tasks')} />
            <MetricCard label="Connected apps" value={connected.length} icon={Blocks} tone="accent" onClick={() => navigateTab('apps')} />
          </section>
          <div className="home-content-grid">
            <section className="premium-surface recent-activity">
              <div className="surface-heading"><div><span className="section-kicker">Actual activity</span><h3>Recent work</h3></div><button className="quiet-button" onClick={() => navigateTab('usage')}>View all</button></div>
              {recentEvents.length ? <ol className="activity-feed">{recentEvents.slice(0, 6).map(event => <li key={event.id}><span className={`activity-dot activity-dot--${statusTone(event.taskStatus)}`} /><div><strong>{event.message}</strong><small>{event.agent} · {formatTime(event.createdAt)}</small></div></li>)}</ol> : <EmptyState icon={Activity} title="No recent activity" description="Your real task and tool activity will appear here." />}
            </section>
            <section className="premium-surface connection-preview">
              <div className="surface-heading"><div><span className="section-kicker">Integrations</span><h3>Connected apps</h3></div><button className="quiet-button" onClick={() => navigateTab('apps')}>Manage</button></div>
              {connected.length ? <div className="connected-app-preview">{connected.slice(0, 6).map(connection => <span key={connection.provider} title={`${connection.name}: authorized`}><ToolIcon provider={connection.provider} /><strong>{connection.name}</strong><i aria-label="Authorized" /></span>)}</div> : <EmptyState icon={Blocks} title="No apps connected" description="Connect only the services you want AgentH to use." action={<button className="secondary-button" onClick={() => navigateTab('apps')}>Manage apps</button>} />}
            </section>
          </div>
          <section className="home-agent-section"><div className="surface-heading"><div><span className="section-kicker">Your specialists</span><h3>A team built around your work</h3></div><button className="quiet-button" onClick={() => navigateTab('agents')}>Manage team <ChevronRight /></button></div><div className="home-agent-grid">{[...team.builtIn, ...team.custom].slice(0, 5).map(agent => { const readiness = agentReadiness(agent); return <button className="home-agent-tile" key={agent.id || agent.name} onClick={() => openSidebarAgent(agent)}><AgentAvatar name={agent.name} size="lg" /><strong>{agent.name}</strong><span>{agent.role}</span><StatusPill tone={readiness.tone}>{readiness.label}</StatusPill></button>; })}</div></section>
          <section className="custom-agent-cta"><span className="custom-agent-cta-icon"><Bot /></span><div><span className="section-kicker">Make it yours</span><h3>Create your own specialist</h3><p>Define a role and use AgentH’s existing approved tools.</p></div><button className="secondary-button" onClick={() => navigateTab('agents')}><Plus /> Create agent</button></section>
        </div>
      );
    }

    if (tab === 'chat') return <ChatPanel key={query.get('agent') || 'builtin-chief'} agentId={query.get('agent') || 'builtin-chief'} agentName={selectedChatName} language={lang} name={currentName} />;
    if (tab === 'history') return <ChatPanel key={`history-${query.get('agent') || 'builtin-chief'}`} agentId={query.get('agent') || 'builtin-chief'} agentName={selectedChatName} language={lang} name={currentName} mode="history" />;
    if (tab === 'search') return <SearchWorkspace tasks={tasks} agents={[...team.builtIn, ...team.custom]} onNavigate={navigateTab} />;

    if (tab === 'chief') {
      return (
        <div className="chief-workspace">
          <section className="chief-header-card">
            <div><span className="section-kicker">PRIMARY COORDINATOR</span><h2>Chief Tasks</h2><p>Turn a goal into an approved, traceable workflow.</p></div>
            <StatusPill tone={activeTasks.length ? 'info' : 'neutral'}>{activeTasks.length ? `${activeTasks.length} active` : 'No active task'}</StatusPill>
          </section>
          <section className="metric-grid chief-metrics">
            <MetricCard label="Active" value={activeTasks.filter(task => ['queued', 'planning', 'running'].includes(task.status)).length} icon={LoaderCircle} tone="info" />
            <MetricCard label="Waiting" value={waitingTasks.length} icon={CircleAlert} tone="warning" />
            <MetricCard label="Completed" value={tasks.filter(task => task.status === 'completed').length} icon={CheckCircle2} tone="success" />
            <MetricCard label="Failed" value={failedTasks.length} icon={CircleAlert} tone="danger" />
          </section>
          {chiefComposer()}
          <section className="page-section"><div className="surface-heading"><div><span className="section-kicker">Execution</span><h3>Recent work</h3></div><button className="quiet-button" onClick={() => navigateTab('tasks')}>All tasks</button></div>{tasks.length ? <div className="task-stack">{tasks.slice(0, 5).map(taskCard)}</div> : <EmptyState icon={BrainCircuit} title="Give Chief a first task" description="You will review any external action before it happens." />}</section>
        </div>
      );
    }

    if (tab === 'tasks') return <div className="reference-todos">
      <section className="reference-todocol">
        <h3>Agent&apos;s To-Do</h3>
        <p>Scheduled work and tasks you have handed to an agent. External actions remain subject to approval.</p>
        {chiefComposer()}
        {tasks.length ? <div className="task-stack">{tasks.map(taskCard)}</div> : <div className="reference-empty">Nothing here yet.</div>}
      </section>
      <section className="reference-todocol">
        <h3>Your To-Do</h3>
        <p>Personal reminders are separate from agent tasks.</p>
        <div className="reference-empty">Personal reminders are not stored by the current workspace backend.</div>
      </section>
    </div>;

    if (tab === 'browser') return <BrowserStudio />;

    if (tab === 'whatsapp-agent') return <WhatsAppAgentPanel language={lang} />;

    if (tab === 'apps') {
      return (
        <section className="apps-workspace">
          <div className="apps-intro"><div><span className="section-kicker">Integrations</span><h2>Connected apps</h2><p>Authorizations are stored on the server. AgentH only exposes actions supported by the connected service.</p></div></div>
          <div className="connector-grid">
            {connections.filter(connection => connection.provider !== 'whatsapp-business' && connection.provider !== 'whatsapp-linked').map(connection => <ConnectorCard key={connection.provider} connector={connection} busy={busy} onConnect={() => void run(async () => { const result = await request<{ url: string }>('/api/connectors/google', 'POST', { provider: connection.provider }); window.location.href = result.url; })} onDisconnect={() => { if (confirm(`Disconnect ${connection.name} and delete its local credentials?`)) void run(async () => { const result = await request<{ note?: string }>('/api/connectors', 'DELETE', { provider: connection.provider }); setNotice(result.note || `${connection.name} disconnected.`); await loadTab(); }); }} />)}
            <WhatsAppLinkedConnect onConnected={() => void loadTab()} />
          </div>
        </section>
      );
    }

    if (tab === 'agents' || tab === 'explore') {
      const allAgents = [...team.builtIn, ...team.custom];
      return (
        <section className="agents-workspace">
          <div className="surface-heading"><div><span className="section-kicker">Agent team</span><h2>{tab === 'explore' ? 'Explore specialists' : 'Your specialists'}</h2><p>Each agent reflects an actual registered capability.</p></div>{tab === 'agents' && <AgentBuilder onCreated={loadTab}/>}</div>
          <div className="agent-grid">{allAgents.map(agent => {
            const working = tasks.some(task => task.status === 'running' && task.events.some(event => event.agent === agent.name && event.kind === 'tool_started'));
            const readiness = agentReadiness(agent);
            return <article className="agent-card" key={agent.id || agent.name}><div className="agent-card-top"><AgentAvatar name={agent.name} size="lg" active={working} color={agent.avatarColor} shape={agent.avatarShape} /><StatusPill tone={readiness.tone}>{readiness.label}</StatusPill></div><h3>{agent.name}</h3><p>{agent.description || agent.role}</p><div className="permission-list">{agent.permissions.slice(0, 4).map(permission => <span key={permission}>{permission}</span>)}{agent.permissions.length > 4 && <span>+{agent.permissions.length - 4}</span>}</div><button className="secondary-button" onClick={() => openSidebarAgent(agent)}>{agent.connector === 'whatsapp' ? 'Open WhatsApp Manager' : 'Chat'}</button>{agent.id && !agent.builtin && !agent.connector && <><AgentEditor agent={{id:agent.id,name:agent.name,role:agent.role,description:agent.description,systemInstructions:agent.systemInstructions,permissions:agent.permissions,avatarColor:agent.avatarColor,avatarShape:agent.avatarShape,memoryEnabled:agent.memoryEnabled,approvalRequired:agent.approvalRequired,status:agent.status,template:agent.template}} onSaved={loadTab}/><button className="quiet-button danger-text" onClick={() => void run(async () => { await request('/api/agents', 'DELETE', { id: agent.id }); await loadTab(); })}>Remove</button></>}</article>;
          })}</div>
          {tab === 'agents' && team.messages.length > 0 && <section className="agent-messages"><div className="surface-heading"><h3>Recent team messages</h3></div>{team.messages.slice(0, 12).map(message => <article key={message.id}><AgentAvatar name={message.agent} size="sm" /><div><strong>{message.agent}</strong><p>{message.content}</p><small>{formatDate(message.createdAt)}</small></div></article>)}</section>}
        </section>
      );
    }

    if (tab === 'schedules') {
      return <section className="schedule-workspace"><div className="surface-heading"><div><span className="section-kicker">Automation</span><h2>Schedules</h2><p>Schedules persist on this workspace; external effects still require approval.</p></div></div><form className="schedule-form" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(async () => { await request('/api/schedules', 'POST', { instruction: data.get('instruction'), at: new Date(String(data.get('at'))).toISOString(), cron: data.get('cron') || undefined, timezone: profile?.timezone || 'Asia/Karachi' }); form.reset(); await loadTab(); setNotice('Schedule saved.'); }); }}><label>Instruction<textarea name="instruction" required rows={3} placeholder="What should AgentH do?" /></label><div><label>First run<input type="datetime-local" name="at" required /></label><label>Repeat (optional)<input name="cron" placeholder="0 9 * * 1-5" /></label></div><button className="primary-button" disabled={busy}><CalendarClock aria-hidden="true" /> Save schedule</button></form><div className="schedule-list">{schedules.length ? schedules.map(schedule => <article key={schedule.id}><div><CalendarClock aria-hidden="true" /><span><strong>{schedule.instruction}</strong><small>{formatDate(schedule.nextRun, schedule.timezone)} · {schedule.timezone} · {schedule.cron || 'One time'}</small></span></div><div className="button-row"><StatusPill tone={schedule.paused ? 'warning' : 'success'}>{schedule.paused ? 'Paused' : 'Active'}</StatusPill><IconButton label={schedule.paused ? 'Resume schedule' : 'Pause schedule'} onClick={() => void run(async () => { await request('/api/schedules', 'PATCH', { id: schedule.id, paused: !schedule.paused }); await loadTab(); })}>{schedule.paused ? <CirclePlay /> : <CirclePause />}</IconButton><IconButton label="Delete schedule" onClick={() => { if (confirm('Delete this schedule?')) void run(async () => { await request('/api/schedules', 'DELETE', { id: schedule.id }); await loadTab(); }); }}><X /></IconButton></div></article>) : <EmptyState icon={CalendarClock} title="No schedules yet" description="Create a real schedule when you want work to recur." />}</div></section>;
    }

    if (tab === 'usage') return <section className="usage-workspace"><div className="surface-heading"><div><span className="section-kicker">Activity & usage</span><h2>Workspace usage</h2></div></div><UsageSummary /><section className="metric-grid"><MetricCard label="Reported task tokens" value={tasks.reduce((total, task) => total + (task.tokens || 0), 0)} icon={Activity} tone="accent" /><MetricCard label="Loaded tasks" value={tasks.length} icon={ListTodo} tone="info" /><MetricCard label="Tool calls" value={tasks.reduce((total, task) => total + task.events.filter(event => event.kind === 'tool_started').length, 0)} icon={Sparkles} tone="success" /></section><section className="premium-surface"><div className="surface-heading"><h3>Recent events</h3></div>{recentEvents.length ? <ol className="activity-feed">{recentEvents.map(event => <li key={event.id}><span className={`activity-dot activity-dot--${statusTone(event.taskStatus)}`} /><div><strong>{event.message}</strong><small>{event.agent} · {formatDate(event.createdAt, profile?.timezone || 'Asia/Karachi')}</small></div></li>)}</ol> : <EmptyState icon={Activity} title="No recorded activity" />}</section></section>;

    if (tab === 'plans') return <section className="plans-workspace premium-surface"><BrandMark /><span className="section-kicker">AgentH workspace</span><h2>Your self-hosted workspace</h2><p>AgentH uses the AI provider configured by this installation. Third-party connected services retain their own permissions, quotas, and policies.</p><div className="button-row"><button className="primary-button" onClick={() => navigateTab('setup')}>Check setup</button><button className="secondary-button" onClick={() => navigateTab('settings')}>Open settings</button></div></section>;

    if (tab === 'settings') return <section className="settings-workspace"><div className="surface-heading"><div><span className="section-kicker">Preferences</span><h2>Settings</h2><p>Manage profile, AI configuration, voice, appearance, and privacy.</p></div></div><AISettings language={lang} /><ProfileEditor profile={profile} onSave={saveProfile} onError={setError} /><section className="privacy-panel"><div><span className="section-kicker">Privacy</span><h3>Data & account</h3><p>Connector credentials are encrypted. Browser sessions remain in worker memory until closed.</p></div><div className="button-row"><button className="secondary-button" onClick={() => { if (confirm('Delete saved onboarding answers?')) void run(async () => { await request('/api/profile', 'DELETE'); await refresh(); }); }}>Delete profile answers</button><button className="danger-button" onClick={() => { const confirmation = prompt('This permanently deletes your account, tasks, connectors, and local files. Type DELETE MY ACCOUNT.'); if (confirmation) void run(async () => { await request('/api/account', 'DELETE', { confirmation }); await signOut({ callbackUrl: '/' }); }); }}>Delete account</button></div></section></section>;

    if (tab === 'setup') return <SetupWorkspace status={status} onRefresh={() => void loadTab()} />;

    return null;
  }

  return (
    <div className={`premium-workspace ${styles.referenceShell} ${dark ? 'theme-dark' : 'theme-light'} ${collapsed ? 'sidebar-is-collapsed' : ''}`}>
      <button className="mobile-navigation-trigger" type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu /></button>
      {menuOpen && <button className="mobile-navigation-backdrop" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`premium-sidebar ${styles.referenceSidebar} ${menuOpen ? 'is-mobile-open' : ''}`}>
        <div className="ref-profile">
          <button className="ref-profile-details" type="button" aria-label="Open account menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(open => !open)}>
            <span className="ref-profile-initial">{name[0]?.toUpperCase() || 'A'}</span>
            <span><strong>{name}</strong><small>{email}</small></span>
          </button>
          <IconButton label="Settings" onClick={() => setDashboardDialog('settings')}><Settings2 /></IconButton>
          <IconButton label="Workspace navigation" aria-expanded={workspaceMenuOpen} onClick={() => setWorkspaceMenuOpen(open => !open)}><SlidersHorizontal /></IconButton>
          <IconButton label="Sign out" onClick={() => void signOut({ callbackUrl: '/' })}><LogOut /></IconButton>
          {accountOpen && <div className="account-panel"><strong>{name}</strong><small>{email}</small><button type="button" onClick={() => navigateTab('settings')}><Settings2 /> Account settings</button><button type="button" onClick={() => void signOut({ callbackUrl: '/' })}><LogOut /> Log out</button></div>}
          {workspaceMenuOpen && <div className="ref-workspace-menu" role="dialog" aria-label="Workspace navigation">
            <div className="ref-workspace-menu-head"><strong>Workspace</strong><IconButton label="Close workspace navigation" onClick={() => setWorkspaceMenuOpen(false)}><X /></IconButton></div>
            <nav aria-label="All workspace pages">
              {navGroups.map(group => {
                const items = visibleNavigation.filter(item => item.group === group);
                if (!items.length) return null;
                const groupIsCollapsed = Boolean(collapsedGroups[group]);
                return <section className={`nav-group ${groupIsCollapsed ? 'is-collapsed' : ''}`} key={group}>
                  <button className="nav-group-toggle" type="button" aria-expanded={!groupIsCollapsed} onClick={() => toggleNavigationGroup(group)}>
                    <span>{group}</span><ChevronDown aria-hidden="true" />
                  </button>
                  <div className="nav-group-items">{items.map(item => { const Icon = item.icon; const active = tab === item.key; return <button key={item.key} className={active ? 'is-active' : ''} type="button" aria-current={active ? 'page' : undefined} onClick={() => navigateTab(item.key)}><Icon aria-hidden="true" /><span>{item.label}</span>{item.key === 'tasks' && activeTasks.length > 0 && <b>{activeTasks.length}</b>}</button>; })}</div>
                </section>;
              })}
            </nav>
            <div className="ref-menu-preferences">
              <button type="button" onClick={toggleTheme}>{dark ? <Sun /> : <Moon />}<span>{dark ? 'Light mode' : 'Dark mode'}</span></button>
              <button type="button" onClick={toggleSidebar}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span></button>
              <label><Languages aria-hidden="true" /><span>Language</span><select aria-label="Workspace language" value={lang} disabled={!profile || !profile.onboarded} onChange={event => { if (profile) void run(() => saveProfile({ ...profile, language: event.target.value })); }}><option value="en">English</option><option value="ur">اردو</option><option value="roman-ur">Roman Urdu</option></select></label>
            </div>
          </div>}
        </div>
        <div className="ref-agent-search">
          <label><span>Search</span><input aria-label="Search" value={agentSearch} onChange={event => setAgentSearch(event.target.value)} placeholder="Search" /></label>
          <AgentBuilder onCreated={loadTab} />
        </div>
        <nav className="ref-agent-list" aria-label="Agents">
          {filteredSidebarAgents.map(agent => {
            const key = agent.id || agent.name;
            return <div className="ref-agent-row" key={key}>
              <button className="ref-agent-open" type="button" aria-label={`Open ${sidebarAgentLabel(agent)}`} onClick={() => openSidebarAgent(agent)}>
                <AgentAvatar name={sidebarAgentLabel(agent)} size="sm" color={agent.avatarColor} shape={agent.avatarShape} />
                <span><strong>{sidebarAgentLabel(agent)}</strong><small>{agent.description || agent.role}</small></span>
              </button>
              {agent.id && !agent.builtin && !agent.connector && <IconButton className="ref-agent-delete" label={`Delete ${agent.name}`} disabled={busy} onClick={() => removeSidebarAgent(agent)}><Trash2 /></IconButton>}
            </div>;
          })}
          {!filteredSidebarAgents.length && <p className="ref-agent-empty">{agentSearch ? 'No matching agents.' : agentsLoaded ? 'No agents yet.' : 'Loading agents…'}</p>}
        </nav>
        <section className="ref-connectors" aria-label="Connectors">
          <span>Connectors</span>
          <button type="button" onClick={() => navigateTab(whatsappAgent ? 'whatsapp-agent' : 'apps')}>
            <i className="ref-connector-icon ref-connector-icon--whatsapp"><MessageCircle aria-hidden="true" /></i>
            <span><strong>WhatsApp</strong><small>{whatsappState === 'checking' ? 'Checking…' : whatsappState === 'connected' ? 'Connected' : 'Not connected'}</small></span>
          </button>
          <button type="button" onClick={() => setDashboardDialog('market')}>
            <i className="ref-connector-icon"><Bot aria-hidden="true" /></i>
            <span><strong>Bot Marketplace</strong><small>Explore specialists</small></span>
          </button>
        </section>
        <div className="ref-bottom"><button className="ref-connect-apps" type="button" onClick={() => setDashboardDialog('apps')}><Blocks aria-hidden="true" /> Connect apps</button></div>
      </aside>
      <main className={`premium-main ${isChatWorkspace ? 'premium-main--chat' : ''}`} dir={lang === 'ur' ? 'rtl' : 'ltr'}>
        <header className="ref-header">
          <div className="ref-header-title">
            {tab === 'chat' ? <AgentAvatar name={selectedChatName} size="md" color={selectedChatAgent?.avatarColor || 'violet'} shape="round" /> : tab === 'whatsapp-agent' ? <AgentAvatar name="WhatsApp Manager" size="md" color="#f1f0eb" shape="soft" /> : <BrandMark size="sm" />}
            <strong>{tab === 'chat' ? selectedChatName : tab === 'whatsapp-agent' ? 'WhatsApp Manager' : currentNavigation.label}</strong>
            <StatusPill tone={workspaceStatusTone}>{workspaceStatus}</StatusPill>
          </div>
          <nav className="ref-mode-switch" aria-label="Dashboard view">
            <button type="button" className={tab === 'chat' ? 'is-active' : ''} aria-current={tab === 'chat' ? 'page' : undefined} onClick={() => navigateTab('chat')}>Chat</button>
            <button type="button" className={tab === 'tasks' || tab === 'chief' ? 'is-active' : ''} aria-current={tab === 'tasks' || tab === 'chief' ? 'page' : undefined} onClick={() => navigateTab('tasks')}>To-Do</button>
          </nav>
          <div className="ref-header-actions">
            <button className="ref-token-button" type="button" onClick={() => navigateTab('usage')}>Tokens</button>
            <IconButton label="Share this conversation" onClick={() => setDashboardDialog('share')}><Share2 /></IconButton>
          </div>
        </header>
        {error && <div className="premium-banner premium-banner--error" role="alert"><CircleAlert aria-hidden="true" /><span>{error}</span><button type="button" onClick={() => navigateTab('setup')}>Open setup</button><button type="button" aria-label="Dismiss error" onClick={() => setError('')}><X /></button></div>}
        {notice && <div className="premium-banner" role="status"><CheckCircle2 aria-hidden="true" /><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><X /></button></div>}
        <div className="premium-page-content">{pageContent()}</div>
      </main>
      {dashboardDialog && <DashboardModal kind={dashboardDialog} onClose={() => setDashboardDialog(null)}>
        {dashboardDialog === 'apps' && <ConnectAppsContent
          connectors={connections.filter(connection => connection.provider !== 'whatsapp-business' && connection.provider !== 'whatsapp-linked')}
          busy={busy}
          onConnect={provider => void run(async () => {
            const result = await request<{ url: string }>('/api/connectors/google', 'POST', { provider });
            window.location.href = result.url;
          })}
          onDisconnect={provider => void run(async () => {
            const result = await request<{ note?: string }>('/api/connectors', 'DELETE', { provider });
            setNotice(result.note || 'Connector disconnected.');
            setConnections(await request<Connector[]>('/api/connectors'));
          })}
          onWhatsAppConnected={() => void request<Connector[]>('/api/connectors').then(setConnections).catch(caught => setError(caught instanceof Error ? caught.message : 'Could not refresh connectors.'))}
        />}
        {dashboardDialog === 'market' && <div className="reference-submodal reference-submodal--market">
          <h2>Bot Marketplace</h2>
          <p className="reference-subtitle">Registered specialists in this workspace. Paid marketplace subscriptions are not configured here.</p>
          {[...team.custom, ...team.builtIn].map(agent => <article className="reference-market-card" key={agent.id || agent.name}>
            <AgentAvatar name={agent.name} size="lg" color={agent.avatarColor} shape={agent.avatarShape}/>
            <span><strong>{agent.name}</strong><small>{agent.description || agent.role}</small></span>
            <button type="button" className="secondary-button" onClick={() => { setDashboardDialog(null); navigateTab(agent.connector === 'whatsapp' ? 'whatsapp-agent' : agent.name.toLowerCase() === 'chief' ? 'chief' : 'agents'); }}>Open</button>
          </article>)}
        </div>}
        {dashboardDialog === 'settings' && <SettingsDialogContent language={lang} profile={profile} onSave={saveProfile} onError={setError}/>}
        {dashboardDialog === 'share' && <div className="reference-submodal reference-submodal--share">
          <h2>Share this conversation</h2>
          <p>Share a link to this AgentH workspace. Teammate invitations are not enabled in this deployment.</p>
          <button type="button" className="black" onClick={() => void shareWorkspace()}>Share or copy link</button>
        </div>}
      </DashboardModal>}
    </div>
  );
}

function DashboardModal({ kind, onClose, children }: { kind: DashboardDialog; onClose: () => void; children: ReactNode }) {
  const title = kind === 'apps' ? 'Connect Apps' : kind === 'market' ? 'Bot Marketplace' : kind === 'settings' ? 'Settings' : 'Share this conversation';
  return <div className={`reference-dialog-overlay reference-dialog-overlay--${kind}`} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`reference-dialog reference-dialog--${kind}`} role="dialog" aria-modal="true" aria-label={title}>
      <button className="reference-dialog-close" type="button" aria-label={`Close ${title}`} onClick={onClose}><X aria-hidden="true"/></button>
      {children}
    </section>
  </div>;
}

function SettingsDialogContent({ language, profile, onSave, onError }: { language: string; profile: Profile | null; onSave: (profile: Profile) => Promise<void>; onError: (message: string) => void }) {
  const [section, setSection] = useState('General');
  const availableSections = new Set(['General', 'Your information', 'Usage & Billing']);
  const sections = ['General', 'Your information', 'Computer', 'Email', 'Vault', 'Usage & Billing', 'Updates'];
  return <div className="reference-submodal reference-submodal--settings">
    <nav className="reference-settings-nav" aria-label="Settings sections">{sections.map(item => <button type="button" className={section === item ? 'is-selected' : ''} disabled={!availableSections.has(item)} key={item} onClick={() => setSection(item)}>{item}</button>)}</nav>
    <div className="reference-settings-body">
      <h2>{section}</h2>
      {section === 'General' && <AISettings language={language}/>}
      {section === 'Your information' && <ProfileEditor profile={profile} onSave={onSave} onError={onError}/>}
      {section === 'Usage & Billing' && <UsageSummary/>}
    </div>
  </div>;
}

function ConnectAppsContent({ connectors, busy, onConnect, onDisconnect, onWhatsAppConnected }: {
  connectors: Connector[];
  busy: boolean;
  onConnect: (provider: string) => void;
  onDisconnect: (provider: string) => void;
  onWhatsAppConnected: () => void;
}) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const categories = ['All', 'Messaging', 'Email', 'Social', 'Freelance', 'MCP'];
  const categoryOf = (connector: Connector) => {
    const provider = `${connector.provider} ${connector.name}`.toLowerCase();
    if (provider.includes('whatsapp')) return 'Messaging';
    if (provider.includes('gmail') || provider.includes('google') || provider.includes('email') || provider.includes('calendar')) return 'Email';
    if (provider.includes('facebook') || provider.includes('linkedin') || provider.includes('social')) return 'Social';
    if (provider.includes('fiverr') || provider.includes('upwork') || provider.includes('freelance')) return 'Freelance';
    return 'MCP';
  };
  const visible = connectors.filter(connector =>
    (filter === 'All' || categoryOf(connector) === filter)
    && `${connector.name} ${connector.provider}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const connectedCount = connectors.filter(connector => connector.connection).length;
  return <div className="reference-submodal reference-submodal--apps">
    <h2>Connect Apps</h2>
    <p className="reference-subtitle">Link an account once — agents act only through authorized services.</p>
    <p className="reference-connected-count">{connectedCount} connected</p>
    <input className="reference-connector-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search connectors…" aria-label="Search connectors"/>
    <nav className="reference-filter-row" aria-label="Connector categories">{categories.map(category => <button type="button" key={category} className={filter === category ? 'is-selected' : ''} onClick={() => setFilter(category)}>{category}</button>)}</nav>
    <div className="reference-connect-grid">{visible.map(connector => <ConnectorCard key={connector.provider} connector={connector} busy={busy} onConnect={() => onConnect(connector.provider)} onDisconnect={() => onDisconnect(connector.provider)}/>)}</div>
    <section className="reference-whatsapp-link"><WhatsAppLinkedConnect onConnected={onWhatsAppConnected}/></section>
  </div>;
}

function MetricCard({ label, value, icon: Icon, tone, onClick }: { label: string; value: number; icon: LucideIcon; tone: 'info' | 'warning' | 'success' | 'danger' | 'accent'; onClick?: () => void }) {
  const content = <><span className={`metric-icon metric-icon--${tone}`}><Icon aria-hidden="true" /></span><span><small>{label}</small><strong>{value}</strong></span></>;
  return onClick ? <button className="metric-card" type="button" onClick={onClick}>{content}</button> : <article className="metric-card">{content}</article>;
}

function ConnectorCard({ connector, busy, onConnect, onDisconnect }: { connector: Connector; busy: boolean; onConnect: () => void; onDisconnect: () => void }) {
  const authorized = Boolean(connector.connection);
  return <article className="connector-card"><div className="connector-card-top"><span className="connector-icon"><ToolIcon provider={connector.provider} size={27} /></span><StatusPill tone={authorized ? 'accent' : 'neutral'}>{authorized ? 'Authorization saved' : 'Not connected'}</StatusPill></div><h3>{connector.name}</h3><p>{connector.auth}{authorized ? ' · Access is checked when used.' : ''}</p><div className="connector-actions-list">{connector.actions.slice(0, 4).map(action => <span key={action}>{action}</span>)}</div><details><summary>Permissions · {connector.scopes.length}</summary><ul>{connector.scopes.map(scope => <li key={scope}>{scope}</li>)}</ul></details>{connector.auth === 'Google OAuth' && <button className="primary-button" disabled={busy} onClick={onConnect}>{authorized ? 'Reconnect' : 'Connect'} {connector.name}</button>}{authorized ? <button className="quiet-button" disabled={busy} onClick={onDisconnect}>Disconnect</button> : connector.auth !== 'Google OAuth' && <small>Connection setup is unavailable here.</small>}</article>;
}

function BrowserWorkspace({ browser, stamp, busy, tasks, onAction }: { browser: BrowserSnapshot; stamp: number; busy: boolean; tasks: Task[]; onAction: (action: string, args?: Record<string, unknown>) => Promise<void> }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  useEffect(() => setImageError(false), [stamp]);
  const latest = tasks[0];
  const pending = latest && ['queued', 'planning', 'running', 'waiting_approval'].includes(latest.status);
  const blank = !browser?.url || browser.url === 'about:blank';
  return <section className="browser-workspace">
    <div className="browser-url-bar"><Globe2 aria-hidden="true" /><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void onAction('navigate', { url: form.get('url') }); }}><input name="url" type="url" required defaultValue={browser?.url === 'about:blank' ? '' : browser?.url || ''} placeholder="Enter a public website URL" aria-label="Website URL" /><button className="primary-button" disabled={busy}><SendHorizontal aria-hidden="true" /> Open</button></form><StatusPill tone={pending ? 'warning' : 'neutral'}>{pending ? readableStatus(latest.status) : browser?.updatedAt ? 'Saved capture' : 'No capture'}</StatusPill></div>
    {latest && <div className={`browser-action-state ${latest.status === 'failed' ? 'is-error' : ''}`} role="status"><Activity /><span><strong>{latest.instruction} · {readableStatus(latest.status)}</strong><small>{latest.error || (pending ? 'Waiting for worker execution or approval. A queued request does not confirm navigation.' : 'Task finished. The preview below shows the last captured page.')}</small></span></div>}
    <section className="browser-preview"><div className="browser-preview-head"><span>{browser?.url || 'Browser preview'}</span><small>{browser?.updatedAt ? `Captured ${formatDate(browser.updatedAt)}` : 'No screenshot captured yet.'}</small></div>{browser && !blank && !imageError ? <img src={`/api/browser?image=1&t=${stamp}`} alt="Last actual screenshot captured by the browser worker" onError={() => setImageError(true)} /> : <EmptyState icon={Globe2} title={pending ? 'Waiting for the browser worker' : imageError ? 'Screenshot unavailable' : browser ? 'Browser has not navigated yet' : 'Open a website'} description="The preview updates when the worker successfully captures a page." />}</section>
    <div className="browser-controls"><button className="secondary-button" disabled={busy || blank} onClick={() => void onAction('read')}>Read page</button><button className="secondary-button" disabled={busy || blank} onClick={() => void onAction('scroll')}>Scroll</button><button className="secondary-button" disabled={busy} onClick={() => void onAction('screenshot')}>Capture</button><button className="secondary-button" disabled={busy || blank} onClick={() => void onAction('takeover')}>Take control</button><button className="secondary-button" disabled={busy || blank} onClick={() => void onAction('return')}>Return control</button><button className="quiet-button danger-text" disabled={busy || !browser} onClick={() => void onAction('stop')}>Close session</button></div>
    <section className="browser-advanced"><button type="button" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen(open => !open)}>Advanced browser actions <ChevronDown className={advancedOpen ? 'is-open' : ''} /></button>{advancedOpen && <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void onAction(String(form.get('action')), { selector: form.get('selector'), text: form.get('text'), uploadId: form.get('uploadId') || undefined }); }}><label>Action<select name="action"><option value="click">Click</option><option value="type">Fill text</option><option value="upload">Upload file</option><option value="download">Download</option></select></label><label>Page selector<input name="selector" required placeholder="button:has-text('Continue')" /></label><label>Text<input name="text" placeholder="When required" /></label><label>Upload ID<input name="uploadId" placeholder="For file uploads" /></label><button className="primary-button" disabled={busy}>Queue for approval</button></form>}</section>
    {tasks.length > 0 && <section className="premium-surface"><div className="surface-heading"><h3>Recent browser actions</h3></div><div className="browser-action-history">{tasks.slice(0, 5).map(task => <div key={task.id}><Globe2 /><span><strong>{task.instruction}</strong><small>{formatDate(task.createdAt)}</small></span><StatusPill tone={statusTone(task.status)}>{readableStatus(task.status)}</StatusPill></div>)}</div></section>}
  </section>;
}

function SearchWorkspace({ tasks, agents, onNavigate }: { tasks: Task[]; agents: Agent[]; onNavigate: (tab: Tab) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState<{ id: string; title: string; updatedAt: string; _count: { messages: number } }[]>([]);
  const [loading, setLoading] = useState(false);
  const normalized = query.trim().toLowerCase();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!normalized) { setConversations([]); return; }
      setLoading(true);
      fetch(`/api/conversations?q=${encodeURIComponent(query)}`).then(response => response.ok ? response.json() : []).then(setConversations).catch(() => setConversations([])).finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [normalized, query]);
  const matchingTasks = normalized ? tasks.filter(task => `${task.instruction} ${task.status}`.toLowerCase().includes(normalized)) : [];
  const matchingAgents = normalized ? agents.filter(agent => `${agent.name} ${agent.role}`.toLowerCase().includes(normalized)) : [];
  return <section className="search-workspace"><div className="search-command"><Search aria-hidden="true" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search conversations, tasks, and agents" aria-label="Search conversations, tasks, and agents" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X /></button>}{loading && <LoaderCircle className="is-spinning" aria-label="Searching" />}</div>{!normalized ? <EmptyState icon={Search} title="Search your workspace" description="Find saved conversations, task history, or registered agents." /> : <div className="search-results">{conversations.length > 0 && <section><h3><MessagesSquare /> Conversations</h3>{conversations.map(conversation => <button key={conversation.id} onClick={() => router.push(`/dashboard?tab=chat&conversation=${encodeURIComponent(conversation.id)}`)}><MessagesSquare aria-hidden="true" /><span><strong>{conversation.title}</strong><small>{conversation._count.messages} messages · {formatDate(conversation.updatedAt)}</small></span><ChevronRight aria-hidden="true" /></button>)}</section>}{matchingTasks.length > 0 && <section><h3><ListTodo /> Tasks</h3>{matchingTasks.slice(0, 10).map(task => <button key={task.id} onClick={() => onNavigate('tasks')}><ListTodo aria-hidden="true" /><span><strong>{task.instruction}</strong><small>{readableStatus(task.status)} · {formatDate(task.createdAt)}</small></span><ChevronRight aria-hidden="true" /></button>)}</section>}{matchingAgents.length > 0 && <section><h3><Bot /> Agents</h3>{matchingAgents.map(agent => <button key={agent.id || agent.name} onClick={() => onNavigate('agents')}><AgentAvatar name={agent.name} size="sm" /><span><strong>{agent.name}</strong><small>{agent.role}</small></span><ChevronRight aria-hidden="true" /></button>)}</section>}{!loading && !conversations.length && !matchingTasks.length && !matchingAgents.length && <EmptyState icon={Search} title="No matching workspace items" description="Try a different name, task phrase, or conversation title." />}</div>}</section>;
}

function SetupWorkspace({ status, onRefresh }: { status: SystemStatus; onRefresh: () => void }) {
  const values = status || {};
  const rows: [string, boolean, string][] = [
    ['Database', Boolean(values.database), 'Connected check'],
    ['Background worker', Boolean(values.worker), 'Recent heartbeat'],
    ['AI provider', Boolean(values.ai), String(values.provider || 'Not checked')],
    ['Google OAuth', Boolean(values.google), 'Configuration present'],
    ['SMTP', Boolean(values.smtp), 'Configuration present'],
    ['Token encryption', Boolean(values.encryption), 'Configuration present'],
  ];
  return <section className="setup-workspace"><div className="surface-heading"><div><span className="section-kicker">System health</span><h2>Setup status</h2><p>Each card distinguishes a configuration check from a verified live connection.</p></div><button className="secondary-button" onClick={onRefresh}><RefreshCw aria-hidden="true" /> Check again</button></div>{status ? <><div className="health-grid">{rows.map(([label, available, note]) => <article className="health-card" key={label}><span className={available ? 'health-mark is-healthy' : 'health-mark'}>{available ? <CheckCircle2 /> : <CircleAlert />}</span><div><strong>{label}</strong><small>{available ? note : 'Setup required'}</small></div><StatusPill tone={available ? 'success' : 'warning'}>{available ? 'Configured' : 'Needs setup'}</StatusPill></article>)}</div><section className="setup-details"><div><span className="section-kicker">AI configuration</span><h3>{String(values.provider || 'Not checked')}</h3><p>Model: {String(values.model || 'Not checked')}</p><p>{values.aiVerified ? 'Live provider verification passed.' : 'Configuration is shown; a provider call has not been independently verified here.'}</p></div><div><span className="section-kicker">Voice</span><h3>{String((values.voice as { provider?: string } | undefined)?.provider || 'Not checked')}</h3><p>Local speech recognition: {values.speech ? 'Reachable' : 'Not reachable'}</p></div></section></> : <EmptyState icon={ShieldCheck} title="Checking services" description="Use Check again if this state persists." />}</section>;
}

function ProfileEditor({ profile, onSave, onError }: { profile: Profile | null; onSave: (profile: Profile) => Promise<void>; onError: (message: string) => void }) {
  const [draft, setDraft] = useState<Profile>(profile || { language: 'en', timezone: 'Asia/Karachi', answers: {}, onboarded: false });
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (profile) setDraft(profile); }, [profile]);
  return <form className="profile-editor" onSubmit={event => { event.preventDefault(); setSaved(false); onSave(draft).then(() => setSaved(true)).catch(caught => onError(caught instanceof Error ? caught.message : 'Could not save profile.')); }}><div><span className="section-kicker">Profile</span><h3>Your details</h3><p>Only profile fields already supported by this workspace are shown here.</p></div><label>Time zone<input required value={draft.timezone} onChange={event => setDraft({ ...draft, timezone: event.target.value })} /></label>{questions.map(question => <label key={question[0]}>{question[1]}<input value={draft.answers[question[0]] || ''} onChange={event => setDraft({ ...draft, answers: { ...draft.answers, [question[0]]: event.target.value } })} maxLength={4000} /></label>)}<label className="checkbox-row"><input type="checkbox" checked={draft.onboarded} onChange={event => setDraft({ ...draft, onboarded: event.target.checked })} /> Onboarding complete</label><div className="button-row"><button className="primary-button">Save profile</button>{saved && <span className="saved-note"><CheckCircle2 /> Profile saved</span>}</div></form>;
}
