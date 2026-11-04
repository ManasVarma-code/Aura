# Aura for Android and iOS

This is Aura's Flutter client. It renders native Flutter widgets and communicates directly with the existing Supabase backend. It does not load the React application in a WebView. The previous web/Capacitor client remains at the repository root during migration.

The first native phase includes email/password authentication, email confirmation and recovery screens, profile setup, secure partner invitations, a four-tab shell, Realtime text chat with retry IDs and earlier history, shared event creation/removal, saved notes, and private memory-photo viewing. Tokens and PKCE verifiers use OS secure storage. Quicksand is bundled with its OFL license.

## Toolchain and configuration

Use Flutter **3.47.9**, Dart **3.13.7**, JDK 21, Android SDK 36, NDK 28.2.13676358 and the committed `pubspec.lock`. The cloud SDK is installed at `/workspace/.flutter-sdk`; its framework revision is `c197ca5199e9ee5661e865596c9c07294dfab51c`. No emulator or physical device was attached. iOS builds require macOS/Xcode and Apple signing.

From this directory:

```sh
flutter pub get
node tool/configure.mjs
flutter run --dart-define-from-file=config/supabase.local.json
```

The configuration helper reuses the root's existing public Supabase URL/publishable key. It requires the existing Node/Vite dependencies (`npm ci` at the repository root). It writes an ignored local file containing only those two public values. Server secrets and Gemini credentials are never copied into the Flutter app. These public settings are included in the binary, as required by Supabase's client SDK; RLS remains the authorization boundary.

For a new deployment, supply the two equivalent `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` Dart defines securely through your build system. The app rejects missing settings, HTTP endpoints and secret keys. HTTPS is required. The real hosted backend is not changed by building the client.

## Validation

```sh
flutter analyze
flutter test test/app_test.dart test/layout_test.dart
node tool/test_backend.mjs
flutter test --dart-define=CAPTURE_NATIVE=true test/layout_test.dart
```

The API test requires the existing isolated local Supabase stack (`npm run backend:start` at the repository root). Its runner verifies the local target, creates temporary confirmed accounts, supplies only test credentials to Flutter, then removes their accounts and shared data. It never points the integration test at the hosted project. The widget suite uses a repository fake; the API test uses the actual Dart Supabase implementation. Screenshot output goes to ignored `build/screenshots/`; it is rendered by Flutter's test engine, not photographed from a phone.

For a cloud Android test build:

```sh
python3 tool/build_android.py
```

This helper uses the existing Android/JDK paths, respects the environment's outbound proxy, and preserves TLS verification with the configured CA trust. For ordinary local development, use:

```sh
flutter build apk --debug --target-platform android-arm64 --dart-define-from-file=config/supabase.local.json
```

Output: `build/app/outputs/flutter-apk/app-debug.apk`. This is an ARM64 **debug test build**, not a signed production release. Android package and iOS bundle ID: `com.aura.couples`. Configure your own release signing before distributing a release; release builds no longer silently use a debug certificate.

## Release requirements

The Flutter client is an initial migration phase, not production certification. See [the Flutter roadmap](../docs/FLUTTER_ROADMAP.md).

Email confirmation and password-recovery links use `com.aura.couples://auth/callback`. Add this exact redirect URL in Supabase Auth settings before email-link/device testing. The client restricts auth deep links to that scheme, host and path. Universal/App Links should replace custom-scheme redirects for public release. Google OAuth is not presented until its native flow is configured and tested.

Firebase will be used exclusively for FCM push. Native FCM SDK registration and delivery are pending Firebase provisioning; this Flutter build does not claim to receive push notifications. Supabase remains the backend for identity, data, storage and the existing private push queue. AI calls require an authenticated server endpoint; the existing Gemini configuration is unchanged and no Gemini key is shipped in this client.
