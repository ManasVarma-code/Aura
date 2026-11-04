# Aura web implementation roadmap

Flutter now leads mobile development. See [FLUTTER_ROADMAP.md](FLUTTER_ROADMAP.md) for the native migration and release gates. The status below describes the earlier React/Capacitor implementation, whose tests do not certify Flutter.

The phase order follows the requested roadmap. No more detailed product specification was available. Supabase is now connected, all five migrations are installed on the hosted project, and the specific hosted smoke checks below passed. “Implemented” does not mean production certification or frontend publication.

| Phase | Implemented and checked | Remaining before completion |
| --- | --- | --- |
| 0 — Rendering | `index.html` loads `index.tsx`; real React mount; route fallback and render error boundary; bundled styling/fonts; TypeScript and production build; desktop/mobile browser flows | Staging deployment/browser matrix |
| 1 — Identity and linking | Supabase Auth SDK integration, profile persistence, email/password login, signup/reset/recovery UI, Google OAuth path, session restoration/logout; RLS; hashed, expiring, atomic invitations with rate limits; race/replay/outsider tests | SMTP and actual email/Google/native callback tests; account deletion and secure native token storage review |
| 2 — Chat | Persisted two-person text chat, authorized Realtime delivery, readiness/reconnect reconciliation, retry IDs and cursor history; two independent browser sessions and database isolation tests, including hosted sign-in/linking/message delivery and outsider checks | Attachments, voice notes, typing/read receipts, rate limiting and real WebRTC calls/TURN infrastructure; call overlay is explicitly a preview |
| 3 — Calendar | Shared persisted events, month-scoped queries, history loading, creation/deletion UI and backend edit permission, Realtime updates; date-plan save path; local-date handling | Editing UX, recurrence, timezone preferences, scheduled reminders and production acceptance tests |
| 4 — Memories | Shared notes and private photo uploads, RLS/storage policies, signed image URLs, pagination and partner-visible updates; database storage access tests, browser note persistence and a hosted shared-note check | Photo-device testing, edits/deletion UX, orphan cleanup, reactions and explicit export/sharing UX |
| 5 — Mobile | Capacitor Android/iOS projects, shared web UI, native OAuth callback handling, safe-area padding, Android SDK/JDK setup and successful debug compilation | Firebase app provisioning, real devices/emulator, signed Android release, Xcode/iOS build and secure native session persistence |
| 6 — Notifications | FCM-only client registration/opt-in/opt-out, foreground banner, background worker and allowlisted links; private device tokens and transactional queue; authenticated Edge worker, leasing/retries and invalid-token cleanup; local policy and worker-auth tests | Firebase project/VAPID/server credentials, scheduler deployment, native provisioning and actual delivery/retry/rotation tests |
| 7 — Remaining features | Persisted daily moods, private-by-default cycle settings with explicit/revocable partner sharing, approximate cycle display, real activity counts and milestone badges; data authorization tests | Full feature specification, challenges/themes/stickers, personalized AI validation, product privacy/retention/export flows, accessibility and release hardening |

## Current test scope

- Backend tests use a real, isolated local Supabase stack. They cover Auth, RLS, linking, Realtime, storage, moods/cycles, rewards and push-queue boundaries.
- Browser tests use two independent real local accounts and cover login/setup/linking, message delivery/history, shared events, persisted memories/moods/cycle settings, unknown routes and logout on desktop and mobile viewports.
- The production browser checks serve the optimized Vite bundle. Gemini is mocked in UI checks; no claim is made about live AI response quality.
- FCM worker tests verify method/authentication rejection and the missing-credential path. No real FCM delivery has been performed.
- Android debug compilation does not prove device behavior. iOS compilation/device testing requires macOS and Apple provisioning.

The connected Supabase project passed hosted password sign-in, profile setup, partner linking, Realtime chat, shared notes and outsider-isolation checks on 2026-11-04. Three temporary test accounts and their app data were cleaned up. Continue with production Auth URLs/email delivery, Google/Firebase configuration and the remaining items phase by phase. Do not publish until release gates in [PRODUCTION.md](PRODUCTION.md) pass.
