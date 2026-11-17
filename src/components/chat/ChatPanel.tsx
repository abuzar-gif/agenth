'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Copy,
  AudioLines,
  FilePlus2,
  History,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SendHorizontal,
  Settings2,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import Voice, { stopVoice } from '@/components/voice';
import TextVoiceMode from '@/components/chat/TextVoiceMode';
import { useOrbState } from '@/hooks/useOrbState';
import { EmptyState, IconButton } from '@/components/dashboard/primitives';

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  status: string;
  model?: string;
  tokens?: number;
};

type Conversation = {
  id: string;
  title: string;
  _count: { messages: number };
};

type ChatPanelProps = {
  language: string;
  name: string;
  agentId: string;
  agentName?: string;
  mode?: 'chat' | 'history';
};

function renderMessage(content: string): ReactNode {
  const blocks = content.split(/(```[\s\S]*?```)/g).filter(Boolean);
  return blocks.map((block, index) => {
    if (block.startsWith('```') && block.endsWith('```')) {
      const raw = block.slice(3, -3);
      const newline = raw.indexOf('\n');
      const language = newline > -1 ? raw.slice(0, newline).trim() : '';
      const code = newline > -1 ? raw.slice(newline + 1) : raw;
      return <pre key={`${index}-${code.slice(0, 12)}`}><code data-language={language || undefined}>{code}</code></pre>;
    }

    const lines = block.split('\n');
    return (
      <div className="message-prose" key={`${index}-${block.slice(0, 12)}`}>
        {lines.map((line, lineIndex) => {
          const heading = line.match(/^(#{1,3})\s+(.+)$/);
          const bullet = line.match(/^\s*[-*]\s+(.+)$/);
          const number = line.match(/^\s*(\d+)\.\s+(.+)$/);
          if (heading) return <strong className="message-heading" key={lineIndex}>{heading[2]}</strong>;
          if (bullet) return <span className="message-list-item" key={lineIndex}>• {bullet[1]}</span>;
          if (number) return <span className="message-list-item" key={lineIndex}>{number[1]}. {number[2]}</span>;
          if (!line) return <span className="message-break" key={lineIndex} aria-hidden="true" />;
          return <span key={lineIndex}>{line}</span>;
        })}
      </div>
    );
  });
}

function ConversationList({
  conversations,
  currentId,
  search,
  setSearch,
  busy,
  onOpen,
  onNew,
  onRename,
  onDelete,
  historyOnly = false,
}: {
  conversations: Conversation[];
  currentId: string | null;
  search: string;
  setSearch: (value: string) => void;
  busy: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
  historyOnly?: boolean;
}) {
  return (
    <section className={`conversation-list ${historyOnly ? 'conversation-list--page' : ''}`} aria-label="Conversation history">
      <div className="conversation-list-head">
        <div>
          <span className="section-kicker">History</span>
          <h2>{historyOnly ? 'Your conversations' : 'Chats'}</h2>
        </div>
        {!historyOnly && <IconButton label="New chat" onClick={onNew} disabled={busy}><FilePlus2 /></IconButton>}
      </div>
      <label className="conversation-search">
        <Search aria-hidden="true" />
        <span className="sr-only">Search conversation history</span>
        <input placeholder="Search chats" value={search} onChange={event => setSearch(event.target.value)} />
      </label>
      <div className="conversation-results">
        {conversations.map(conversation => (
          <article className={`conversation-item ${currentId === conversation.id ? 'is-selected' : ''}`} key={conversation.id}>
            <button type="button" disabled={busy} onClick={() => onOpen(conversation.id)}>
              <span>{conversation.title}</span>
              <small>{conversation._count.messages} message{conversation._count.messages === 1 ? '' : 's'}</small>
            </button>
            <div className="conversation-item-actions">
              <IconButton label={`Rename ${conversation.title}`} disabled={busy} onClick={() => onRename(conversation)}><Pencil /></IconButton>
              <IconButton label={`Delete ${conversation.title}`} disabled={busy} onClick={() => onDelete(conversation)}><Trash2 /></IconButton>
            </div>
          </article>
        ))}
        {!conversations.length && <EmptyState icon={History} title="No conversations yet" description="Your chats will appear here after you send your first message." />}
      </div>
    </section>
  );
}

export default function ChatPanel({ language, name, agentId, agentName = 'Chief', mode = 'chat' }: ChatPanelProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [think, setThink] = useState(false);
  const [supportsThinking, setSupportsThinking] = useState(false);
  const [thinkingOnly, setThinkingOnly] = useState(false);
  const [fileId, setFileId] = useState<string | null>(null);
  const [filename, setFilename] = useState('');
  const [historyOpen, setHistoryOpen] = useState(mode === 'history');
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const transcript = useRef<HTMLDivElement | null>(null);
  const openedConversation = useRef<string | null>(null);
  const { setActivity } = useOrbState();
  const firstName = name.trim().split(/\s+/)[0] || '';
  const historyOnly = mode === 'history';
  const latestResponse = messages.findLast(message => message.role === 'assistant')?.content || '';

  const load = useCallback(async () => {
    const response = await fetch(`/api/conversations?q=${encodeURIComponent(search)}&agent=${encodeURIComponent(agentId)}`);
    if (response.ok) setConversations(await response.json());
  }, [search, agentId]);

  const resetDraft = useCallback(() => {
    setId(null);
    setMessages([]);
    setText('');
    setError('');
    setFileId(null);
    setFilename('');
    setActivity('chat', null);
    input.current?.focus();
  }, [setActivity]);

  const open = useCallback(async (conversationId: string) => {
    if (busy) return;
    setError('');
    const response = await fetch(`/api/conversations/${conversationId}`);
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Could not open this conversation.');
      return;
    }
    if (historyOnly) {
      router.push(`/dashboard?tab=chat&agent=${encodeURIComponent(agentId)}&conversation=${encodeURIComponent(conversationId)}`);
      return;
    }
    setId(conversationId);
    setMessages(data.messages);
    setHistoryOpen(false);
  }, [busy, historyOnly, router, agentId]);

  const rename = useCallback(async (conversation: Conversation) => {
    const title = prompt('Conversation name', conversation.title);
    if (!title?.trim()) return;
    await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    await load();
  }, [load]);

  const remove = useCallback(async (conversation: Conversation) => {
    if (!confirm(`Delete “${conversation.title}” and its messages?`)) return;
    await fetch(`/api/conversations/${conversation.id}`, { method: 'DELETE' });
    if (id === conversation.id) resetDraft();
    await load();
  }, [id, load, resetDraft]);

  const refreshChat = async () => {
    if (busy) return;
    setError('');
    try {
      if (id) {
        const response = await fetch(`/api/conversations/${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not refresh this chat.');
        setMessages(data.messages);
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not refresh chat.');
    }
  };

  const clearChat = async () => {
    if (busy || !id || !confirm(`Clear this ${agentName} conversation permanently? Other chats will not be affected.`)) return;
    setError('');
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Could not clear chat.');
      }
      resetDraft();
      openedConversation.current = null;
      router.replace(`/dashboard?tab=chat&agent=${encodeURIComponent(agentId)}`, { scroll: false });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not clear chat.');
    }
  };

  useEffect(() => {
    fetch('/api/ai/models')
      .then(response => response.json())
      .then(data => {
        setSupportsThinking(Boolean(data.info?.supportsThinking));
        setThinkingOnly(Boolean(data.info?.thinkingOnly));
        setThink(Boolean(data.info?.thinkingOnly));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => () => {
    abort.current?.abort();
    setActivity('chat', null);
  }, [setActivity]);

  useEffect(() => {
    const conversation = params.get('conversation');
    if (!conversation || conversation === openedConversation.current || historyOnly) return;
    openedConversation.current = conversation;
    void open(conversation);
  }, [historyOnly, open, params]);

  useEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 28), 180)}px`;
  }, [text]);

  useEffect(() => {
    const element = transcript.current;
    if (!element || !messages.length) return;
    element.scrollTo({ top: element.scrollHeight, behavior: busy ? 'auto' : 'smooth' });
  }, [busy, messages]);

  async function send(regenerate = false, spokenText?: string) {
    const outgoing = spokenText ?? text;
    if (busy || (!regenerate && !outgoing.trim() && !fileId)) return;
    setBusy(true);
    setError('');
    stopVoice();
    setActivity('chat', 'thinking', 'AgentH is preparing your reply');
    abort.current = new AbortController();
    let current = id;
    let full = '';
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; abort.current?.abort(); }, 105_000);
    const localId = crypto.randomUUID();
    try {
      if (!current) {
        const response = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not start a conversation.');
        current = data.id;
        setId(current);
      }
      if (!regenerate) {
        setMessages(previous => [...previous, {
          id: crypto.randomUUID(),
          role: 'user',
          content: outgoing + (filename ? `\n[Attachment: ${filename}]` : ''),
          status: 'completed',
        }]);
      } else {
        setMessages(previous => {
          const next = [...previous];
          const lastAssistant = next.findLastIndex(message => message.role === 'assistant');
          if (lastAssistant >= 0) next.splice(lastAssistant, 1);
          return next;
        });
      }
      setMessages(previous => [...previous, { id: localId, role: 'assistant', content: '', status: 'generating' }]);
      const response = await fetch(`/api/conversations/${current}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: outgoing, regenerate, think, agentId, ...(fileId ? { fileId } : {}) }),
        signal: abort.current.signal,
      });
      if (!response.ok) throw new Error((await response.json()).error || 'The chat request failed.');
      setText('');
      setFileId(null);
      setFilename('');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('The chat response did not include a stream.');
      const decoder = new TextDecoder();
      let pending = '';
      let confirmed = false;
      const consume = (line: string) => {
        if (!line.trim()) return;
        const chunk = JSON.parse(line);
        if (chunk.type === 'error') throw new Error(chunk.error);
        if (chunk.type === 'delta') {
          full += chunk.text;
          setMessages(previous => previous.map(message => message.id === localId ? { ...message, content: full } : message));
        }
        if (chunk.type === 'done') {
          confirmed = true;
          setMessages(previous => previous.map(message => message.id === localId ? { ...message, status: 'completed', model: chunk.model, tokens: chunk.tokens } : message));
        }
      };
      for (;;) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split('\n');
        pending = lines.pop() || '';
        for (const line of lines) consume(line);
        if (done) break;
      }
      consume(pending);
      if (!confirmed) throw new Error('The response ended before the backend confirmed completion. Please retry.');
      setActivity('chat', null);
      await load();
    } catch (caught) {
      const wasAborted = abort.current?.signal.aborted;
      const message = timedOut ? 'The AI response timed out. Please retry or check the AI provider in Setup.' : caught instanceof Error ? caught.message : 'Chat failed.';
      if (!wasAborted || timedOut) {
        setError(message);
        setActivity('chat', 'error', message);
      } else {
        setActivity('chat', null);
      }
      setMessages(previous => previous.map(message => message.id === localId ? {
        ...message,
        status: wasAborted && !timedOut ? 'stopped' : 'failed',
      } : message));
      if (spokenText !== undefined) throw caught;
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  async function attach(file?: File) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setError('Chat attachments must be UTF-8 text files under 1 MB.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/files', { method: 'POST', body: form });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Could not attach this file.');
      return;
    }
    setFileId(data.id);
    setFilename(file.name);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  if (historyOnly) {
    return (
      <div className="premium-history-page">
        <div className="premium-history-page-head">
          <div>
            <span className="section-kicker">Workspace history</span>
            <h2>Conversations</h2>
            <p>Open, rename, or remove saved conversations. Your current chat stays separate.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => router.push(`/dashboard?tab=chat&agent=${encodeURIComponent(agentId)}`)}>
            <FilePlus2 aria-hidden="true" /> New chat
          </button>
        </div>
        <ConversationList
          conversations={conversations}
          currentId={id}
          search={search}
          setSearch={setSearch}
          busy={busy}
          onOpen={conversationId => void open(conversationId)}
          onNew={resetDraft}
          onRename={conversation => void rename(conversation)}
          onDelete={conversation => void remove(conversation)}
          historyOnly
        />
      </div>
    );
  }

  return (
    <div className={`premium-chat-layout ${historyOpen ? 'is-history-open' : ''}`}>
      <aside className="chat-history-drawer" aria-hidden={!historyOpen} inert={!historyOpen}>
        <ConversationList
          conversations={conversations}
          currentId={id}
          search={search}
          setSearch={setSearch}
          busy={busy}
          onOpen={conversationId => void open(conversationId)}
          onNew={resetDraft}
          onRename={conversation => void rename(conversation)}
          onDelete={conversation => void remove(conversation)}
        />
      </aside>

      <section className={`premium-chat-main ${messages.length ? 'has-messages' : ''}`}>
        <header className="premium-chat-header">
          <div className="chat-header-actions">
            <IconButton label={historyOpen ? 'Close chat history' : 'Open chat history'} onClick={() => setHistoryOpen(opened => !opened)}>
              {historyOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </IconButton>
            <div className="chat-mode-switch" role="group" aria-label="Workspace mode">
              <button className="is-active" type="button" aria-current="page">Chat</button>
              <button type="button" onClick={() => router.push('/dashboard?tab=chief')}>To-Do</button>
            </div>
            <button type="button" className="quiet-button" disabled={busy} onClick={() => void refreshChat()} aria-label={`Refresh ${agentName} chat`}><RotateCcw aria-hidden="true" /> Refresh Chat</button>
            <button type="button" className="quiet-button danger-text" disabled={busy || !id} onClick={() => void clearChat()} aria-label={`Clear ${agentName} chat`}><Trash2 aria-hidden="true" /> Clear Chat</button>
          </div>
        </header>

        {!messages.length && (
          <div className="premium-chat-welcome">
            <h1>{firstName ? `How can I help you, ${firstName}?` : 'How can I help you today?'}</h1>
            <div className="chat-suggestion-row" aria-label="Suggested actions">
              <button type="button" onClick={() => router.push('/dashboard?tab=chief')}>Plan a task</button>
              <button type="button" onClick={() => router.push('/dashboard?tab=browser')}>Open browser</button>
              <button type="button" onClick={() => setHistoryOpen(true)}>Search chats</button>
            </div>
          </div>
        )}

        <div className="premium-chat-transcript" ref={transcript} aria-live="polite">
          {messages.map((message, index) => {
            const isAssistant = message.role === 'assistant';
            const isLastAssistant = isAssistant && index === messages.map(item => item.role).lastIndexOf('assistant');
            return (
              <article className={`premium-chat-message premium-chat-message--${message.role}`} key={message.id}>
                <div className="message-body">
                  {isAssistant && <div className="message-byline">{agentName}</div>}
                  <div className="message-text" dir="auto">
                    {message.content ? renderMessage(message.content) : message.status === 'generating' ? <span className="generation-indicator"><i /><i /><i /> Thinking</span> : 'No response generated.'}
                  </div>
                  <div className="message-actions">
                    <IconButton label="Copy message" disabled={!message.content} onClick={() => void navigator.clipboard?.writeText(message.content)}><Copy /></IconButton>
                    {isLastAssistant && message.status === 'completed' && (
                      <IconButton label="Regenerate response" disabled={busy} onClick={() => void send(true)}><RotateCcw /></IconButton>
                    )}
                    {(message.model || message.tokens != null || message.status !== 'completed') && (
                      <details className="message-details">
                        <summary aria-label="Message details" title="Message details"><MoreHorizontal /></summary>
                        <div>
                          {message.status !== 'completed' && <span>Status: {message.status}</span>}
                          {message.model && <span>Model: {message.model}</span>}
                          {message.tokens != null && <span>Tokens: {message.tokens}</span>}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {error && <div className="premium-inline-error" role="alert"><span>{error}</span><button type="button" onClick={() => void send(true)}>Retry</button></div>}

        <form className="premium-chat-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
          {filename && <span className="composer-attachment"><FilePlus2 aria-hidden="true" /> {filename}<button type="button" aria-label="Remove attachment" onClick={() => { setFileId(null); setFilename(''); }}><X /></button></span>}
          <label className="composer-attach" title="Attach text file">
            <Plus aria-hidden="true" />
            <span className="sr-only">Attach a text file</span>
            <input type="file" accept=".txt,.md,.csv,.json,.ts,.js,.py" disabled={busy} onChange={event => void attach(event.target.files?.[0])} />
          </label>
          <label className="sr-only" htmlFor="chat-input">Message AgentH</label>
          <textarea
            ref={input}
            id="chat-input"
            value={text}
            onChange={event => setText(event.target.value)}
            onKeyDown={onInputKeyDown}
            maxLength={20_000}
            placeholder="Ask AgentH"
            disabled={busy}
            rows={1}
          />
          {!voiceModeOpen && <Voice language={language} onText={setText} composer disabled={busy} />}
          <IconButton className="composer-voice-mode" label="Open text-response Voice Mode" disabled={busy} onClick={() => { stopVoice(); setVoiceModeOpen(true); }}><AudioLines /></IconButton>
          {supportsThinking && !thinkingOnly && (
            <details className="composer-options">
              <summary aria-label="Chat options" title="Chat options"><Settings2 /></summary>
              <label><input type="checkbox" checked={think} onChange={event => setThink(event.target.checked)} /> Thinking mode</label>
            </details>
          )}
          {busy ? (
            <IconButton className="composer-send is-stop" label="Stop generating" onClick={() => abort.current?.abort()}><Square /></IconButton>
          ) : (
            <IconButton className="composer-send" label="Send message" type="submit" disabled={!text.trim() && !fileId}><SendHorizontal /></IconButton>
          )}
        </form>
        <TextVoiceMode open={voiceModeOpen} onClose={() => { setVoiceModeOpen(false); abort.current?.abort(); }} language={language} onSubmit={async transcript => { await send(false, transcript); }} response={latestResponse} busy={busy} requestError={error} />
      </section>
    </div>
  );
}
