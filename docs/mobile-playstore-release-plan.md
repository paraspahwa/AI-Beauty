# Mobile Play Store Release Plan

Date: 2026-05-29
Owner: Mobile team
Scope: apps/mobile Android production readiness and Play Store submission

## Target outcome

Ship an Android AAB from the current mobile app, complete policy/compliance checks, and publish via Play Console internal testing before production rollout.

## Status summary

- [x] Baseline audit completed (code + backend compatibility)
- [x] Added Expo peer dependencies required by expo-router
- [x] Added EAS build profile scaffolding
- [x] Added explicit Android package and versionCode
- [x] Clear all expo-doctor blockers
- [~] Verify local Android emulator/device launch end-to-end (build reaches Gradle stages; full launch confirmation pending)
- [x] Create signed production AAB (production cloud build finished)
- [ ] Complete Play Console listing + Data safety + policy declarations
- [ ] Internal test pass and bug triage
- [ ] Production rollout

## Live build status

- Latest EAS Android preview build: https://expo.dev/accounts/paraspahwa/projects/renovaara-mobile/builds/7ca58964-3a4e-48c8-ac9b-3ef1fde6deae
- Preview APK artifact: https://expo.dev/artifacts/eas/goJkND1XivKGwsM3XT5b1o.apk
- Latest EAS Android production build (AAB candidate): https://expo.dev/accounts/paraspahwa/projects/renovaara-mobile/builds/73b6f197-ecc6-4906-b1a8-accbfe1a0433
- Production AAB artifact: https://expo.dev/artifacts/eas/fhKYGFgZiN6AhNyVKtYPsB.aab
- Remote Android credentials are configured and keystore has been created on Expo servers.

## Execution plan

### Phase 1: Tooling and build health

1. Run `npx expo-doctor` and fix all blocking issues.
2. Keep dependency versions aligned with Expo SDK 52.
3. Validate TypeScript with `npm run typecheck`.
4. Validate local native run with `npm run android`.

Exit criteria:
- No critical expo-doctor errors.
- Local Android app launches and can navigate core flows.

### Phase 2: Release config and signing

1. Confirm `app.json` production identifiers:
   - android.package
   - android.versionCode
   - ios.bundleIdentifier
2. Finalize `eas.json` profiles for development, preview, production.
3. Run EAS auth and credentials setup:
   - `npx eas login`
   - `npx eas build:configure`
4. Produce production artifact:
   - `npx eas build -p android --profile production`

Exit criteria:
- Successful production AAB build.
- Build metadata/versioning traceable.

### Phase 3: Product quality gates

1. Run smoke tests on Android emulator and at least one physical device:
   - sign in/out
   - upload selfie (camera + gallery)
   - analyze and open report
   - unlock/check payment handoff return
   - studio actions (makeup, hair, glasses, outfits, colors, canvas)
2. Verify API connectivity against production backend URL.
3. Verify entitlement and report access behavior for free vs paid flows.

Exit criteria:
- No blocker/critical bugs.
- Core journey success on device.

### Phase 4: Play Console readiness

1. Prepare listing content (title, short/full descriptions, screenshots, feature graphic).
2. Complete policy artifacts:
   - privacy policy URL
   - Data safety form
   - camera/photo access declarations
3. Upload AAB to Internal Testing and verify install/upgrade behavior.
4. Rollout strategy:
   - internal -> closed -> production staged rollout.

Exit criteria:
- Internal testing approved.
- All policy checks pass.

## Risk register

- Payment flow depends on browser handoff and deep-link return behavior.
- Direct Supabase reads require strict RLS verification in production.
- App Store metadata and policy forms can delay release if prepared late.

## Immediate next commands

From apps/mobile:

1. `npx expo-doctor`
2. `npm run typecheck`
3. `npm run android`
4. `npx eas build -p android --profile preview`

## Definition of done

Android app is considered release-ready when:
- Builds are reproducible via EAS.
- Internal testing passes with no blocker issues.
- Play Console policy requirements are complete.
- Staged production rollout is approved.
