# AgentH — Mentor Release Checklist

Local QA: November 17, 2026. This report describes observed tests, not guaranteed production readiness.

## Verified locally

- TypeScript validation: passed.
- Next.js 16.4.6 direct optimized production build: passed (47 static pages/routes generated).
- Vitest: 142 passed, 8 skipped, 0 failures. WhatsApp mock-isolation test corrected; production WhatsApp code unchanged.
- ESLint: 0 errors, 64 warnings (mostly older browser global handlers and some accessibility/performance warnings).
- Isolated Chromium smoke test: passed, covering temporary signup/signin, welcome/profile, V2 dashboard, four built-in agent names, custom Schedule QA Agent creation, duplicate-name rejection, real Chief/Dost/custom chat responses and persistence, schedule rejection for past dates, and read-only WhatsApp status.
- Test cleanup removed its temporary test account. No live external sends or future schedules were created.

## Still needs real deployment verification

- A custom Schedule Agent responding as a scheduler does not prove that it created a persisted schedule. Test the authorized task/schedules workflow separately; no future job was scheduled in this QA.
- Gmail authorization/API read was verified previously. Real sending was not tested and requires explicit approval.
- WhatsApp connection status, unit permissions, mock UI linking, and send deduplication were covered; real linked-device pairing and actual sends were not performed.
- Some old end-to-end visual tests reference the removed purple orb or older layouts, so they need updates before a full E2E green result can be claimed.
- On Windows, an active AgentH process can lock the Prisma query engine and make npm run build fail at prisma generate with EPERM. The direct next build passed using the already generated Prisma client. Stop services before a full rebuild.
- Older README sections describe Ollama-only inference, but current runtime supports the separately configured ChatAnywhere provider; consult CHATANYWHERE_SETUP.md.

## GitHub preparation

- Local Git repo initialized on main. Remote push not yet performed.
- .gitignore excludes .env and .env.* other than .env.example, local runtime/database/session files, node_modules, build outputs, logs and common secret file types.
- Candidate source files: 261, about 66.1 MB. Three public landing videos each measure about 18–23 MB.
- An automated common private-key/API-key pattern scan found no matches. This is not a guarantee; review files before sharing publicly.
- Never commit live OAuth tokens, database, user chats, WhatsApp sessions or real secrets.

## Cloud deployment requirements

1. Create a private GitHub repository initially and confirm its visibility before pushing.
2. Choose a persistent Node/container host capable of running both Next.js web and long-running worker. Static-only hosting does not provide a persistent worker or WhatsApp linked-device state.
3. Set managed PostgreSQL with TLS/backups and configure DATABASE_URL; do not copy local production account data or reset the DB.
4. Keep AUTH_SECRET and TOKEN_ENCRYPTION_KEY stable. Configure AUTH_URL and APP_URL with the real HTTPS domain.
5. In Google Cloud Console, register https://YOUR_DOMAIN/api/connectors/google/callback as an authorized redirect URI.
6. Configure server-side AI provider and other integration credentials via private environment variables; never via NEXT_PUBLIC_ prefixes.
7. Supply secure persistent storage for necessary browser and WhatsApp runtime state, never publish .runtime.
8. Create the mentor account on the deployed service with a secure unique password and permission scope; never store the password in Git.
9. Verify authenticated login, chat, custom agents, actual schedule persistence, Gmail OAuth round-trip, WhatsApp permissions, and approval-gated actions on the final domain.

## Shipping gate

Local TypeScript, unit suite, production Next build and scoped Chromium smoke are PASS. Production-domain OAuth, background scheduling execution, linked WhatsApp pairing and full updated E2E suite are NOT YET VERIFIED.
