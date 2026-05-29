# Mobile Play Console Submission Checklist (Android)

Date: 2026-05-29
App: Renovaara Mobile
Package: com.paraspahwa.renovaaramobile

## Build artifacts

- Preview APK (internal): https://expo.dev/artifacts/eas/goJkND1XivKGwsM3XT5b1o.apk
- Production AAB build logs: https://expo.dev/accounts/paraspahwa/projects/renovaara-mobile/builds/73b6f197-ecc6-4906-b1a8-accbfe1a0433
- Production AAB artifact: https://expo.dev/artifacts/eas/fhKYGFgZiN6AhNyVKtYPsB.aab

## Release gates

- [x] EAS project linked and Android credentials configured
- [x] Preview build completed
- [x] Production build completed
- [x] Expo doctor passes (18/18)
- [x] Typecheck passes
- [ ] Device smoke tests completed on emulator + physical Android
- [ ] Play Console listing copy and assets completed
- [ ] Data safety form completed and reviewed
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL verified and accessible
- [ ] Internal testing rollout validated

## Device smoke test matrix

- Tap-by-tap device checklist: `docs/mobile-gesture-manual-checklist.md`
- Fast smoke (15 min): `docs/mobile-gesture-fast-smoke.md`
- Full regression (45-60 min): `docs/mobile-gesture-full-regression.md`
- Printable tester sheet (1-page): `docs/mobile-gesture-tester-sheet.md`

## Account and auth
- [ ] Sign in with valid credentials
- [ ] Sign out and session removal
- [ ] Re-open app and confirm persisted session behavior

## Upload and analysis
- [ ] Camera selfie capture succeeds
- [ ] Gallery photo selection succeeds
- [ ] Analyze request starts and report status transitions to ready

## Report and payment
- [ ] Report sections render without crashes
- [ ] Share flow works
- [ ] Browser handoff for checkout returns correctly
- [ ] Entitlement updates after checkout return

## Studio
- [ ] Makeup generation
- [ ] Hair generation
- [ ] Glasses generation with reference image
- [ ] Outfit generation
- [ ] Color swatch slot generation and retries
- [ ] Canvas upload, generate, and share
- [ ] Vault list, filter, preview, and delete

## Play Console metadata checklist

## Main store listing
- [ ] App name
- [ ] Short description
- [ ] Full description
- [ ] Category selected
- [ ] Contact email
- [ ] Privacy policy URL set

## Store assets
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Minimum 2 phone screenshots
- [ ] Optional 7-inch/10-inch screenshots

## App content and policy declarations

## Data safety
- [ ] Data collection and sharing form filled
- [ ] Account and authentication data declared
- [ ] Device/media permissions justification recorded
- [ ] Responses aligned with `docs/mobile-play-data-safety-guide.md`

## Permissions and access
- [ ] Camera permission explanation aligns with feature behavior
- [ ] Photo/media access explanation aligns with feature behavior
- [x] RECORD_AUDIO permission removed from mobile app config (not required by current feature set)

## Content and audience
- [ ] Target audience set correctly
- [ ] Content rating questionnaire submitted
- [ ] Ads declaration completed

## Release strategy

1. Upload production AAB to Internal testing track.
2. Add internal tester list and distribute.
3. Execute smoke matrix above.
4. Fix blocker issues and upload next build if required.
5. Promote to Closed testing, then staged Production rollout.

## Notes from current codebase

- App uses camera and photo library flows via expo-image-picker.
- App uses Supabase auth with secure session persistence (expo-secure-store).
- Checkout and some payment paths use browser handoff and deep-link return.
