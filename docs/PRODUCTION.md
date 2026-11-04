# Production setup and validation

The Supabase backend is connected and migrated; this is not a production release. On 2026-11-04, initial migrations `202611030001` through `202611030004` were applied to project `ggdoynagtzadjgwehgrd` through Supabase’s HTTPS management API after a read-only schema preflight. All eight Aura tables and migration-history entries were verified. Migration `202611040001` subsequently added the anonymous metadata-only `aura_connection_status()` RPC. Its public API returns HTTP 200/true; anonymous profile reads remain denied.

Hosted browser/API smoke checks passed for password sign-in, automatic profile creation and setup, secure partner linking, Realtime chat, shared memory notes and outsider RLS isolation. Three temporary confirmed test accounts and their app data were removed after validation. Email signup is enabled and email confirmation is required. Google OAuth is currently disabled. Email delivery, recovery callbacks and Google sign-in were not exercised by these confirmed-account tests.

The normal frontend uses the configured public project URL/key in ignored local configuration. Administrative credentials were used only for setup/testing and were not added to frontend code or tracked files. No app or environment was published. Complete the release gates below before publication.

## Supabase

1. Select the intended project. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in environment settings. The older `VITE_SUPABASE_ANON_KEY` name is also accepted. These are browser-safe values; a service-role key must never use a `VITE_` name.
2. Review the migrations in `supabase/migrations` and apply them to a staging project using the Supabase CLI/dashboard. These files have been applied to both the isolated local database and the connected hosted project. Do not reinstall them or reset the hosted database.
3. Configure the Auth Site URL and exact allowed callback URLs. Web callbacks use the page origin/path. Native callbacks use `com.aura.couples://auth/callback` with PKCE. Configure the Google provider in Supabase for Google sign-in; Firebase Authentication is not used.
4. Configure production SMTP and test signup confirmation, password reset, recovery completion, token refresh, logout and revoked/expired sessions. Password sign-in was exercised locally; hosted mail and Google OAuth have not been exercised.
5. Test linking with two real staging accounts and a third outsider. Invitations use 96 bits of randomness, expire after 24 hours, are stored as hashes, and are consumed atomically. Replacing an invitation revokes the previous code. Failed attempts are persisted and limited to ten per fifteen-minute window.
6. Confirm Realtime publication and RLS in staging. The client waits for the PostgreSQL subscription acknowledgement, not only a joined WebSocket, and reconciles on focus/reconnect. Messages and memories use cursor pagination; calendar queries are scoped to the visible month.
7. Keep the `memories` bucket private. Uploads are JPEG/PNG/WebP, limited to 10 MB, and scoped to the authenticated member's directory. Photos use 15-minute signed URLs refreshed by the UI. Treat those URLs as temporary bearer access. Only couple members may read shared data; cycle data additionally requires explicit sharing consent.

For local resets, the CLI can report failure solely because its image health probes traverse the proxy after migrations have successfully applied. Check the reset output and actual service health; restart only the local Realtime container after a reset, wait until it is healthy, and run `npm run test:backend`. Do not assume the schema or replication is ready from a process/port alone.

## Initial installation through the SQL Editor

When the managed environment cannot reach PostgreSQL over TCP, generate the initial installer with `npm run db:bundle` and run `supabase/install-aura.sql` in the intended project's Supabase SQL Editor. This is an alternative to applying the same migrations with the CLI, not an extra step after CLI installation.

The regenerated installer includes all five migrations and runs in one transaction, refuses existing Aura tables or an existing `private` schema, checks Supabase prerequisites, and records each applied migration in the CLI-compatible migration-history table. If a preflight fails, stop and inspect the project; do not remove the guard or drop existing data. The original four-migration installer was verified locally in a rollback-only transaction and then applied to the connected hosted project through the management API. The fifth readiness migration was applied separately to both local and hosted databases; the hosted anonymous health RPC returns HTTP 200 with `true`. The regenerated five-migration installer is for new projects. Re-running it against this installed project is intentionally refused.

