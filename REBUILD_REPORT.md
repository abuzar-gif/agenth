# AgentH implementation report

Status: local build and core functionality verified. External provider setup and physical-device checks remain as listed below. Updated 15 November 2026, Asia/Karachi.

## Implemented
- Local-only Ollama/Qwen3 backend; installed-model discovery, hardware recommendation, native planning function calls, validated tool execution and explicit mutation approvals. Paid provider routing and API-key fields removed.
- Saved, searchable conversations; streaming responses, stop/regenerate, rename/delete, UTF-8 text attachments and recent-context limits.
- User-supplied looping logo/eyes video orb across landing, authentication, onboarding, sidebar, chat, agents, browser, tasks, settings and loading/error screens. Real Web Audio microphone/playback analysis; honest task and connection states; reduced-motion support.
- Violet/cyan dark landing with working anchors, sign-in navigation, clearly labeled interactive marketing illustration, pricing limits and installable-web-app information.
- Dark responsive dashboard, conversation history, actual profile names, browser/Chief modes, agent management, schedules, activity, settings and usage.
- Dedicated saved `/dashboard/welcome` flow: optional microphone access, three languages, one question at a time, local model acknowledgments, URL checks, back/skip/edit/review, saved progress and completion redirect.
- Free local neural speech worker: English/Urdu MMS synthesis, local Whisper recognition, Roman Urdu spoken normalization through Qwen3, actual recordings, stop/mute and voice settings.
- Existing PostgreSQL/Prisma, Auth.js, OAuth connectors, real Playwright browser tools, encrypted tokens, private files, queue/scheduling and approvals retained.
- SMTP password recovery code, hashed one-time reset tokens and session-version invalidation. PWA manifest/icons and a public offline fallback that caches no authenticated data.

## Verified so far
- 66 unit/real database/browser integration tests passed, plus the separately run real Qwen3 native-planning/browser test.
- Two main Playwright workflows passed: public/auth protection and complete multilingual onboarding, profile persistence, task approvals/rejection, scheduling and mobile overflow check.
- Responsive video-orb/history test passed across desktop/tablet/mobile, including actual local speech playback, real Web Audio amplitude, microphone input, video loop and WhatsApp consent before credentials. The test uses a synthetic microphone only in Playwright, never in production.
- Actual local neural English and Urdu WAVs generated. Actual local Whisper transcript of English test audio: “Hello, your local assistant is ready to help you.”
- Type checking, linting and production build passed. Qwen3 Instruct is downloaded and its local capabilities verified; real native inference/planning/browser verification passed.

## Credentials and approvals still required
- Google OAuth client for sign-in/Gmail/Calendar/Contacts, with matching callback URLs and provider consent/API enablement.
- SMTP credentials for email magic links and password-recovery delivery.
- Authorized WhatsApp Business phone number, token, Meta app secret, signed public webhook and any provider eligibility.
- User approval before publishing a public HTTPS tunnel or making external account changes. No external messages or posts have been sent.
- **No AI API key is required or requested.** Ollama, Qwen3 and the speech models run locally.

## Remaining limits
- Qwen3 4B Instruct is installed and passed real native planning plus Chromium execution/reporting. The test read the actual Example Domain title, with evidence saved in `.runtime/verification/live-qwen-proof.json`. CPU execution is slow under current RAM pressure; the complete live model test took about four minutes.
- Local neural synthesis is sentence/file based rather than real-time streaming audio. Voice quality, Pakistani pronunciation and actual iPhone hardware need human review.
- MMS weights have a non-commercial license; commercial deployment requires suitable rights or a replacement model.
- Personal WhatsApp automation, eligible Groups API, calls, arbitrary social publishing, remote browser video/input streaming and paid billing are not implemented.
- Local manual browser takeover requires visible Chromium. Production hostile-browser isolation, distributed quotas and externally hosted deployment remain unverified.
- Docker is unavailable here; Docker configuration is supplied but not tested. Public HTTPS is not running.

## Run

See README.md for full setup. Normal Windows services:

```powershell
npm ci
npm run setup
npx playwright install chromium
npm run db:local
# Separate terminal:
npm run db:migrate
npm run worker:start
# Separate terminal:
npm run dev
# Local AI and speech, separate processes:
.\.runtime\ollama-cpu\ollama.exe serve
.\.runtime\speech-venv\Scripts\python.exe speech/server.py
```

Production: stop app/worker processes before `npm run build` on Windows so Prisma's loaded DLL is not locked; then `npm run start` and `npm run worker:start`. `Start-AgentH.ps1` provides a local launcher. Never print or share `.env` secrets.

## Environment

DATABASE_URL, AUTH_SECRET, APP_URL/AUTH_URL, TOKEN_ENCRYPTION_KEY; AI_PROVIDER=ollama, OLLAMA_URL=http://localhost:11434, AI_MODEL=auto; LOCAL_SPEECH_URL=http://localhost:8001 and LOCAL_SPEECH_TOKEN; AGENTH_RUNTIME_DIR is an absolute private runtime path written by setup. Optional Google/SMTP/WhatsApp variables are documented in `.env.example`. No paid AI variables are used.

