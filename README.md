# Aura

A private space for couples. **Flutter is now the primary mobile client**, in [`mobile/`](mobile/README.md). Supabase provides authentication, database, Realtime and private photo storage. Firebase is reserved **only for Firebase Cloud Messaging**.

The first Flutter phase includes native auth/linking, chat, shared plans and memories. See the [Flutter production roadmap](docs/FLUTTER_ROADMAP.md) for implemented work and release requirements. The existing React/Vite/Capacitor client below remains available during migration.

## Development

Use Node.js 24 (Node 22.12+ is also supported) and npm. Use the existing checkout; a cloud task is already isolated and does not need a Git worktree.

```sh
npm ci
npm run backend:start
npm run dev:local
```

The local backend uses Docker. `backend:start` starts the development Supabase stack and verifies database, Auth, storage and Realtime health. Some container image probes use BusyBox wget, which sends even loopback requests through the cloud proxy despite `NO_PROXY`; the script checks their actual local endpoints instead. It does not disable outbound TLS verification. Docker credentials and proxy configuration are preserved.

`dev:local` reads **only local** Supabase status and supplies the browser-safe project URL/key to Vite for that process. No admin key enters the browser. It does not change existing environment variables or write credentials into the repository. Test accounts can sign up through the local Auth UI. Local email delivery is captured by the local mail service; it is not production SMTP.

The connected Supabase project has all five Aura migrations installed. Hosted password sign-in, profile setup, partner linking, Realtime chat, shared notes and outsider isolation were verified with temporary accounts that were cleaned up. The generated `preview/Aura-connected.html` has been verified against that backend in Chromium. An embedded viewer still requires permission to reach Supabase; see the download guidance below. No app or environment has been published.

For a hosted project, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` securely, apply the migrations, and use `npm run dev`. The existing Gemini configuration is retained. A missing backend displays a configuration notice and never enables simulated authentication. Previous `aura_user` localStorage records are not real accounts and are not trusted.

## Validation

```sh
npm run typecheck
npm run build
npm run test:backend
npm run test:worker
AURA_TEST_SUPABASE=1 npm run test:e2e
```

Backend tests create and clean up accounts in the **isolated local stack only**. They check authentication, RLS, invitation expiry/replay/rate limits/concurrency, Realtime delivery, shared calendar data, private photo access, cycle-sharing consent, moods, rewards and notification queue authorization.

Browser tests run on desktop and mobile viewports. They exercise real local authentication and two independent partner sessions. Gemini responses are mocked only in these UI tests; they do not validate AI output or consume live Gemini quota. Browser artifacts go to ignored `test-results/`.

To check the optimized production bundle against the same local backend:

```sh
npm run build:local
AURA_TEST_SUPABASE=1 AURA_E2E_PREVIEW=1 npm run test:e2e
```

`build:local` produces a development artifact containing the local backend URL. Rebuild with the intended hosted project configuration before any deployment.

## Opening Aura in ChatGPT’s visualization viewer

The source `index.html` needs Vite to compile TypeScript and resolve imports. Opening that source file directly in the visualization viewer does not start the application.

```sh
npm run build:preview
npm run test:preview
```

Open the generated `preview/Aura.html` in the viewer. It contains the compiled React UI, CSS and fonts in one file and works without adjacent files, network access or browser storage. The export intentionally contains no backend configuration or Gemini credential; it is an offline UI preview. Real authentication, AI and notifications require the running application. Existing application environment settings are unchanged.

The offline preview tests exercise desktop/mobile rendering and UI interaction, including an opaque-origin sandboxed iframe with networking disabled. Regenerate previews after UI changes; generated output is ignored by Git.

To use your configured Supabase backend in the viewer:

```sh
npm run build:connected-preview
```

Open `preview/Aura-connected.html`. This export includes only the public Supabase URL/key. It does not include Gemini keys, server secrets or Firebase settings. It uses in-memory authentication and routing; sessions end on reload. Form actions stay inside JavaScript because viewers may block native HTML form navigation. Input colors explicitly retain Aura’s light palette. Google OAuth, password-recovery callbacks, notifications and live AI require the running app rather than the embedded preview.

The connected preview now uses a public metadata-only readiness RPC that returns HTTP 200, instead of relying on an intentionally denied table request. Private table access remains protected. Embedded environments without `AbortSignal.timeout` are supported, and detected `connect-src` restrictions produce explicit viewer-policy guidance.

If the ChatGPT visualization cannot reach Supabase and offers no network-access control, use the viewer’s download button and open the standalone HTML in an approved browser with network access. Aura cannot change the viewer’s CSP or organization policy. No proxy or policy bypass is included. The backend can be healthy even when an embedded viewer cannot reach it.

The connected preview checks database readiness before allowing account creation. If setup is pending, apply the schema as described in `docs/PRODUCTION.md` and choose **Check Again**. No fake authentication is enabled.

For isolated local connected-preview tests:

```sh
node scripts/local-command.mjs run build:connected-preview
AURA_TEST_SUPABASE=1 npm run test:preview
# Restore the artifact to your configured hosted project after testing:
npm run build:connected-preview
```

These checks cover real local signup, password sign-in, profile setup, logout, partner chat and memories without storage or native form submission. They do not create hosted users or send production confirmation emails.

## Mobile

Android and iOS Capacitor projects retain the same React UI. Tailwind CSS and Quicksand fonts are bundled locally.

```sh
npm run mobile:sync
npm run mobile:android
# On macOS with Xcode:
npm run mobile:ios
```

The cloud environment has a verified JDK 21 and Android API 36 SDK under `/workspace`. `python scripts/build-android.py` builds the Android debug APK using the managed proxy and trusted CA store. The Gradle distribution has an official SHA-256 checksum pinned in its wrapper configuration. A debug build is not a signed release or a real-device test.

See [production setup and release requirements](docs/PRODUCTION.md) and the [phase-by-phase roadmap](docs/ROADMAP.md). No environment or application is published by these scripts.