Browser configuration must use `VITE_SUPABASE_PUBLISHABLE_KEY` (prefix `sb_publishable_`) or the legacy anon JWT. A key beginning with `sb_secret_` or a legacy service-role JWT is privileged server configuration. Vite now rejects those values in browser variables before it can produce a bundle, without printing the values in the error. `npm run test:config` exercises that guard. Keep live values in ignored local environment files or secure environment settings, not committed source or SQL.

## Firebase Cloud Messaging

Firebase is exclusively the push transport. Auth, chat, files, calendar and application data remain in Supabase. There are no public FCM topics or client-accessible token lists.

Configure the browser-safe `VITE_FIREBASE_*` fields listed in `.env.example`, including a web VAPID public key. Web push needs HTTPS (loopback is permitted for development), notification permission, a supported browser and the bundled messaging service worker. Users opt in from Settings. Foreground messages show an in-app banner; background messages show a generic notification with an allowlisted deep link. Private message text and cycle information are never placed in push payloads.

Configure **server-only** Supabase Edge Function secrets:

- `FCM_SERVICE_ACCOUNT`: Firebase service-account JSON with the Firebase Cloud Messaging API permission for the intended project. Never commit it or expose it through Vite.
- `NOTIFICATION_WORKER_SECRET`: an independent strong scheduler bearer secret.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by the Supabase Edge runtime. They are used only server-side. The function signs a Google OAuth assertion and calls FCM HTTP v1; no second push provider is used.

Deploy `supabase/functions/deliver-notifications` only after staging review. Its Supabase JWT gate is disabled deliberately because it checks the dedicated scheduler bearer secret itself. Configure an authenticated scheduled POST to the function, with `Authorization: Bearer <worker secret>`. Store that header securely in the scheduler/Vault, never in tracked SQL or browser code. No scheduler has been created by this task.

Message, calendar and memory inserts enqueue private jobs transactionally. Only the service role can lease or finish jobs. Leases, retry backoff, capped attempts, ten-device registration limits and removal of unregistered FCM tokens are implemented. Delivery is at least once; notification tags use job IDs to reduce duplicates. Jobs are not claimed when FCM credentials are missing. Database authorization and worker rejection/configuration paths were tested; actual Google OAuth, FCM delivery, foreground/background reception and delivery retries still require the real Firebase project and devices.

For Android, provide the matching `android/app/google-services.json` securely. For iOS, add `GoogleService-Info.plist` to the App target, set the Apple signing team, verify Push Notifications/background capabilities, and upload the APNs signing key to Firebase. FCM remains the sender on both platforms. These provisioning files are ignored by Git and have not been fabricated. Token auto-initialization is disabled until notification opt-in.

## Release gates

- Rebuild with the hosted Supabase/Firebase configuration; never ship a `build:local` artifact.
- Re-run TypeScript, the production build, backend authorization checks and desktop/mobile browser flows against staging.
- Exercise Google OAuth and recovery on web and native deep links, including a cold-start callback.
- Test two real devices for chat reconnects and foreground/background/terminated-app notifications. Test revocation, token rotation, opt-out and logout.
- Build and sign Android release artifacts. The debug APK was built, but no emulator/device run has been performed. Build and test iOS on macOS/Xcode; Linux cannot validate the iOS project.
- Review the existing Gemini browser integration before public release: Vite currently embeds the configured key in client code. Its existing configuration was not changed. Server-side AI mediation must reuse the already-provided credential through an approved server binding; do not request or commit a replacement key.
- Complete data export/deletion, unlinking and retention policies, private media cleanup, abuse controls, accessibility review, load/reconnect testing, crash monitoring and backups. Live calls, chat media/read receipts, calendar recurrence/reminder scheduling and the remaining feature acceptance criteria are not complete.

Hosted migration and the specific hosted checks above were verified separately from the local suite. Deployment, signing, publication, SMTP delivery and real push delivery remain separate release requirements.