## Test the orb and voice onboarding

Create an account, open `/dashboard/welcome`, press Start and allow or deny the microphone. Type still works. Select English, Urdu or Roman Urdu. Speak using Voice input; listening is shown only during recording and the orb responds to measured microphone samples. Repeat/Listen plays actual neural WAV audio; speaking and amplitude begin only during playback. Mute, stop, expand/close and reduced-motion settings use shared state. Refresh between questions to verify saved progress. Edit answer chips before finishing.

Automated synthetic microphone fixtures exist only inside Playwright tests, never production. Actual device microphone quality is a separate manual check.

## Test browser automation

Start the worker. Open Browser task mode and navigate to https://example.com. Inspect the actual PNG and tool logs. Queue a click/type action and verify it waits for exact approval. Reject it; confirm no tool ran. For local manual takeover, set BROWSER_HEADLESS=false, restart the worker, approve Take Control and interact with its visible Chromium window; return control afterward.

## Automated commands

```powershell
npm run typecheck
npm run lint
npm test
$env:RUN_DB_TESTS='1'; npm test
Remove-Item Env:RUN_DB_TESTS
npm run test:e2e
$env:RUN_LIVE_AI='1'; npm test -- tests/live-ai.test.ts
Remove-Item Env:RUN_LIVE_AI
npm run build
```

## Latest supplied videos and WhatsApp extension

The original CSS sphere was removed. `public/media/logo-orb.mp4` and `eyes-orb.mp4` are optimized copies of the supplied footage (about 1.35 MB and 0.77 MB), H.264, without audio tracks. Brand/landing uses logo; onboarding/chat/fullscreen voice uses eyes. Both loop when visible; reduced-motion preferences pause playback. Violet/cyan typography, neon captions, a typewriter tagline, smooth navigation and responsive dark surfaces match the footage. See `src/styles/orb-theme.css`.

WhatsApp consent, owner-scoped shared registry, permission-filtered planning, bounded received-contact lookup, truthful provider acceptance and automatic connector context were added. See `WHATSAPP_INTEGRATION.md` for setup, files and limits. Live pairing/sending was not tested without credentials. Direct custom-agent sending was rejected by automatic approval review and remains unavailable; existing exact action approvals remain intact.

## Final verification

- Production build, TypeScript and lint passed. PostgreSQL migration deployment has no pending migrations.
- Live Qwen3 native `plan_task` call, actual Chromium navigate/read and model report passed; evidence is `.runtime/verification/live-qwen-proof.json`. The first full-catalog CPU test timed out; production-filtered tools and a compact roster passed.
- Real backend-streamed chat passed, including Latin-script Roman Urdu, database transcript persistence, reopening history and stopping an in-flight generation. The test asserted Roman Urdu words and excluded Arabic/Devanagari script.
- Chromium responsive/orb/voice/consent workflow passed across 390–1920px. Actual neural audio and a synthetic test microphone drove measured Web Audio activity.
- WebKit passed nine widths from 320–1440px with looping muted inline video, no horizontal overflow, no page errors, and reduced-motion pause. Evidence: `.runtime/verification/webkit-proof.json`. Separate real landing-to-login navigation also passed. This is browser-engine emulation, not a physical iPhone or Android test.
- Light-theme desktop/mobile layout check passed; supplied footage sits in a dark voice panel with matching lavender surfaces. Screenshots are in `.runtime/verification/design`.
- App, local Ollama, portable PostgreSQL, background worker and local speech worker were restarted. No public tunnel or external message was sent.

Additional design files: `src/components/ai/GlobalAIOrb.tsx`, `src/components/landing/KineticText.tsx`, `src/styles/ai-orb.css`, `src/styles/orb-theme.css`, supplied optimized video/poster assets under `public/media`, shared layout imports and chat/onboarding/fullscreen placements. The old CSS sphere/fluid layers are removed.

## Superseding voice update — ElevenLabs

The user's later instruction explicitly selected ElevenLabs for TTS. Earlier local-only speech statements in this historical rebuild report are superseded by `ELEVENLABS_SETUP.md`. Qwen3 reasoning and Whisper recognition remain local. ElevenLabs receives speech text only through authenticated backend routes. The supplied logo/eyes video orbs and styling are preserved.

The official Node SDK is installed. Ignored `.env.local` contains the exact key/Voice ID placeholders and requested `eleven_multilingual_v2` model. Shared streaming/buffered playback, actual media-driven speaking/amplitude, interruption, safe errors, connection checks, selected-voice Test Voice, controls and opt-in chat voice conversations are implemented. Existing local MMS speech remains an explicit `VOICE_PROVIDER=local` option; errors never silently switch providers.

83 backend tests passed, including 17 new mocked SDK/voice API cases; existing responsive workflow and mocked browser voice pipeline/media controls passed. These tests do not claim a real authenticated ElevenLabs request or selected-voice pronunciation. Real test awaits the user's credentials. Multilingual v2 does not officially list Urdu. Exact setup and restart instructions are in ELEVENLABS_SETUP.md.

## 16 November 2026 — welcome controls and live credential diagnosis

