# Flutter production roadmap

Flutter is now the primary mobile direction. Existing Supabase data, migrations, RLS, invitation RPCs and notification queue are retained. The React/Capacitor client remains available during the migration; its previous tests do not certify the new Flutter client.

| Phase | Native implementation | Remaining acceptance requirements |
| --- | --- | --- |
| 1 — App foundation, identity and linking | Android/iOS Flutter projects; cream/rose design and bundled Quicksand; public-only configuration; OS secure session/PKCE storage; email/password sign-in, confirmation and recovery screens; profile setup; expiring one-use invitations through existing RPCs; account/session routing and logout | Install on devices; email delivery and callback allowlist/flows; session restore/refresh and secure storage across upgrades; Google OAuth; secure Universal/App Links; account deletion |
| 2 — Shared core | Realtime text chat, retained drafts and retry IDs, cursor history; shared events and notes; private photo viewing with expiring URLs; native keyboard-aware navigation | Photo picking/upload and deletion; memory pagination; month-scoped calendar/history, editing/recurrence/timezones; read receipts/typing/attachments; reconnection and two-device acceptance tests |
| 3 — Push | Existing Supabase token/queue/Edge-worker backend retained | Provision Firebase apps; integrate Flutter `firebase_messaging`; opt-in/opt-out, token rotation, logout cleanup and deep links; scheduler; foreground/background/terminated delivery on Android and iOS. Firebase is exclusively the push transport |
| 4 — Remaining features | Existing Supabase wellbeing schema retained | Port moods, consent-controlled cycle sharing, milestones and rewards; define challenges/themes; authenticated server AI gateway; export/retention/privacy controls |
| 5 — Release | ARM64 Android debug build workflow; iOS project and callbacks; backups disabled on Android; TLS required; release no longer defaults to debug signing | Native app icons/splash polish across platforms; physical devices; accessibility and performance/battery checks; crash/error reporting; release certificates/store assets; iOS build on macOS; security review and full release acceptance |

The current Flutter widget tests cover invalid credentials/confirmation feedback, profile transitions, invitation validation, retry IDs, event/note submissions and logout overlay removal. Layout checks exercise a phone-sized screen, larger text and keyboard insets. The real local Supabase/Dart test covers password login, linking/replay rejection, Realtime chat, duplicate-send handling, event mutation, saved notes and anonymous denial. Temporary local test accounts/data are cleaned up.

Screenshots are rendered by Flutter's test engine with real fonts. They are not evidence of an app installed on a device. The Android APK is a debug test artifact. No frontend, store release or environment publication is authorized by these checks.

## Validation recorded on 4 November 2026

- `flutter analyze --no-pub`: no issues.
- Native UI/config/layout suite with screenshot capture enabled: 11 tests passed.
- Actual Dart/Supabase integration suite: 1 test passed; temporary local accounts/data removed.
- Final Android ARM64 debug compilation passed. APK identity is `com.aura.couples`, version `0.1.0+1`, minimum Android API 24, target API 36.
- Packaged Flutter engine, font and hosted public connection settings were checked. No server-key, PAT or Gemini-key values matching their credential formats were found in the Dart kernel. This limited artifact check is not a full security audit.
- No physical device, emulator, iOS build or FCM delivery was tested; no publication occurred.
