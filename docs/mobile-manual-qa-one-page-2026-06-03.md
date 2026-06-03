# Mobile QA One-Page Tester Sheet

Date: 2026-06-03
App: Renovaara Mobile
Primary setup guide: [docs/mobile-android-studio-step-by-step.md](docs/mobile-android-studio-step-by-step.md)
Full checklist: [docs/mobile-manual-qa-checklist-2026-06-03.md](docs/mobile-manual-qa-checklist-2026-06-03.md)

## Quick Start (5 min)

1. Start web backend:

```bash
npm run dev
```

2. Ensure mobile env is set in [apps/mobile/.env.local](apps/mobile/.env.local):

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

3. Start emulator (Android Studio Device Manager).
4. Launch app:

```bash
npm --prefix apps/mobile run android
```

## Smoke Flow (15-20 min)

### 1) Auth
- Sign in (Account tab)
- App restart keeps session
- Sign out/in works

Result: Pass / Fail

### 2) Home -> Analyze -> Report
- Choose intent (Complete Analysis / Studio Pro)
- Pick selfie
- Reach analysis screen
- Auto-navigate to report

Result: Pass / Fail

### 3) Report Tabs (must all open)
- Face
- Skin
- Hair
- Glasses
- Studio
- Shop

Checks:
- No crash on any tab
- Lock states are clear for unpaid report
- Unlocked data visible for paid report

Result: Pass / Fail

### 4) Studio Tools
- Makeup (custom + inspo)
- Hair (custom + inspo)
- Glasses try-on
- Outfits generate
- Color swatches generate/retry

Result: Pass / Fail

### 5) Payment Recovery UX
- Trigger unlock flow
- Browser handoff and return
- Use refresh/retry buttons in report/account
- Unlock state refreshes correctly

Result: Pass / Fail

### 6) Chat + Extras
- Chat send/response
- Style DNA page opens
- Progress page opens

Result: Pass / Fail

## Security Spot Checks (5 min)

1. Stop backend and trigger action -> verify readable timeout/error (no stack dump).
2. Try invalid image file -> verify safe validation message.
3. Confirm no secrets printed in UI.

Result: Pass / Fail

## Final Gate

- Crashes observed: Yes / No
- Blockers: Yes / No
- Ready for broader testing: Yes / No

Notes:
- 
- 
- 
