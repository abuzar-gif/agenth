# Credential-dependent integration checks

These checks are not marked passed until performed with authorized test accounts.

- [ ] Google login: test consent, rejection, logout, expired state, duplicate-email linking protections and HTTPS redirect URLs.
- [ ] SMTP: receive magic link, reject expired/reused token and invalid email.
- [ ] Local Ollama: install a real model, ask in each supported language, inspect actual plan/result, verify token counts and model-unavailable behavior.
- [ ] Gmail: connect one test mailbox, search, read a thread, draft with approval, reject a send, approve one test send, verify it in Sent, reply with correct headers, modify a label, revoke scope, reconnect and disconnect.
- [ ] Contacts: connect read-only access, search known contacts, confirm ambiguity produces clarification rather than guessed recipients.
- [ ] Calendar: list test events, inspect time zones, reject/approve one invite, verify actual event and attendee notification. Do not invite real third parties in tests.
- [ ] WhatsApp Business: verify Phone Number ID, reject invalid token, configure signature-verified webhook, receive one test message, search received messages, reject send, approve a single test reply, confirm provider message ID and delivery status separately. Attachment URLs must be authorized public test files.
- [ ] Personal WhatsApp: local visible Chromium, real QR scan, manual control only, return control, encrypted session recovery, explicit logout in WhatsApp and Linked devices.
- [ ] Schedules: one-time execution, recurring cron in Asia/Karachi, restart before due time, paused schedule, cancellation, future outgoing approval still required.
- [ ] Voice: microphone allow/deny, English, Urdu, Roman Urdu, installed voices, repeat and stop on target Chrome/Edge and mobile browser.
- [ ] Public HTTPS: get approval, start actual tunnel, configure origins and OAuth callbacks, verify from another device, test authenticated polling/live activity, stop tunnel after teacher review.
- [ ] Production security: dedicated browser network boundary, quotas, distributed rate limits, TLS, backups, connector revocation and delete-account flow after all operations end.

Unsupported pending integrations: personal-account API automation, eligible WhatsApp Groups API, telephone/WhatsApp calling, arbitrary publishing platforms, remote browser input/video streaming, push notifications.
