'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import WhatsAppLinkedConnect from '@/components/WhatsAppLinkedConnect';
import WhatsAppAgentPanel from '@/components/WhatsAppAgentPanel';
import { MessageCircle, ContactRound, Bot, RefreshCw, ShieldCheck, Search, LoaderCircle, MessagesSquare } from 'lucide-react';
import WhatsAppMiniScreen from '@/components/WhatsAppMiniScreen';
import './whatsapp-workspace.css';

type Consent = { chats?: boolean; incoming?: boolean; send?: boolean; history?: boolean };
type LinkStatus = { state: string; consent?: Consent; agent?: { id: string } | null; error?: string | null };
type Contact = { id: string; name: string };
type SearchResult = { contacts: Contact[]; count: number; source?: string };

const consentNote = 'Contact search only includes data made available by the linked WhatsApp account after you grant Chats & contacts access. Phone contacts that WhatsApp has not synced may not appear.';

export default function WhatsAppConnectorWorkspace({initialTab='connection',embedded=false}:{initialTab?:'connection'|'agent'|'live';embedded?:boolean}) {
  const [tab, setTab] = useState<'connection' | 'contacts' | 'agent' | 'live'>(initialTab);
  const [status, setStatus] = useState<LinkStatus>({ state: 'checking' });
  const [statusError, setStatusError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [guideLanguage, setGuideLanguage] = useState<'roman-ur' | 'en'>('roman-ur');
  const connectedOnce = useRef(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/whatsapp/linked', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json() as LinkStatus & { error?: string };
      if (!response.ok) throw new Error(data.error || 'WhatsApp status is unavailable.');
      setStatus(data);
      setStatusError('');
    } catch (caught) {
      setStatusError(caught instanceof Error ? caught.message : 'WhatsApp status unavailable.');
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const timer = window.setInterval(() => void loadStatus(), 10000);
    return () => window.clearInterval(timer);
  }, [loadStatus]);

  useEffect(() => {
    if (status.state === 'connected' && status.agent && !connectedOnce.current) {
      connectedOnce.current = true;
      setTab('agent');
    } else if (status.state !== 'connected') connectedOnce.current = false;
  }, [status.state, status.agent]);

  useEffect(() => {
    // Old search results must never survive a disconnect or a permission removal.
    if (status.state !== 'connected' || !status.consent?.chats) {
      setResults(null);
      setSearchError('');
    }
  }, [status.state, status.consent?.chats]);

  async function refreshStatus() {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  }
  function onConnected() {
    setTab('agent');
    // Parent V2 sidebar refreshes the status from its own authenticated API.
    if (window.parent !== window) window.parent.postMessage({ type: 'agenth:whatsapp-status-changed' }, window.location.origin);
    setGeneration(value => value + 1);
    setResults(null);
    void loadStatus();
  }
  async function searchContacts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (text.length < 2 || text.length > 80) {
      setSearchError('Enter between 2 and 80 characters of a name or phone number.');
      return;
    }
    if (status.state !== 'connected' || !status.consent?.chats) {
      setSearchError('Connect WhatsApp and enable Chats & contacts in permissions.');
      return;
    }
    setSearching(true);
    setSearchError('');
    setResults(null);
    try {
      const response = await fetch('/api/whatsapp/contacts?q=' + encodeURIComponent(text), {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const data = await response.json() as SearchResult & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not search contacts.');
      setResults(data);
    } catch (caught) {
      setSearchError(caught instanceof Error ? caught.message : 'Contact search failed.');
    } finally {
      setSearching(false);
    }
  }

  const connected = status.state === 'connected' && Boolean(status.agent);
  const contactAccess = connected && Boolean(status.consent?.chats);
  return (
    <main className={'v2-whatsapp-page' + (embedded ? ' v2-wa-chat-embed' : '')}>
      <header className="v2-whatsapp-header">
        <div className="v2-whatsapp-heading">
          <span className="v2-whatsapp-logo"><MessageCircle size={28} /></span>
          <div>
            <h1>WhatsApp</h1>
            <p>Link your personal or business account without leaving AgentH.</p>
          </div>
        </div>
        <div className="v2-whatsapp-header-actions">
          <span role="status" className={'v2-whatsapp-state ' + (connected ? 'is-connected' : '')}>
            <span aria-hidden="true" /> {connected ? 'Connected' : status.state.replaceAll('_', ' ')}
          </span>
          <button type="button" className="v2-whatsapp-refresh" onClick={() => void refreshStatus()} disabled={refreshing} aria-label="Refresh WhatsApp connection status"><RefreshCw size={17}/></button>
        </div>
      </header>
      <div className="v2-whatsapp-guide"><div className="v2-whatsapp-guide-top"><strong>{guideLanguage === 'roman-ur' ? 'WhatsApp kaise use karein?' : 'How to use WhatsApp Manager'}</strong><div className="v2-whatsapp-language" aria-label="Instruction language"><button type="button" aria-pressed={guideLanguage === 'roman-ur'} onClick={() => setGuideLanguage('roman-ur')}>Roman Urdu</button><button type="button" aria-pressed={guideLanguage === 'en'} onClick={() => setGuideLanguage('en')}>English</button></div></div><p>{guideLanguage === 'roman-ur' ? 'WhatsApp connect karein, phir WhatsApp Agent mein likhein: “Ali ko hello bhejo”. Agent contact dhoondega aur bhejne se pehle aapse exact message approve karwayega. Contacts mein names search karein, WhatsApp Live mein synced chats dekhein.' : 'Connect WhatsApp, then tell WhatsApp Agent “Send hello to Ali”. The agent finds the contact and asks you to approve the exact message before sending. Search names under Contacts or view synced chats in WhatsApp Live.'}</p></div>
      <nav className="v2-whatsapp-tabs" role="tablist" aria-label="WhatsApp tabs">
        <button type="button" role="tab" aria-selected={tab === 'connection'} onClick={() => setTab('connection')}><ShieldCheck size={17}/> Connect & permissions</button>
        <button type="button" role="tab" aria-selected={tab === 'contacts'} onClick={() => setTab('contacts')}><ContactRound size={17}/> Contacts</button>
        <button type="button" role="tab" aria-selected={tab === 'agent'} onClick={() => setTab('agent')}><Bot size={17}/> WhatsApp Agent</button>
        {connected && <button type="button" role="tab" aria-selected={tab === 'live'} onClick={() => setTab('live')}><MessagesSquare size={17}/> WhatsApp Live</button>}
      </nav>
      {statusError && <p role="alert" className="v2-whatsapp-error">{statusError}</p>}

      <section className="v2-whatsapp-content" key={tab === 'connection' ? 'connection-' + generation : tab}>
        {tab === 'connection' && <>
          <WhatsAppLinkedConnect onConnected={onConnected} onOpenAgent={() => setTab('agent')} />
          <p className="v2-whatsapp-note">This is an unofficial linked-device integration. Pairing must be approved on your phone. No WhatsApp message is sent without your review and approval.</p>
        </>}

        {tab === 'contacts' && <div className="v2-whatsapp-contacts">
          <h2>Find synced WhatsApp contacts</h2>
          <p>{consentNote}</p>
          {!connected && <div className="v2-whatsapp-info">Your WhatsApp account is not connected yet. Start with the Connect & permissions tab to link your phone using a QR code or pairing code. <button type="button" onClick={() => setTab('connection')}>Open connection setup</button></div>}
          {connected && !contactAccess && <div className="v2-whatsapp-info">Contact access is turned off. Go to Connect & permissions → Permissions and enable <strong>Chats & contacts</strong> to search saved WhatsApp contacts. <button type="button" onClick={() => setTab('connection')}>Manage permissions</button></div>}
          <form className="v2-whatsapp-search" onSubmit={event => void searchContacts(event)}>
            <label className="v2-whatsapp-search-label"><Search size={19}/><input value={query} maxLength={80} onChange={e => { setQuery(e.target.value); setResults(null); setSearchError(''); }} placeholder="Search name or full number" aria-label="Search WhatsApp contacts" disabled={!contactAccess || searching} /></label>
            <button type="submit" disabled={!contactAccess || searching || query.trim().length < 2}>{searching ? <><LoaderCircle size={16} className="v2-whatsapp-spin"/> Searching</> : 'Search'}</button>
          </form>
          {searchError && <p className="v2-whatsapp-error" role="alert">{searchError}</p>}
          {results && <div className="v2-whatsapp-results" aria-live="polite">
            <p>{results.count} matching contact{results.count === 1 ? '' : 's'}</p>
            {!results.count && <div className="v2-whatsapp-info">No contact matched this search. Try the full saved name or international number. For best results, allow the linked device time to sync contacts after connecting.</div>}
            {results.contacts.map(c => {
              const identifier = c.id.split('@')[0];
              const phone = c.id.endsWith('@s.whatsapp.net') ? '+' + identifier : 'Private WhatsApp ID ending in ' + identifier.slice(-4);
              return <article className="v2-whatsapp-contact" key={c.id}>
                <span className="v2-whatsapp-contact-avatar">{(c.name || '?').slice(0,1).toUpperCase()}</span>
                <div><strong>{c.name || 'WhatsApp contact'}</strong><small>{phone}</small></div>
              </article>;
            })}
            {results.source && <p className="v2-whatsapp-source">{results.source}</p>}
          </div>}
        </div>}

        {tab === 'agent' && <div className="v2-whatsapp-agent">
          <WhatsAppAgentPanel language="roman-ur" onManageConnection={() => setTab('connection')} />
        </div>}
        {tab === 'live' && <div className="v2-whatsapp-live"><h2>WhatsApp Live</h2><p>Available chats update from your connected WhatsApp. Sending is only available for private chats and asks for your confirmation.</p><WhatsAppMiniScreen interactive /></div>}
      </section>
    </main>
  );
}
