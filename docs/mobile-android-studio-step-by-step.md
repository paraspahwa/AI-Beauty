# Mobile App Run Guide (Android Studio, Step-by-Step)

Date: 2026-06-03
App: Renovaara Mobile
Workspace root: `AI-Beauty`

## 1. Prerequisites

1. Install Node.js LTS (18+ or 20+ recommended).
2. Install Android Studio (latest stable).
3. In Android Studio, install SDK components:
   - Android SDK Platform 34
   - Android SDK Build-Tools
   - Android SDK Command-line Tools (latest)
   - Android Emulator
4. Create an AVD (recommended): `Pixel 6`, API 34, x86_64 image.
5. Ensure Java is available (Android Studio bundles JDK; Expo/Gradle should pick it up).

## 2. Project Setup

From repository root:

```bash
npm install
npm --prefix apps/mobile install
```

## 3. Environment Configuration

Create or update `apps/mobile/.env.local` with:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Notes:
- Use `10.0.2.2` for Android emulator to reach your local web API running on host machine.
- Do not commit secrets.

## 4. Start Web Backend (required)

In terminal A (repo root):

```bash
npm run dev
```

Wait for Next.js server on `http://localhost:3000`.

## 5. Start Android Emulator

1. Open Android Studio.
2. Open Device Manager.
3. Start your AVD (for example `Pixel_6_api34_std`).
4. Keep emulator running.

## 6. Build and Launch Mobile App

In terminal B (repo root):

```bash
npm --prefix apps/mobile run android
```

Expected result:
- Gradle build succeeds.
- APK installs on emulator.
- Dev client opens app.
- Metro starts and bundles JS.

## 7. Useful Development Commands

From repo root:

```bash
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile run start
npm --prefix apps/mobile run android
```

From Metro terminal shortcuts:
- `r`: reload app
- `m`: open dev menu
- `j`: open debugger

## 8. Troubleshooting

### App cannot reach backend

- Confirm web app is running on `localhost:3000`.
- Confirm mobile env uses `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000`.
- Restart Metro after env changes.

### Gradle build issues

- Re-run:

```bash
npm --prefix apps/mobile run android
```

- If needed, clean Android build artifacts:

```bash
cd apps/mobile/android
./gradlew clean
cd ../..
npm --prefix apps/mobile run android
```

### Expo Router warning about missing default export routes

- Keep helper components outside `apps/mobile/app/**` route tree.
- Put reusable UI under `apps/mobile/components/**`.

### Port conflict on Metro (`8081`)

- Stop conflicting process and rerun mobile command.

## 9. Optional: Capture Manual QA Screenshots

While emulator is running and app is open:

```bash
adb devices
adb exec-out screencap -p > screenshot-home.png
```

For logs:

```bash
adb logcat | findstr /I "ReactNativeJS Expo"
```

## 10. Recommended Validation Order

1. Run typechecks (web + mobile).
2. Launch web backend.
3. Launch mobile app on emulator.
4. Execute quick smoke sheet in [docs/mobile-manual-qa-one-page-2026-06-03.md](docs/mobile-manual-qa-one-page-2026-06-03.md).
5. Execute full flow checklist in [docs/mobile-manual-qa-checklist-2026-06-03.md](docs/mobile-manual-qa-checklist-2026-06-03.md).
