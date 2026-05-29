# Mobile Internal Testing Runbook (Play Console)

Date: 2026-05-29
App: Renovaara Mobile
Package: com.paraspahwa.renovaaramobile

## Build inputs

- Production AAB: https://expo.dev/artifacts/eas/fhKYGFgZiN6AhNyVKtYPsB.aab
- Production build logs: https://expo.dev/accounts/paraspahwa/projects/renovaara-mobile/builds/73b6f197-ecc6-4906-b1a8-accbfe1a0433
- Preview APK (optional direct install): https://expo.dev/artifacts/eas/goJkND1XivKGwsM3XT5b1o.apk

## Prerequisites

- Google Play Console app entry created for package `com.paraspahwa.renovaaramobile`.
- Privacy policy page is live and publicly reachable.
- Store listing text and graphics prepared.
- Suggested listing copy source: `docs/mobile-play-listing-copy.md`.

## Step-by-step Play Console flow

1. Go to Play Console -> your app -> Testing -> Internal testing.
2. Create a new release and upload the production AAB.
3. Add release notes for this build (versionCode 2).
4. Save and review release.
5. Add testers via email list or Google Group.
6. Roll out to Internal testing.
7. Open the opt-in link from tester devices and install.

## Mandatory policy/forms before rollout approval

1. App content -> Privacy policy
   - Set your public privacy URL (recommended endpoint: your web app `/privacy` page).
2. App content -> Data safety
   - Suggested pre-fill source: `docs/mobile-play-data-safety-guide.md`.
   - Declare account/authentication data handling.
   - Declare camera and photo/media access usage.
3. App content -> Content rating
   - Complete questionnaire and submit rating.
4. App content -> Target audience and ads declaration
   - Select audience and indicate ad presence accurately.

## Suggested listing assets check

- App icon 512x512: candidate exists at `public/web-app-manifest-512x512.png`.
- Feature graphic 1024x500: verify dedicated Play graphic is available (not confirmed in repo).
- Phone screenshots: capture from the installed internal-test build on Android.

## Internal smoke test checklist (must pass)

- Gesture-by-gesture device script: `docs/mobile-gesture-manual-checklist.md`
- Fast smoke (15 min): `docs/mobile-gesture-fast-smoke.md`
- Full regression (45-60 min): `docs/mobile-gesture-full-regression.md`
- Printable tester sheet (1-page): `docs/mobile-gesture-tester-sheet.md`

## Auth
- Sign in works
- Sign out works
- Session persistence works after app restart

## Upload + analysis
- Camera capture works
- Gallery pick works
- Analysis completes to report ready state

## Report + payment
- Report sections render without crash
- Share flow works
- Checkout browser handoff and return works
- Entitlement updates after return

## Studio
- Makeup generation
- Hair generation
- Glasses generation
- Outfit generation
- Color swatch generation/retry
- Canvas upload/generate/share
- Vault preview/filter/delete

## Exit criteria for moving beyond Internal

- No blocker defects across smoke checklist.
- Crash-free basic usage across at least one emulator and one physical Android device.
- Data safety and policy declarations accepted by Play Console.

## Post-internal path

1. Promote to Closed testing.
2. Run staged percentage rollout to Production.
3. Monitor crash and ANR metrics before 100% rollout.
