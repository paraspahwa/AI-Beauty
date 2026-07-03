# Renovaara Mobile (Expo)

Report-only mobile client mirroring the web **Atelier Dossier** experience.

## Flow

1. **Home** — landing hero, samples, pricing, FAQ
2. **Upload** — selfie → SSE analyze
3. **Analysis** — poll until ready
4. **Report** — infographic chapters, unlock (browser checkout), Style Guide add-on
5. **Vault** — uploads, boards, PDFs
6. **Reports** — dossier list

## Setup

```bash
cd apps/mobile
npm install
```

Set in `.env` or `app.config`:

- `EXPO_PUBLIC_API_BASE_URL` — web app URL (https in production)
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Commands

```bash
npm run start      # Expo dev server
npm run typecheck  # TypeScript
npm run android    # Native Android build
```

## Shared code

Business logic imports from monorepo `src/` via `@web/*` (journey hints, product copy, report types). Metro resolves `@web` and cross-package `@/` in `metro.config.js`.

## Payments

Production checkout opens the web paywall in the browser (`?paywall=open`). Test mode uses in-app verify.
