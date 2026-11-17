'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, CheckCircle2, Link2, LoaderCircle, QrCode, RefreshCw, Settings2, ShieldCheck, Smartphone, Unplug, X } from 'lucide-react';
import ToolIcon from '@/components/ToolIcon';
import {pairingPhonePreview,whatsappPairingPhone} from '@/lib/whatsapp-link-phone';
import './whatsapp-linked-connect.css';

type Consent = { draft: boolean; chats: boolean; incoming: boolean; history: boolean; send: boolean; automatic: boolean };
type LinkedStatus = { state: string; mode?: string; workerOnline?: boolean; qr?: string | null; code?: string | null; error?: string | null; consent?: Consent; agent?: { id: string; name: string } | null };

const states: Record<string, string> = {
  checking: 'Checking connection',
  disconnected: 'Not connected', connecting: 'Connecting', reconnecting: 'Reconnecting',
  qr: 'Scan to connect', pairing: 'Enter pairing code', connected: 'Connected',
  disconnecting: 'Disconnecting', error: 'Connection error', logged_out: 'Reconnect required', reconnect_required: 'Reconnect required',
};

export default function WhatsAppLinkedConnect({ onConnected, onOpenAgent }: { onConnected: () => void; onOpenAgent?: () => void }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState('consent');
  const [language, setLanguage] = useState('en');
  const [mode, setMode] = useState('qr');
  const [phone, setPhone] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pollError, setPollError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [linkStartedAt, setLinkStartedAt] = useState(0);
  const [lastPolledAt, setLastPolledAt] = useState(0);
  const [status, setStatus] = useState<LinkedStatus>({ state: 'checking' });
  const [success, setSuccess] = useState(false);
  const [consent, setConsent] = useState<Consent>({ draft: true, chats: false, incoming: false, history: false, send: false, automatic: false });
  const dialog = useRef<HTMLElement>(null);
  const notify = useRef(onConnected);
  const mutationPending = useRef(false);
  const mutationVersion = useRef(0);
  const pollingRequest = useRef<AbortController | null>(null);
  useEffect(() => { notify.current = onConnected; }, [onConnected]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      if (!alive) return;
      if (mutationPending.current) { timer = setTimeout(() => void load(), 1000); return; }
      const version = mutationVersion.current;
      const controller = new AbortController();
      pollingRequest.current = controller;
      try {
        const response = await fetch('/api/whatsapp/linked', { signal: controller.signal, cache: 'no-store' });
        const value = await response.json() as LinkedStatus;
        if (!response.ok) throw new Error(value.error || 'Could not check WhatsApp status.');
        if (alive && version === mutationVersion.current && !mutationPending.current) {
          setPollError('');
          setLastPolledAt(Date.now());
          setStatus(value);
          if (value.state === 'connected' && value.agent && open && stage === 'link') {
            setOpen(false);
            setSuccess(true);
            notify.current();
          }
        }
      } catch (caught) {
        if (alive && !controller.signal.aborted && version === mutationVersion.current) {
          setPollError(caught instanceof Error ? caught.message : 'Could not check WhatsApp status. Please try again.');
          setStatus(previous => previous.state === 'checking' ? { state: 'error' } : previous);
        }
      } finally {
        if (pollingRequest.current === controller) pollingRequest.current = null;
        if (alive) timer = setTimeout(() => void load(), open ? 3000 : 15000);
      }
    };
    void load();
    return () => { alive = false; if (timer) clearTimeout(timer); pollingRequest.current?.abort(); };
  }, [open, stage, refreshVersion]);

  useEffect(() => {
    if (!open && !success) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); setSuccess(false); }
      if (event.key !== 'Tab' || !element) return;
      const buttons = Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'));
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus?.focus(); };
  }, [open, success]);

  async function start(selected = mode) {
    if (mutationPending.current) return;
    let normalizedPhone: string | undefined;
    if (stage !== 'permissions' && selected === 'phone') {
      try { normalizedPhone = whatsappPairingPhone(phone); }
      catch (caught) { setError(caught instanceof Error ? caught.message : 'Invalid phone number.'); return; }
    }
    mutationPending.current = true;
    mutationVersion.current += 1;
    pollingRequest.current?.abort();
    setBusy(true); setError(''); setPollError('');
    if (stage !== 'permissions') setLinkStartedAt(Date.now());
    if (stage !== 'permissions') { setMode(selected); setStatus({ state: 'connecting', mode: selected }); setStage('link'); }
    try {
      const response = await fetch('/api/whatsapp/linked', {
        method: stage === 'permissions' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selected, ...(selected === 'phone' ? { phone: normalizedPhone } : {}), unofficialConsent: accepted, consent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStatus({ ...data, mode: selected });
      if (stage === 'permissions') { setOpen(false); notify.current(); }
      else setStage('link');
    } catch (caught) { const message = caught instanceof Error ? caught.message : 'Could not start linking.'; setError(message); setStatus({ state: 'error', mode: selected, error: message }); }
    finally { mutationPending.current = false; setBusy(false); setRefreshVersion(previous => previous + 1); }
  }

  async function disconnect() {
    if (mutationPending.current) return;
    if (!confirm('Disconnect WhatsApp, remove its agent and erase stored session keys?')) return;
    mutationPending.current = true;
    mutationVersion.current += 1;
    pollingRequest.current?.abort();
    setBusy(true); setError(''); setPollError('');
    try {
      const response = await fetch('/api/whatsapp/linked', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not disconnect WhatsApp.');
      setStatus(data); notify.current();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not disconnect WhatsApp.'); }
    finally { mutationPending.current = false; setBusy(false); setRefreshVersion(previous => previous + 1); }
  }

  const workerUnavailable = status.workerOnline === false;
  const pairingTimedOut = linkStartedAt > 0 && lastPolledAt - linkStartedAt > 60_000 && !status.code && !status.qr;
  const waitingForCode = stage === 'link' && !workerUnavailable && !pairingTimedOut && (busy || (status.mode === mode && ['connecting', 'reconnecting', 'qr', 'pairing'].includes(status.state) && !(mode === 'qr' ? status.qr : status.code)));
  const english = language === 'en';
  const connected = status.state === 'connected' && Boolean(status.agent);
  const transitioning = ['checking', 'connecting', 'reconnecting', 'disconnecting'].includes(status.state);
  const linkEnded = ['reconnect_required', 'logged_out', 'error', 'disconnected'].includes(status.state);
  const visibleError = error || pollError;
  const stateLabel = status.state === 'connected' && !status.agent ? 'Finishing setup' : states[status.state] || status.state.replaceAll('_', ' ');
  const instructions = mode === 'qr'
    ? (english ? ['Open WhatsApp or WhatsApp Business on your phone.', 'iPhone: Settings → Linked Devices. Android: ⋮ menu → Linked devices.', 'Tap Link a device, then scan this QR code.'] : ['Phone par WhatsApp ya WhatsApp Business kholein.', 'iPhone: Settings → Linked Devices. Android: ⋮ menu → Linked devices.', 'Link a device dabayein aur yeh QR scan karein.'])
    : (english ? ['Enter your full international phone number, then choose Get pairing code.', 'On your phone: WhatsApp → Settings (or Android ⋮) → Linked devices → Link a device.', 'Tap Link with phone number instead.', 'Enter the code shown here, then confirm the linked device on your phone.'] : ['Country code ke saath poora number likhein aur Get pairing code dabayein.', 'Phone mein WhatsApp → Settings (ya Android ⋮) → Linked devices → Link a device kholein.', 'Link with phone number instead par tap karein.', 'Yahan dikhne wala code phone mein enter karein aur device confirm karein.']);

  return (
    <article className="connector-card whatsapp-linked-card">
      <div className="connector-card-top">
        <span className="connector-icon whatsapp-linked-icon"><ToolIcon provider="whatsapp" size={31} /></span>
        <span className={`whatsapp-linked-status ${connected ? 'is-connected' : transitioning ? 'is-pending' : status.state === 'error' ? 'is-error' : ''}`} role="status">
          {connected ? <CheckCircle2 /> : transitioning ? <LoaderCircle className="whatsapp-linked-spin" /> : <span className="whatsapp-linked-dot" />}{stateLabel}
        </span>
      </div>
      <div className="whatsapp-linked-heading"><h3>WhatsApp</h3><span>Personal & Business</span></div>
      <p>Your linked account, managed by your dedicated WhatsApp Agent.</p>
      <div className="connector-actions-list"><span>Messages</span><span>Chats & contacts</span><span>Approval before sending</span></div>
      <details className="whatsapp-linked-access"><summary><ShieldCheck /> Account access</summary><p>You choose which chats and messages AgentH may access. Only WhatsApp data made available to the linked device can be shown.</p><p>This uses an unofficial linked-device connection. WhatsApp may restrict unofficial clients.</p></details>
      <div className="whatsapp-linked-actions">
        {connected ? <>
          {onOpenAgent ? <button type="button" className="primary-button" onClick={onOpenAgent}>Open WhatsApp Agent <ArrowUpRight /></button> : <Link className="primary-button" href="/dashboard?tab=whatsapp-agent">Open WhatsApp Agent <ArrowUpRight /></Link>}
          <div className="whatsapp-linked-secondary"><button type="button" disabled={busy} onClick={() => { setConsent(status.consent || consent); setAccepted(true); setStage('permissions'); setOpen(true); }}><Settings2 /> Permissions</button><button type="button" disabled={busy} onClick={() => void disconnect()}><Unplug /> Disconnect</button></div>
        </> : <button type="button" className="primary-button" disabled={busy || ['checking', 'disconnecting'].includes(status.state)} onClick={() => { setOpen(true); setStage('consent'); setError(''); }}><Link2 />{status.state === 'checking' ? 'Checking connection…' : status.state === 'disconnected' ? 'Connect WhatsApp' : 'Reconnect WhatsApp'}</button>}
      </div>
      {!open && visibleError && <p className="whatsapp-linked-error" role="alert">{visibleError}</p>}

      {open && <div className="whatsapp-link-overlay"><section ref={dialog} tabIndex={-1} className="whatsapp-link-dialog" role="dialog" aria-modal="true" aria-labelledby="linked-title">
        <button type="button" className="whatsapp-link-close" aria-label="Close WhatsApp connection" title="Close" onClick={() => setOpen(false)}><X /></button>
        <div className="whatsapp-link-dialog-brand"><ToolIcon provider="whatsapp" size={36} /><div><span>LINK YOUR ACCOUNT</span><h2 id="linked-title">{stage === 'permissions' ? 'WhatsApp permissions' : 'Connect WhatsApp'}</h2></div></div>
        <div className="whatsapp-link-segments" aria-label="Instructions language"><button type="button" aria-pressed={english} onClick={() => setLanguage('en')}>English</button><button type="button" aria-pressed={!english} onClick={() => setLanguage('roman-ur')}>Roman Urdu</button></div>
        {stage === 'consent' || stage === 'permissions' ? <>
          <p className="whatsapp-link-description">Choose what your dedicated WhatsApp Agent can access. Sending a message always requires your approval.</p>
          <div className="whatsapp-permission-list">
            <label><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span><strong>This is my account</strong><small>I understand this is an unofficial linked-device integration.</small></span></label>
            <label><input type="checkbox" checked={consent.chats} onChange={event => setConsent({ ...consent, chats: event.target.checked, incoming: event.target.checked && consent.incoming, history: event.target.checked && consent.history })} /><span><strong>Chats & contacts</strong><small>Access supported contact and conversation information.</small></span></label>
            <label><input type="checkbox" disabled={!consent.chats} checked={consent.incoming} onChange={event => setConsent({ ...consent, incoming: event.target.checked })} /><span><strong>Incoming messages</strong><small>Read messages received while this account is linked.</small></span></label>
            <label><input type="checkbox" disabled={!consent.chats || !consent.incoming} checked={consent.history} onChange={event => setConsent({ ...consent, history: event.target.checked })} /><span><strong>Synced history</strong><small>Read available history and group information. Groups remain display-only.</small></span></label>
            <label><input type="checkbox" checked={consent.send} onChange={event => setConsent({ ...consent, send: event.target.checked })} /><span><strong>Send & reply</strong><small>Send exact messages to approved recipients after your confirmation.</small></span></label>
          </div>
          <div className="whatsapp-link-dialog-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button><button type="button" className="primary-button" disabled={!accepted || busy} onClick={() => { if (stage === 'permissions') void start('qr'); else { setStage('link'); setMode('qr'); setStatus({ state: 'disconnected' }); } }}>{busy ? <LoaderCircle className="whatsapp-linked-spin" /> : <Check />}{busy ? 'Saving…' : stage === 'permissions' ? 'Save permissions' : 'Choose linking method'}</button></div>
        </> : <>
          <div className="whatsapp-link-segments" aria-label="Linking method"><button type="button" disabled={busy} aria-pressed={mode === 'qr'} onClick={() => setMode('qr')}><QrCode /> QR code</button><button type="button" disabled={busy} aria-pressed={mode === 'phone'} onClick={() => setMode('phone')}><Smartphone /> Phone number</button></div>
          <div className="whatsapp-link-code-area" aria-live="polite">
            {stage === 'link' && (workerUnavailable || pairingTimedOut) && <p className="whatsapp-linked-error" role="alert">{workerUnavailable ? 'WhatsApp background worker is offline. Restart AgentH worker, then request a new code.' : 'WhatsApp did not return a code within one minute. Try Get pairing code again or switch to QR.'}</p>}
            {waitingForCode && <div className="whatsapp-link-loading" role="status"><LoaderCircle className="whatsapp-linked-spin" /><strong>{english ? 'Preparing your WhatsApp code…' : 'Aapka WhatsApp code tayyar ho raha hai…'}</strong><small>{english ? 'Keep this window open while WhatsApp responds.' : 'WhatsApp ka code aate hi yahan nazar aa jayega.'}</small></div>}
            {mode === 'phone' ? <>
              <label className="whatsapp-phone-field">WhatsApp phone number<input inputMode="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="03001234567" /><small>{pairingPhonePreview(phone) ? `Detected: ${pairingPhonePreview(phone)}` : 'Pakistan: 03xx xxxxxxx or +92 3xx xxxxxxx'}</small></label>
              <button type="button" className="secondary-button" disabled={busy || !pairingPhonePreview(phone)} onClick={() => void start('phone')}>Get pairing code</button>
              {status.mode === 'phone' && status.code && <div className="whatsapp-pairing-code" aria-label="WhatsApp pairing code">{status.code}</div>}
            </> : <>
              {status.mode === 'qr' && status.qr ? <img className="whatsapp-link-qr" src={status.qr} alt="WhatsApp linked-device QR code" /> : !waitingForCode && <p>{linkEnded ? 'This linking attempt ended. Refresh QR to start a new attempt.' : status.state === 'connected' ? 'WhatsApp confirmed the connection. Finishing agent setup…' : status.mode !== mode ? 'Choose Refresh QR to request a QR code.' : 'Waiting for WhatsApp…'}</p>}
              <button type="button" className="secondary-button" disabled={busy} onClick={() => void start('qr')}><RefreshCw /> Refresh QR</button>
            </>}
          </div>
          <ol className="whatsapp-link-instructions">{instructions.map(text => <li key={text}>{text}</li>)}</ol>
          <p className="whatsapp-link-description">Codes expire. Request a new code if WhatsApp rejects an old one. Connection is confirmed by your linked account.</p>
          {status.error && <p role="alert" className="whatsapp-linked-error">{status.error}</p>}
        </>}
        {visibleError && <p role="alert" className="whatsapp-linked-error">{visibleError}</p>}
      </section></div>}
      {success && <div className="whatsapp-link-overlay"><section ref={dialog} tabIndex={-1} className="whatsapp-link-dialog whatsapp-link-success" role="dialog" aria-modal="true" aria-label="WhatsApp connected">
        <span className="whatsapp-success-symbol"><CheckCircle2 /></span><h2>WhatsApp connected</h2><p>Your linked account confirmed the connection. Open your dedicated agent to view available chats and contacts.</p>
        <div className="whatsapp-link-dialog-actions"><button type="button" className="secondary-button" onClick={() => setSuccess(false)}>Done</button>{onOpenAgent ? <button type="button" className="primary-button" onClick={() => { setSuccess(false); onOpenAgent(); }}>Open WhatsApp Agent <ArrowUpRight /></button> : <Link className="primary-button" href="/dashboard?tab=whatsapp-agent" onClick={() => setSuccess(false)}>Open WhatsApp Agent <ArrowUpRight /></Link>}</div>
      </section></div>}
    </article>
  );
}
