# ElevenLabs voice integration

## Paste credentials here

`C:\Users\Its Me\Desktop\agent-h\.env.local`

Replace only `ENTER_YOUR_API_KEY_HERE` and `ENTER_YOUR_VOICE_ID_HERE` with your own values. Keep:

```env
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
VOICE_PROVIDER=elevenlabs
```

The file is ignored by Git. Existing `.env` and `.env.local` variables were preserved. No secret uses a `NEXT_PUBLIC_` prefix or is returned to the browser.

After saving, restart the server. From the project directory in PowerShell:

```powershell
.\Restart-AgentH.ps1
```

No rebuild is needed just to replace these private runtime credentials. If running `npm run dev` manually, stop and restart that terminal instead.

Open Settings → Selected voice connection → Refresh status → Check connection → Test Voice. Connection checks verify selected voice metadata, do not synthesize speech, and need appropriate voice-read permission on the key. Test Voice generates speech and uses your ElevenLabs allowance. Stop playback or mute to interrupt. Actual `onplaying` drives the speaking orb; decoding/network waiting shows preparing/buffering rather than fake speech.

## Pipeline and controls

Microphone → authenticated local Whisper transcription → local Ollama/Qwen3 → authenticated backend ElevenLabs SDK stream → audio playback. No Qwen3/OpenAI provider changes. Existing video orbs are preserved.

Chat has an opt-in “Voice conversation” checkbox that sends a completed recording’s transcript and speaks the generated reply. Without it, the recording fills the text box for review. Voice input stops existing speech for interruption. Autoplay, volume, global mute, stop, expand and manual Listen use the same shared voice service. Onboarding, Chief results and bots already call that service and therefore use the configured selected ElevenLabs voice.

MP3 is proxied as a streaming backend response. Browsers with MP3 MediaSource support play incrementally; other browsers buffer the same provider’s audio before playback. There is no automatic local or browser-TTS fallback. Native browser autoplay/audio permissions still apply. Recording needs HTTPS or localhost.

To explicitly use the existing local MMS speech service instead, set `VOICE_PROVIDER=local` and restart. This is a deliberate operator choice, never an automatic response to an ElevenLabs error. The optional local voice selector is inactive for ElevenLabs; speed, volume and autoplay apply to the selected service. ElevenLabs speed is clamped to 0.7–1.2.

## Language limits

English is supported by the requested Multilingual v2 model. ElevenLabs does not list Urdu among that model’s 29 supported languages. Urdu and Roman Urdu synthesis are passed faithfully, with a visible best-effort warning; Pakistani pronunciation cannot be certified without your chosen voice and real listening. No model, language or provider is silently substituted. You can deliberately change the environment model to one your account supports with Urdu coverage, then restart and test.

Official references: [streaming API](https://elevenlabs.io/docs/api-reference/text-to-speech/stream), [model language support](https://elevenlabs.io/docs/help-center/other/what-languages-do-you-support), [official Node SDK](https://github.com/elevenlabs/elevenlabs-js).

## Security and failures

Existing account authentication, same-origin checks and per-user ownership remain. Speech adds a per-user request limit, bounded text/audio size, provider timeouts, no automatic billable retries, cancellation forwarding and redacted authorization/quota/network errors. Requests use only the official SDK endpoint. Provider credentials stay on the server. Speech text goes to ElevenLabs when selected; microphone recognition and Qwen3 reasoning stay local.

## Verification

Initial implementation tests ran before credentials were supplied. After the user supplied credentials, real metadata and synthesis requests were attempted; see the live-check section below. Backend tests use mocked HTTP through the real SDK. Browser voice tests use a clearly labeled synthetic MP3 fixture only inside Playwright, never in the production speech endpoint. Real selected-voice quality/pronunciation require provider access to succeed. Physical iPhone/Android microphone/playback still need device testing.

Implementation: `src/lib/elevenlabs.ts`, `src/lib/client-audio.ts`, voice synthesize/status routes, shared VoicePlayback, VoiceProviderSettings/AISettings, ChatPanel voice-conversation opt-in and the existing local transcription route. Test results are recorded separately from any real provider test.

Current verification: production build and lint passed; 84 backend tests passed (18 new mocked SDK/voice-route cases), with one separate live-Qwen test skipped in this run. Chromium voice-pipeline/media controls and existing responsive/orb workflow passed. No authenticated ElevenLabs connection, selected-voice pronunciation or real account quota was verified.

## Live check after credentials were supplied

The app loaded the user's non-placeholder credentials. Real voice metadata verification returned missing `voices_read` permission (HTTP 401). A short real synthesis request returned HTTP 402 `payment_required`; no audio was generated. This is provider account/selected-voice access, not a missing .env.local placeholder. Enable the necessary account/voice plan access in ElevenLabs or deliberately select a voice available to the account. No payment, plan change or automatic voice/provider substitution was performed. Selected-voice pronunciation remains unverified.

The welcome page now uses only Mute/Unmute, Read aloud, Next, Skip and Speak by yourself, plus Type your answer. Mic permission is requested on Speak by yourself; recognized text is editable before Next. Extra Back/Expand/Stop voice/edit-chip buttons are removed from that page. Saved answers and final review remain.


Latest check after the user upgraded (16 November 2026): real authenticated ElevenLabs synthesis succeeded through AgentH’s backend (HTTP 200, audio/mpeg, 46,019 bytes). The same generated audio was played successfully in the browser and drove the speaking orb; no second generation was made for playback verification. The earlier payment_required blocker is resolved. Voice metadata read permission was not rechecked. English test only; Urdu/Roman Urdu pronunciation remains a separate listening check.
