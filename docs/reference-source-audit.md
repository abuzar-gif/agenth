# AgentH reference-source audit

## Scope and handling

Two supplied `View Page Source` HTML captures were reviewed as visual and behavioural reference material. They are **not** copied into this repository. Their backend routes, scripts, vendor assets, and any provider-specific assumptions are not treated as available implementation details.

## Verified visual system

| Token | Landing capture | Dashboard capture |
| --- | --- | --- |
| Base surface | `#f7f6f2` / `#f3ede3` | `#faf9f6` |
| Ink | `#0c0b09` / `#18160f` | `#1a1a18` |
| Borders | `rgba(24,22,15,.12)` | `#e8e5dc` |
| Warm accent | `#ffb547` / `#c77400` | black primary controls |
| Positive status | `#5fe39a` | `#31a24c` |
| Display type | Instrument Serif | Fraunces |
| Interface type | Inter | system UI / Segoe UI |
| Utility type | JetBrains Mono | not separately declared |

Observed responsive thresholds: landing at 900px and 560px; dashboard at 900px, 860px, 720px, 700px, 640px, 560px, 480px. The desktop rail scales with `clamp(220px, 20vw, 260px)` in the dashboard capture.

## Visible reference components

- Public nav, hero badge, three CTAs, live desktop illustration, action strip, agent desk grid, shared team chat illustration, control/takeover section, feature list, downloads, final CTA and footer.
- Auth dialog: Google entry, email sign-in/up, password visibility, close affordance and responsive narrow form.
- Workspace: account rail, searchable agent/conversation list, fixed bottom composer, status pill, token toggle, conversation controls, media attachment, dictation state, group chats and task details.
- Connected-apps dialog: category filtering, search, per-provider status and connect/disconnect affordances.
- WhatsApp full-screen view: chat list, selected transcript, connection/setup state and draft/send controls.
- Settings: General, Your information, Computer, Email, Vault, Usage & Billing, Updates.
- Browser/computer view, skills/teach flow, task/to-do view, notification/suggestion UI, media/library and marketplace UI.

## Reference event/API map (reference only)

The source captures call paths under `/dashboard/api/*`, including conversations, groups, upload chunks, transcribe, browser/chromium, connectors, WhatsApp, tasks/todos, settings, usage, vault, notifications, video/media, skills, support calls and billing. It also references OAuth/login/logout endpoints and external OpenAI realtime calls.

AgentH does **not** adopt those paths. Existing implementation routes are under `/api/*` and remain the source of truth. The captures do not prove the private backend semantics, authorization checks, persistence, or provider agreements behind those paths.

## External dependencies absent from captures

- Image files and favicon/logo assets.
- Google Fonts font delivery.
- Service worker/manifest files.
- Vendor dashboard scripts, avatar modules, chat themes and mail client scripts.
- OAuth apps, payment provider, push subscription service, realtime credentials, VM/browser worker and connector credentials.

## Existing AgentH comparison and parity checklist

| Capability | Existing status | Next UI work |
| --- | --- | --- |
| Authenticated sessions and user isolation | Implemented in existing NextAuth/Prisma app | Restyled auth now preserves current credentials flow; browser verification pending. |
| Persistent conversations | Implemented | Match sidebar/message proportions and add only real controls. |
| Task/history API | Implemented | Align task workspace with source hierarchy. |
| WhatsApp linked-device connector | Implemented, external runtime dependent | Preserve; do not claim a connected session without runtime verification. |
| Google connectors | Implemented, credentials dependent | Restyle cards around actual status only. |
| Browser workspace | Implemented, worker dependent | Align preview/control layout and retain honest unavailable state. |
| Notifications/events | Existing events API | Keep event-backed notification center only. |
| Settings | Existing settings route/UI | Expand only supported preferences; unavailable facilities remain explicit. |
| Marketplace/billing | Not verified in current app | Do not implement pricing or purchase claims. |
| Vault/cards | No audited secure card storage | Do not collect payment-card data. |
| Source-specific realtime/VM/media systems | Not established in current app | Not represented as available features. |

## Implementation sequence

1. Dashboard shell, sidebar, chat composer and real status/interaction states.
2. Connected apps, browser and settings surfaces against existing APIs.
3. Public landing and auth visual system.
4. Screenshot comparison at desktop and phone widths, then regression tests.

## Verification boundary

Visual matching is verified only after the local application can be reached by a browser session. Compilation and unit tests do not prove pixel-level equivalence or external-provider availability.