The welcome flow now has Mute/Unmute, Read aloud, Next, Skip, Speak by yourself and Type your answer. Microphone permission is not requested by Next or typing. Voice recording/transcription blocks Next until a reviewable transcript is ready; typing remains editable. Back, Expand voice, extra stop buttons and editable answer-chip buttons are removed from welcome. Final review supports typed corrections. Microphone denial/mute/unmount cancel pending capture safely.

Credentials were supplied by the user and loaded successfully after restart. Real ElevenLabs voice metadata access returned `voices_read` missing permission. Real synthesis returned HTTP 402 `payment_required`; no real audio was produced. The app now reports these provider causes directly instead of a generic network/setup error. Keys/IDs were never printed, no plan was purchased, and no provider/voice was substituted.

84 backend tests passed; mocked audio/voice-conversation and compact welcome microphone/typing tests passed. Final full browser regression passed: 5 tests passed, 1 explicit live-Qwen case skipped in this run. Full multilingual onboarding, persistence, task approvals/schedules, compact microphone/typing controls and mocked streaming/buffered voice playback passed.


Latest check after the user upgraded (16 November 2026): real authenticated ElevenLabs synthesis succeeded through AgentH’s backend (HTTP 200, audio/mpeg, 46,019 bytes). The same generated audio was played successfully in the browser and drove the speaking orb; no second generation was made for playback verification. The earlier payment_required blocker is resolved. Voice metadata read permission was not rechecked. English test only; Urdu/Roman Urdu pronunciation remains a separate listening check.

## 16 November 2026 — isolated WhatsApp Agent and welcome fixes
Welcome read-aloud defaults ON, persists per user and speaks each new question subject to browser audio permission. Blank Next is rejected on client and server; explicit Skip remains available.
WhatsApp now has QR/phone linking and one server-managed WhatsApp Agent created only after verified connection, with English/Roman Urdu description and its own command screen. General/custom agents and general browser automation cannot access WhatsApp. Sends retain exact recipient/message approval and durable retry protection. Disconnect removes access and erases local credentials; if remote logout cannot be confirmed, revoke the device in the phone's Linked devices screen too.
Final checks: 107 backend tests passed, 1 live-AI test skipped; browser regression 7 passed, 1 live-AI test skipped. Actual authenticated API generated a genuine WhatsApp QR, proved no agent before pairing and completed disconnect. Evidence: .runtime/verification/whatsapp-api-qr.json. No phone paired or real message sent; owner-phone pairing/reconnect and approved send/reply remain unverified. Personal linking uses the disclosed unofficial Baileys client.


## 16 November 2026 — ChatAnywhere backend
Added explicit AI_PROVIDER=chatanywhere with backend-only CHATANYWHERE_API_KEY, fixed https://api.chatanywhere.org/v1 endpoint and gpt-4o-mini. Existing chat streams real provider text through authenticated routes; task planning uses validated tool arguments and unchanged execution permissions. Ollama remains an explicit optional provider, never an automatic fallback. Worker now loads .env.local with Next environment precedence. Preserved CSS, video assets and eyes-orb animation; updated provider wording only. Existing local secrets preserved; ChatAnywhere key blank pending owner entry. Backend regression: 119 passed / 1 explicit live-AI skipped; focused provider suite after response-hardening: 14 passed. Live ChatAnywhere request not verified because no local key is configured. See CHATANYWHERE_SETUP.md.


## 16 November 2026 — WhatsApp usability, contacts and voice credits
- QR/phone-code loading appears immediately and disappears only when the actual code is available; includes reduced-motion support.
- Fixed same-tab Next.js navigation by keeping the workspace tab synchronized with URL query changes. Browser tests click success-dialog, connected-card and My Agents links.
- Connected apps shows one WhatsApp & WhatsApp Business phone-linking card; the separate official Cloud API card is hidden. Existing account/session data is preserved.
- Contact bootstrap stores encrypted contacts only with consent; historical message payloads are not imported into the message store. Current permitted incoming messages remain available. Contact search works independently of incoming-message consent, asks clarification for ambiguous names and retains exact-recipient send approval. Manage permissions updates the dedicated agent without unlinking; revoking contact/read consent erases respective cached data. Only synced contacts are searchable, not a guaranteed complete phone address book.
- Read-aloud, Listen and reply autoplay removed from chat/Chief/agents/settings. Client playback accepts speech only on Welcome and stops on navigation. Local microphone transcription remains available. Browser tests verify no speech calls outside Welcome.
- ChatAnywhere key is now present locally. Real gpt-4o-mini CLI response, authenticated chat UI streaming/persistence and native plan_task tool calling verified. Evidence: .runtime/verification/chatanywhere-live.json and chatanywhere-plan.json. No WhatsApp test messages sent.
- Backend regression 123 passed / 1 explicit live-AI test skipped; four focused browser cases passed (voice restriction, welcome autoplay, compact controls, WhatsApp loading/navigation). Final production build and lint passed. Restarted app HTTP 200, worker heartbeat fresh and existing WhatsApp session reconnected with a fresh heartbeat. Frontend bundle scan confirmed no configured ChatAnywhere key is present. Evidence: .runtime/verification/final-health.json.
