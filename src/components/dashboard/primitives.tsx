'use client';

import { useState, type ButtonHTMLAttributes, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import {
  Bot,
  BrainCircuit,
  CalendarClock,
  Globe2,
  FileText,
  Mail,
  MessageCircle,
  NotebookTabs,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  type LucideIcon,
} from 'lucide-react';

export type AgentAvatarProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  color?: string | null;
  shape?: string | null;
};

const agentVisuals: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  chief: { icon: BrainCircuit, tone: 'violet', label: 'Chief Agent' },
  researcher: { icon: Search, tone: 'blue', label: 'Research Agent' },
  'browser agent': { icon: Globe2, tone: 'cyan', label: 'Browser Agent' },
  'gmail agent': { icon: Mail, tone: 'red', label: 'Gmail Agent' },
  scheduler: { icon: CalendarClock, tone: 'amber', label: 'Scheduler Agent' },
  uploader: { icon: Upload, tone: 'rose', label: 'Upload Agent' },
  reporter: { icon: FileText, tone: 'indigo', label: 'Reporter Agent' },
  poster: { icon: Send, tone: 'emerald', label: 'Poster Agent' },
  'whatsapp agent': { icon: MessageCircle, tone: 'green', label: 'WhatsApp Agent' },
  'whatsapp manager': { icon: MessageCircle, tone: 'green', label: 'WhatsApp Manager' },
};

function fallbackVisual(name: string) {
  const tones = ['violet', 'blue', 'cyan', 'rose', 'amber', 'indigo'];
  const index = [...name].reduce((total, character) => total + character.charCodeAt(0), 0) % tones.length;
  return { icon: Bot, tone: tones[index], label: `${name} agent` };
}

export function AgentAvatar({ name, size = 'md', active = false, color, shape }: AgentAvatarProps) {
  const visual = agentVisuals[name.toLowerCase()] ?? fallbackVisual(name);
  const defaultColor = name.toLowerCase() === 'whatsapp manager'
    ? '#f1f0eb'
    : name.toLowerCase() === 'friend'
      ? '#2db8a2'
      : name.toLowerCase() === 'email manager'
        ? '#a47a53'
        : name.toLowerCase() === 'chief'
          ? '#a779ff'
          : null;
  const palette: Record<string, string> = {
    violet: '#a779ff',
    blue: '#2c8cff',
    cyan: '#69d4e1',
    teal: '#2bbca6',
    green: '#35ca8c',
    lime: '#66d840',
    amber: '#ffb12f',
    orange: '#ff6c24',
    rose: '#f553ae',
    pink: '#f553ae',
    indigo: '#747cf8',
    red: '#f0473d',
    emerald: '#36c98a',
  };
  const avatarColor = color && color.startsWith('#') ? color : (color ? palette[color] : undefined) || defaultColor || palette[visual.tone] || '#a779ff';
  const avatarShape = shape || (name.toLowerCase() === 'friend' ? 'cloud' : name.toLowerCase() === 'chief' ? 'round' : 'soft');
  const eyeColor = name.toLowerCase().includes('whatsapp') ? '#111' : '#fff';
  const [hovering, setHovering] = useState(false);
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const shapeMap: Record<string, string> = {
    round: '50%',
    circle: '50%',
    soft: '24%',
    rounded: '24%',
    squircle: '29%',
    blob: '46% 55% 41% 50%',
    cloud: '50% 48% 40% 46%',
    tilt: '25% 35% 24% 29%',
    hex: '18%',
  };
  const avatarStyle = {
    '--bot': avatarColor,
    '--eye': eyeColor,
    '--shape': shapeMap[avatarShape] || '24%',
    '--rotation': avatarShape === 'tilt' ? '-5deg' : '0deg',
    '--ex': `${eyePosition.x}px`,
    '--ey': `${eyePosition.y}px`,
  } as CSSProperties;
  const followPointer = (event: PointerEvent<HTMLSpanElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
    const y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
    setEyePosition({ x: Math.max(-1, Math.min(1, x)) * 4, y: Math.max(-1, Math.min(1, y)) * 3 });
  };
  return (
    <span
      className={`agent-avatar agent-avatar--${size} ${hovering ? 'is-hovering' : ''} ${active ? 'is-active' : ''}`}
      aria-label={visual.label}
      title={visual.label}
      style={avatarStyle}
      onPointerEnter={() => setHovering(true)}
      onPointerMove={followPointer}
      onPointerLeave={() => {
        setHovering(false);
        setEyePosition({ x: 0, y: 0 });
      }}
    >
      <span className="agent-avatar__eyes" aria-hidden="true"><i /><i /></span>
    </span>
  );
}

export function IconButton({
  label,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; className?: string }) {
  return (
    <button className={`icon-button ${className}`} type="button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function StatusPill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
}) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

export function EmptyState({
  icon: Icon = NotebookTabs,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state">
      <span className="empty-state-icon"><Icon aria-hidden="true" /></span>
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </section>
  );
}

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return <span className={`brand-mark brand-mark--${size}`} aria-hidden="true"><Sparkles /></span>;
}

export function HealthIcon({ healthy }: { healthy: boolean }) {
  return <ShieldCheck aria-hidden="true" className={healthy ? 'health-icon health-icon--ok' : 'health-icon'} />;
}
