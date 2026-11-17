# WhatsApp — one isolated, connection-created agent

Updated 16 November 2026. This supersedes the earlier shared-access design.

## User flow

Open Connected apps → WhatsApp · link your phone → Connect WhatsApp. Review consent and the unofficial-client notice. Continue to Connect shows the genuine, refreshed QR emitted by WhatsApp. On your phone open WhatsApp → Settings (iPhone) or ⋮ menu (Android) → Linked devices → Link a device, then scan it.

Alternatively select Link with phone number instead. Enter your full international number without `+`, then Get pairing code. On the phone open Linked devices → Link a device → Link with phone number instead, and enter the actual code shown in AgentH. English/Roman Urdu instructions are provided. Codes expire and the backend must confirm the authenticated connection; displaying a QR/code alone never creates an agent or reports connection success.

Only after WhatsApp confirms socket `open`, AgentH creates one server-managed WhatsApp Agent. Its description is in English and Roman Urdu. Open that agent to give text/voice commands, search permitted newly received messages/contacts, or prepare an exact-recipient text send/reply. Review and approve the final recipient and content before sending. Ambiguous contact searches stop for clarification.

## Isolation

- Chief, Researcher, Scheduler and custom agents cannot access WhatsApp tools. General task/chat planning excludes WhatsApp. The tool executor requires the matching authenticated owner’s dedicated managed-agent ID and permission.
- Managed agents cannot be created/spoofed through the custom-agent API. One unique managed WhatsApp agent per user; no agent before verified connection.
- General browser agents are blocked from WhatsApp Web, including redirects and WebSockets. The old manual-browser WhatsApp card is removed so it cannot bypass this boundary.
- Explicit disconnect immediately removes agent access. The persistent worker logs out, deletes local credentials/Signal keys/contacts/messages, and reconnects saved authorized sessions after restarts. In-flight sends can already have reached WhatsApp; inspect the actual result before retrying.

## Connection methods

The personal linked-device connector uses Baileys `7.0.0-rc14`, an unofficial community client, not a Meta-endorsed API. WhatsApp can restrict unofficial clients; the connection dialog discloses this before consent. QR and phone codes come from the active real socket, never invented examples. Four active sessions maximum on this laptop; login requests are rate-limited.

The existing official WhatsApp Business Cloud API is retained as a separate connector. Its phone-number resource is verified before creating the same isolated WhatsApp Agent. Only one Business/linked connection is allowed at a time. Business receiving still requires Meta app credentials and a signed public HTTPS webhook. No public tunnel has been opened.

## Security and data

Custom PostgreSQL-backed auth state encrypts credentials and Signal keys with authenticated encryption and preserves binary serialization. QR/code values, contacts, message payloads and outgoing-send records are encrypted. Owner-scoped queries and worker leases isolate accounts. Full-history sync is disabled; only permitted received/updated contacts/messages are available. Disappearing/view-once messages are not retained; deletions remove stored messages. Groups, bulk messaging, calls and linked-device media sends are not enabled.

Each outgoing operation records durable intent first, then the actual provider response. Accepted/submitted results are separate from delivery/read confirmation. A repeated operation returns its saved result, or stops on a prior pending/uncertain attempt; mutations are never automatically retried. No automatic incoming reply rule is enabled just by linking. Incoming message text is untrusted data, never owner authorization.

## Verification

A real unpaired WhatsApp socket returned a genuine QR on 16 November 2026. The check proved no agent was created before pairing. Its temporary test user/session was deleted; no phone was paired and no message was sent. Evidence: `.runtime/verification/whatsapp-real-qr.json`.

Backend tests cover actor isolation, another user’s agent, stale sessions, consent permissions, encrypted binary keys, durable outgoing deduplication, QR/phone readiness events, connection-only agent creation, disconnect, browser bypass blocking and database approval gates. Provider events and phone codes in unit/UI tests are explicitly mocked, not proof of a live paired account.

The final real-phone scan, phone-code pairing, reconnect and actual approved send/reply remain to be verified with the owner’s phone and an explicitly authorized recipient/message. Do not claim full live WhatsApp completion before that check.

Key files: `whatsapp-agent.ts`, `whatsapp-auth.ts`, `whatsapp-runtime.ts`, dedicated linked/agent API routes, worker integration, executor scope checks, `WhatsAppLinkedConnect.tsx` and `WhatsAppAgentPanel.tsx`.

References: [Baileys connecting](https://github.com/WhiskeySockets/baileys.wiki-site/blob/main/docs/socket/connecting.md), [database-backed session guidance](https://github.com/WhiskeySockets/docs/blob/main/authentication/session-management.mdx), [unofficial-client disclaimer](https://github.com/WhiskeySockets/Baileys#disclaimer).

## 16 November 2026 — isolated WhatsApp Agent and welcome fixes
Welcome read-aloud defaults ON, persists per user and speaks each new question subject to browser audio permission. Blank Next is rejected on client and server; explicit Skip remains available.
WhatsApp now has QR/phone linking and one server-managed WhatsApp Agent created only after verified connection, with English/Roman Urdu description and its own command screen. General/custom agents and general browser automation cannot access WhatsApp. Sends retain exact recipient/message approval and durable retry protection. Disconnect removes access and erases local credentials; if remote logout cannot be confirmed, revoke the device in the phone's Linked devices screen too.
Final checks: 107 backend tests passed, 1 live-AI test skipped; browser regression 7 passed, 1 live-AI test skipped. Actual authenticated API generated a genuine WhatsApp QR, proved no agent before pairing and completed disconnect. Evidence: .runtime/verification/whatsapp-api-qr.json. No phone paired or real message sent; owner-phone pairing/reconnect and approved send/reply remain unverified. Personal linking uses the disclosed unofficial Baileys client.


## 16 November 2026 — WhatsApp usability, contacts and voice credits
- QR/phone-code loading appears immediately and disappears only when the actual code is available; includes reduced-motion support.
- Fixed same-tab Next.js navigation by keeping the workspace tab synchronized with URL query changes. Browser tests click success-dialog, connected-card and My Agents links.
- Connected apps shows one WhatsApp & WhatsApp Business phone-linking card; the separate official Cloud API card is hidden. Existing account/session data is preserved.
- Contact bootstrap stores encrypted contacts only with consent; historical message payloads are not imported into the message store. Current permitted incoming messages remain available. Contact search works independently of incoming-message consent, asks clarification for ambiguous names and retains exact-recipient send approval. Manage permissions updates the dedicated agent without unlinking; revoking contact/read consent erases respective cached data. Only synced contacts are searchable, not a guaranteed complete phone address book.
- Read-aloud, Listen and reply autoplay removed from chat/Chief/agents/settings. Client playback accepts speech only on Welcome and stops on navigation. Local microphone transcription remains available. Browser tests verify no speech calls outside Welcome.
- ChatAnywhere key is now present locally. Real gpt-4o-mini CLI response, authenticated chat UI streaming/persistence and native plan_task tool calling verified. Evidence: .runtime/verification/chatanywhere-live.json and chatanywhere-plan.json. No WhatsApp test messages sent.
- Backend regression 123 passed / 1 explicit live-AI test skipped; four focused browser cases passed (voice restriction, welcome autoplay, compact controls, WhatsApp loading/navigation). Final production build and lint passed. Restarted app HTTP 200, worker heartbeat fresh and existing WhatsApp session reconnected with a fresh heartbeat. Frontend bundle scan confirmed no configured ChatAnywhere key is present. Evidence: .runtime/verification/final-health.json.
