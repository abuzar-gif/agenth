# AgentH — laptop-hosted public preview

The public production site runs on **127.0.0.1:3001** and is exposed using a temporary HTTPS Cloudflare Quick Tunnel. Local development remains on **127.0.0.1:3000**. PostgreSQL is on **127.0.0.1:5432** only, and the AgentH worker runs locally.

## Windows auto-start
Windows Startup shortcut/file: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\AgentH Public.cmd`.
On Windows sign-in, it launches `node scripts/public-laptop-manager.cjs` in a minimized command window. The launcher checks local PostgreSQL and worker, creates a fresh Cloudflare tunnel, launches the optimized Next.js production server, and writes the URL to `Desktop\AgentH Public Link.txt` and `.runtime/public-url.txt`.

## Notes
- The laptop must stay powered on, awake, and connected to the internet. Signing out or stopping the processes makes the site unavailable.
- This is a **temporary** `trycloudflare.com` URL, **not a permanent deployment**. The URL may change after a tunnel reconnect or Windows restart. Cloudflare Quick Tunnels have no uptime guarantee.
- For a stable `agenth.net` or `demo.agenth.net` link, set up a named tunnel with DNS access. The existing `agenth.net` hosting and DNS were not modified.
- Google OAuth redirect URIs must be registered for the public hostname in Google Cloud. On a rotating temporary hostname, some **new Google sign-ins and Gmail connection flows may not complete**. Existing authorized Gmail connections may continue working until tokens expire. No code features have been deliberately removed.
- Public visitors can register accounts. Use strong passwords and do not share private account passwords. AgentH's connector actions remain scoped to each authenticated user, with explicit approval for sends.
- Check `.runtime/public-launcher.log` for startup errors. Check `/api/status` after sign-in for service health.
- The production build must exist before auto-start: from the project directory run `node_modules\.bin\next.cmd build` (avoids regeneration conflicts with an active Prisma engine on Windows). Rebuild after code updates.
- `node scripts/public-laptop-manager.cjs --check` validates launcher prerequisites without starting services.

## Public smoke check
`node scripts/public-smoke.cjs` creates a disposable QA account on the current public URL, tests login/dashboard/connector/voice endpoints, and deletes the test account. No messages are sent.
