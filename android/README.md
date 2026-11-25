# CONNECT Android — native client (development branch)

**Status: pre-release / not installable yet.** This is a native Android project, not a WebView, TWA or PWA wrapper. Do not replace the published web app or distribute this build until the release gates below pass.

## Build manually

- Android Studio with Android SDK Platform 35, build tools 34.0.0, JDK 17.
- Android Gradle Plugin 8.7.3, Gradle 8.9; min Android 8 (API 26).
- Open the `android/` directory as a Gradle project. With Gradle 8.9 installed, run `gradle :app:assembleDebug :app:lintDebug` from this directory. Debug APK path: `app/build/outputs/apk/debug/app-debug.apk` after successful build.
- Debug APK is for testing only. Generate a signed release APK in Android Studio via Build > Generate Signed App Bundle / APK. Keep the release keystore outside GitHub, back it up securely and reuse it for updates. Increase versionCode for each release.
- Application ID: `com.connect.community` (choose a final unique identifier before the first signed release).

## Integration

Uses the existing Supabase HTTPS APIs and the existing **publishable** key, with server RLS and RPC authorization. The session is encrypted using AES-GCM and Android Keystore; no passwords or refresh tokens in navigation preferences. The native app does not use WebView. The external browser is used only for the genuine Turnstile security challenge, legal documents, web-based password recovery and WhatsApp purchase. The CAPTCHA page must be hosted at the authorized domain before testing auth. Its callback is bound to a random in-memory nonce, valid for five minutes; no password or session token is passed to the browser. The CAPTCHA token is still validated by Supabase. A verified Android App Link is recommended before production, rather than relying on a custom scheme.

Implemented source: native account forms, registration resume via server, legal consent, profile creation, manual Premium offer/free completion, persistent session/navigation, text feed and likes, global room text, permanent conversations and text send, text matchmaking and cancellation, notifications/official notices, online directory, settings/theme. The backend remains shared, including server-side retention and quota.

## Required before publication

- Compile, lint and run on Android 8+ and recent Android devices; test keyboard/insets, light/dark, relaunch and revoked sessions.
- Host the isolated CAPTCHA page at the authorized origin and verify challenge return, sign-up/email confirmation, login, token rotation, registration expiration and plan completion.
- Test with two separate test accounts; verify security, RLS, mandatory notices, moderation, conversations, quotas, cancellation races, expiry and no duplicates. Use a test environment where possible.
- Complete parity: Realtime and reconnection for conversations and rooms, LiveKit calls/lives, stories, uploads/crop/compression/media retention, location filters, follows/requests, reporting/blocking, public profile links, notification delivery/read cursors, support, preference synchronization and all other existing product features. Current screen implementation is an early native client, not a complete replacement.
- Verify remaining backend behavior, release signing, package ID and update compatibility.
- Only after an explicitly authorized release: publish the CAPTCHA assets and signed APK; update the staged installation page with the real verified HTTPS APK link and version. Keep the site/admin available.

## Release policy

The Android source is kept on `android-native` pending review. No GitHub Actions workflow is added or edited. Do not dispatch builds or publish updates automatically when code changes. Build and publish only after explicit user request. Existing GitHub Actions settings are not changed by this project.
