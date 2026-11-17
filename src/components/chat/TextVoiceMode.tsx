'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, LoaderCircle, Mic, MicOff, PhoneOff, SendHorizontal, X } from 'lucide-react';
import VoiceEyesOrb from '@/components/ai/VoiceEyesOrb';
import './text-voice-mode.css';

type Phase = 'idle' | 'requesting' | 'listening' | 'transcribing' | 'thinking' | 'responding' | 'done' | 'error';

export type TextVoiceModeProps = {
  open: boolean;
  onClose: () => void;
  language: string;
  /** Resolves after the real conversation response finishes; reject on failure. */
  onSubmit: (transcript: string) => Promise<void>;
  response: string;
  busy: boolean;
  requestError?: string;
};

const phaseLabels: Record<Phase, string> = {
  idle: 'Microphone paused',
  requesting: 'Opening your microphone…',
  listening: 'Listening to you',
  transcribing: 'Transcribing your words…',
  thinking: 'AgentH is thinking',
  responding: 'Writing your response',
  done: 'Response complete',
  error: 'Needs your attention',
};

/** A separate, text-response voice session. It never requests speech synthesis. */
export default function TextVoiceMode({ open, onClose, language, onSubmit, response, busy, requestError = '' }: TextVoiceModeProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [manualOnly, setManualOnly] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [mounted, setMounted] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const recording = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const detectionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcription = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const submissionPending = useRef(false);
  const submittedInSession = useRef(false);
  const opening = useRef(false);
  const session = useRef({ open, muted: false, language, onSubmit, onClose, busy, requestError });
  useLayoutEffect(() => {
    session.current = { open, muted, language, onSubmit, onClose, busy, requestError };
  }, [open, muted, language, onSubmit, onClose, busy, requestError]);
  const startRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => { setMounted(true); }, []);

  const releaseCapture = useCallback(() => {
    if (detectionTimer.current) clearInterval(detectionTimer.current);
    if (limitTimer.current) clearTimeout(limitTimer.current);
    detectionTimer.current = null;
    limitTimer.current = null;
    const recorder = recording.current;
    recording.current = null;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    const context = audioContext.current;
    audioContext.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }, []);

  const cancelCapture = useCallback(() => {
    generation.current += 1;
    opening.current = false;
    releaseCapture();
    transcription.current?.abort();
    transcription.current = null;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = null;
  }, [releaseCapture]);

  const finishUtterance = useCallback(() => {
    const recorder = recording.current;
    if (recorder?.state === 'recording') recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (!session.current.open || session.current.muted || session.current.busy || submissionPending.current || opening.current || recording.current) return;
    const currentGeneration = ++generation.current;
    const isCurrent = () => currentGeneration === generation.current && session.current.open && !session.current.muted;
    opening.current = true;
    setError('');
    setTranscript('');
    setAmplitude(0);
    setPhase('requesting');
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('This browser cannot record audio here. Use HTTPS or localhost, or continue in text chat.');
      const settings: { microphoneId?: string } = await fetch('/api/settings').then(result => result.ok ? result.json() : {}).catch(() => ({}));
      if (!isCurrent()) return;
      const nextStream = await navigator.mediaDevices.getUserMedia({ audio: settings.microphoneId ? { deviceId: { ideal: settings.microphoneId }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true } });
      if (!isCurrent()) { nextStream.getTracks().forEach(track => track.stop()); return; }
      stream.current = nextStream;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(nextStream, mime ? { mimeType: mime } : undefined);
      recording.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        if (!isCurrent()) return;
        releaseCapture();
        setAmplitude(0);
        if (!chunks.length) { setError('No audio was captured. Unmute to try again.'); setMuted(true); setPhase('error'); return; }
        submissionPending.current = true;
        setPhase('transcribing');
        const controller = new AbortController();
        transcription.current = controller;
        try {
          const form = new FormData();
          form.append('audio', new Blob(chunks, { type: recorder.mimeType }), recorder.mimeType.includes('mp4') ? 'utterance.mp4' : 'utterance.webm');
          form.append('language', session.current.language);
          const result = await fetch('/api/voice/transcribe', { method: 'POST', body: form, signal: controller.signal });
          const data = await result.json().catch(() => ({}));
          if (!result.ok) throw new Error(data.error || 'Speech recognition is unavailable. Check the local speech worker or use text chat.');
          if (!isCurrent()) return;
          const words = typeof data.text === 'string' ? data.text.trim() : '';
          if (!words) throw new Error('No speech was detected. Unmute and try again, or use text chat.');
          setTranscript(words);
          setPhase('thinking');
          submittedInSession.current = true;
          await session.current.onSubmit(words);
          if (!isCurrent()) return;
          if (session.current.requestError) throw new Error(session.current.requestError);
          setPhase('done');
          // Success is set only after the response promise resolves. This delay
          // gives the confirmed result a brief visible state before listening.
          resumeTimer.current = setTimeout(() => {
            resumeTimer.current = null;
            if (isCurrent() && !session.current.busy) void startRef.current();
          }, 900);
        } catch (caught) {
          if (!isCurrent() || controller.signal.aborted) return;
          setError(caught instanceof Error ? caught.message : 'Voice request failed.');
          setMuted(true);
          setPhase('error');
        } finally {
          if (transcription.current === controller) transcription.current = null;
          submissionPending.current = false;
          // A quick mute/unmute or reopen may happen while the previous local
          // transcription is aborting. Resume only after its cleanup finishes.
          if (!isCurrent() && session.current.open && !session.current.muted && !session.current.busy) void startRef.current();
        }
      };
      recorder.onerror = () => {
        if (!isCurrent()) return;
        cancelCapture();
        setError('Recording stopped unexpectedly. Unmute to try again.');
        setMuted(true);
        setPhase('error');
      };
      recorder.start(200);
      opening.current = false;
      setPhase('listening');
      setManualOnly(true);
      try {
        if (window.AudioContext) {
          const context = new AudioContext();
          audioContext.current = context;
          await context.resume();
          if (!isCurrent()) return;
          const analyser = context.createAnalyser();
          analyser.fftSize = 512;
          context.createMediaStreamSource(nextStream).connect(analyser);
          const values = new Uint8Array(analyser.fftSize);
          const began = performance.now();
          let lastSpeech = began;
          let voicedSamples = 0;
          setManualOnly(false);
          detectionTimer.current = setInterval(() => {
            if (!isCurrent() || recorder.state !== 'recording') return;
            analyser.getByteTimeDomainData(values);
            let sum = 0;
            for (const value of values) sum += ((value - 128) / 128) ** 2;
            const rms = Math.sqrt(sum / values.length);
            setAmplitude(Math.min(1, rms * 12));
            const now = performance.now();
            if (rms > 0.018) { lastSpeech = now; voicedSamples += 1; }
            if (voicedSamples >= 3 && now - lastSpeech > 1400 && now - began > 1000) finishUtterance();
            if (voicedSamples < 3 && now - began > 15_000) {
              cancelCapture();
              setAmplitude(0);
              setMuted(true);
              setPhase('idle');
              setError('No speech heard. Unmute to try again; you can also use Finish speaking.');
            }
          }, 120);
        }
      } catch {
        // A recorder still works without Web Audio silence detection.
        if (isCurrent()) setManualOnly(true);
      }
      if (isCurrent()) limitTimer.current = setTimeout(finishUtterance, 45_000);
    } catch (caught) {
      if (!isCurrent()) return;
      releaseCapture();
      setError(caught instanceof Error ? caught.message : 'Microphone permission was denied.');
      setMuted(true);
      setPhase('error');
    } finally {
      if (currentGeneration === generation.current) opening.current = false;
    }
  }, [cancelCapture, finishUtterance, releaseCapture]);
  useLayoutEffect(() => { startRef.current = start; }, [start]);

  useEffect(() => {
    if (!open) return;
    setMuted(false);
    session.current.muted = false;
    setError('');
    setTranscript('');
    submittedInSession.current = false;
    void startRef.current();
    return () => { cancelCapture(); };
  }, [open, cancelCapture]);

  useEffect(() => {
    if (!open || muted || !busy || !submissionPending.current) return;
    setPhase(response ? 'responding' : 'thinking');
  }, [open, muted, busy, response]);

  useEffect(() => {
    if (open && !busy && !muted && phase === 'idle') void startRef.current();
  }, [open, busy, muted, phase]);

  useEffect(() => {
    if (!open || !requestError || !submittedInSession.current) return;
    cancelCapture();
    setAmplitude(0);
    setMuted(true);
    setError(requestError);
    setPhase('error');
  }, [open, requestError, cancelCapture]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); cancelCapture(); session.current.onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), [tabindex="0"]');
      if (!controls?.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, mounted, cancelCapture]);

  function toggleMute() {
    if (muted) {
      setMuted(false);
      session.current.muted = false;
      void startRef.current();
    } else {
      setMuted(true);
      session.current.muted = true;
      cancelCapture();
      setAmplitude(0);
      setPhase('idle');
    }
  }

  if (!open || !mounted) return null;
  const orbState = phase === 'error' ? 'error' : muted ? 'idle' : phase === 'listening' ? 'listening' : phase === 'responding' ? 'responding' : phase === 'thinking' || phase === 'transcribing' ? 'thinking' : phase === 'done' ? 'done' : 'idle';
  const canListen = !busy && !['transcribing', 'thinking', 'responding'].includes(phase);
  return createPortal(
    <div className="text-voice-mode" role="dialog" aria-modal="true" aria-labelledby="text-voice-title" aria-describedby="text-voice-description" ref={dialog} tabIndex={-1}>
      <header className="text-voice-header"><div><span className="text-voice-eyebrow">AGENTH · VOICE MODE</span><h1 id="text-voice-title">Speak naturally. Read the reply.</h1><p id="text-voice-description">Your conversation continues here with text responses.</p></div><button type="button" className="text-voice-icon" aria-label="End voice mode" title="End voice mode" onClick={() => { cancelCapture(); onClose(); }}><X /></button></header>
      <main className="text-voice-content">
        <div className="text-voice-orb"><VoiceEyesOrb size={340} state={orbState} amplitude={amplitude} /><span className={`text-voice-status text-voice-status--${phase}`} role="status">{['requesting', 'transcribing', 'thinking', 'responding'].includes(phase) ? <LoaderCircle className="text-voice-spin" /> : phase === 'done' ? <Check /> : muted ? <MicOff /> : <Mic />}{phaseLabels[phase]}</span></div>
        <section className="text-voice-conversation" aria-label="Voice conversation">
          {transcript && <div className="text-voice-transcript"><span>You said</span><p dir="auto">{transcript}</p></div>}
          <div className="text-voice-response" aria-live="polite" aria-busy={busy}>{response ? <p dir="auto">{response}</p> : <p className="text-voice-placeholder">{phase === 'listening' ? 'I’m listening. What would you like to do?' : 'Your next answer will appear here.'}</p>}</div>
          {error && <p className="text-voice-error" role="alert">{error}</p>}
        </section>
      </main>
      <footer className="text-voice-footer"><p>{phase === 'listening' ? manualOnly ? 'Tap Finish speaking when you’re ready.' : 'Pause after speaking, or tap Finish speaking.' : busy ? 'Your answer will appear as text. Microphone is paused.' : 'No generated speech. No voice-generation credits.'}</p><div className="text-voice-controls"><button type="button" className={`text-voice-control ${muted ? 'is-muted' : ''}`} onClick={toggleMute} disabled={muted && !canListen} aria-pressed={muted} title={muted ? 'Unmute microphone' : 'Mute microphone'}>{muted ? <MicOff /> : <Mic />}<span>{muted ? 'Unmute' : 'Mute'}</span></button>{phase === 'listening' && <button type="button" className="text-voice-finish" onClick={finishUtterance}><SendHorizontal /><span>Finish speaking</span></button>}<button type="button" className="text-voice-end" onClick={() => { cancelCapture(); onClose(); }}><PhoneOff /><span>End</span></button></div></footer>
    </div>, document.body,
  );
}
