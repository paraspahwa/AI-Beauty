# Mobile Android Smoke Check (2026-06-03)

Environment
- Device: Pixel_6_api34_std emulator
- Build command: `npm --prefix apps/mobile run android`
- Result: APK built, installed, app launched, Metro connected

## Startup / Runtime

- [x] Android build succeeds
- [x] Development client deep link opens app
- [x] Metro bundle completes without route export warnings
- [x] No TypeScript diagnostics in edited mobile files

## Feature Area Smoke Coverage

- [x] Home intent flow is wired through to analyze request payload (`intent` field)
- [x] Report screen renders via extracted section components (face/skin/glasses/hair/studio/shop)
- [x] Section-level premium lock controls remain present
- [x] Checkout recovery actions available in report and account surfaces
- [x] Visual asset sections use guarded rendering + empty states

## Security / Resilience Checks

- [x] Mobile API client request timeout enforced (30s)
- [x] Mobile API errors sanitized before surfacing to UI
- [x] Analyze route origin/referer trust gate added for CSRF-style mitigation

## Dependency Security Snapshot

- Web audit (`npm audit --omit=dev --audit-level=high`): no high findings; only moderate Next/PostCSS transitive advisory remains
- Mobile audit (`npm --prefix apps/mobile audit --omit=dev --audit-level=high`): high transitive advisories in Expo toolchain dependencies; auto-fix requires major Expo upgrade (`--force`) and should be handled in dedicated upgrade track

## Notes

- Components were moved out of `apps/mobile/app/report/_components` to `apps/mobile/components/report` because Expo Router treated files under `app/**` as routes and emitted runtime warnings.
