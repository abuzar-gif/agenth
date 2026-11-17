# AgentH progress — local Ollama/Qwen3 rebuild

Updated 15 November 2026 (Asia/Karachi). This supersedes earlier optional-cloud notes.

## Implemented
- Local-only Ollama + Qwen3; cloud routing and AI API-key settings removed.
- Signed official portable CPU runtime installed; automatic model discovery and hardware recommendation.
- Shared supplied logo/eyes looping video orbs across major routes, linked to actual microphone/playback samples, backend task states, mute and local connection checks.
- Violet/cyan landing and dark dashboard, responsive drawer, saved conversations, streaming/stop/regenerate, attachments and real profile/settings.
- Dedicated saved conversational onboarding with three languages, back/skip/edit/review and local Qwen acknowledgments when available.
- Local neural MMS English/Urdu voice and Whisper recognition, actual recordings, backend-only speech calls and no browser-TTS substitution.
- Existing authentication, PostgreSQL, queue, browser tools, connectors, approvals and schedules retained. SMTP password recovery added.
- PWA icons/manifest and private-data-free offline fallback.

## Passed
- 66 backend/unit/real database/browser tests plus the separately passed live-Qwen native planning/browser test.
- Signup/auth protection, complete multilingual onboarding, saved language, approvals/rejection and scheduling E2E.
- Global orb/history/settings and 1920, 1440, 1366, 1024, 768 and 390px layout checks.
- Actual local English and Urdu neural WAV synthesis; actual local recognition of generated English audio.
- Actual Web Audio playback and synthetic-test-microphone amplitude drive the orb; mute interrupts capture/playback.
- Type checking, lint and final production build passed. Video-loop/voice/consent responsive E2E passed.

## Latest completion
- Real local streaming Roman Urdu chat, saved history and stop-generation browser test passed.
- WebKit video/reduced-motion checks passed at nine widths (320–1440px); light-theme desktop/mobile check passed.
- Local services restored. Full details: REBUILD_REPORT.md and WHATSAPP_INTEGRATION.md.

## Credentials / external approvals
- Google OAuth, SMTP and WhatsApp Business credentials are not supplied; live external consent/messages/webhook checks remain pending.
- No AI API key needed. No paid AI service is used.
- No public URL started; publication needs user confirmation.

## Limits
- MMS neural voice quality/Urdu pronunciation and real iPhone microphone quality need human device review. MMS weights are non-commercial.
- Neural speech is generated sentence/file based, not low-latency streaming synthesis.
- Personal WhatsApp automation, group APIs/calling, arbitrary social publishing and remote browser input/video streaming are unavailable.
- Docker/production hosting and dedicated hostile-browser network isolation are not verified here.

## 16 November — ElevenLabs and compact welcome
- ElevenLabs official SDK/backend streaming, settings/status, selected-voice playback controls and opt-in voice conversations implemented; Qwen3/Whisper remain local.
- 84 backend tests passed; final browser suite: 5 passed, 1 explicit live-Qwen test skipped. Build and lint passed.
- Welcome now uses Mute/Unmute, Read aloud, Next, Skip, Speak by yourself and Type your answer. Mic is requested only by Speak; transcripts can be edited before Next.
- User credentials loaded after restart. Actual provider replies: voices_read missing permission for metadata; HTTP 402 payment_required for synthesis. No real audio generated, no billing/plan change or provider substitution performed. See ELEVENLABS_SETUP.md.


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
