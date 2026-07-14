# Renovaara Mobile (Expo)

Report-only mobile client mirroring the web **Atelier Dossier** experience.

## Tabs

| Tab | Route | Purpose |
|---|---|---|
| Home | `(tabs)/home` | Landing hero, samples, journey, pricing, FAQ |
| Reports | `(tabs)/reports` | Dossier list (Supabase `reports` table) |
| Vault | `(tabs)/vault` | Uploads, infographic boards, PDFs via `GET /api/vault` |
| Account | `(tabs)/account` | Sign in / sign out |

Unauthenticated users are redirected to **Account** (`(tabs)/_layout.tsx`). All other tabs require a session.

## User flow

1. **Home** — marketing landing (shared copy with web)
2. **Upload** — selfie capture → `POST /api/analyze?stream=1` (SSE)
3. **Analysis** — poll until `status === "ready"`
4. **Report** — `ReportLayout`: infographic chapters, unlock paywall, Style Guide add-on
5. **Vault** — browse and delete assets; open linked reports

## Setup

```bash
cd apps/mobile
npm install
```

Required env (`app.config` or `.env`):

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Web app origin; **HTTPS required in production** |
| `EXPO_PUBLIC_SUPABASE_URL` | Same project as web |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same anon key as web |

`getValidatedMobileApiBaseUrl()` in `lib/env.ts` enforces HTTPS and blocks localhost outside `__DEV__`.

## Commands

```bash
npm run start      # Expo dev server
npm run typecheck  # TypeScript (also run in CI)
npm run android    # Native Android build
```

## Shared monorepo code

Metro resolves `@web/*` → `../../src/*` (`metro.config.js`). Common imports:

- `@web/types/report` — `CompiledReport`, infographic types
- `@web/lib/report/journey-hints` — next-step hints on report screen
- `@web/content/home-content.json` — landing copy (via `lib/home-content.ts`)
- `@web/lib/ai/infographic-sections` — section IDs for retry/generate calls

Do not duplicate business logic in mobile; extend web `src/lib` and import.

## API layer (`lib/api.ts`)

Thin authenticated fetch wrapper over web API routes:

| Function | Endpoint |
|---|---|
| `startAnalysisFromSelfie` | `POST /api/analyze` |
| `fetchReport` | `GET /api/reports/[id]` |
| `listReports` | Supabase direct read |
| `createPaymentOrder` | `POST /api/payments/create` |
| `verifyTestPayment` | `POST /api/payments/verify` (test only) |
| `ensureInfographics` | `POST /api/reports/[id]/ensure-infographics` |
| `generateInfographic` / `retryInfographic` | paid section triggers |
| `uploadBodyImage` | Style Guide full-body upload |
| `fetchVault` / `deleteVaultItem` | vault gallery |
| `getAuthPdfUrl` | PDF download with bearer token query |

`MobileReport` is a type alias for `CompiledReport` — no parallel mobile report schema.

## Report UI

`components/report/ReportLayout.tsx` is the main paid/unpaid report surface:

- Scrollable infographic sections via `AnalysisSectionCard`
- `PaywallSheet` / `StyleGuidePaywallSheet` for checkout
- `PdfDownloadBar` for analysis and style-guide PDFs
- Polls `ensureInfographics` when paid sections are missing

Landing components live under `components/home/` (hero, gallery, timeline, pricing, FAQ).

## Design system

`lib/theme.ts` exports `atelier` tokens (parchment, terracotta, espresso). `lib/theme-provider.tsx` loads display/body fonts. UI primitives: `PrimaryButton`, `FoilLabel`, `DossierCard`, `ReportSurfacePanel`, `NextStepHint`.

## Payments

Production: opens web report URL with `?paywall=open` in the device browser; webhook is authoritative unlock.

Test mode: in-app `verifyTestPayment` when API returns `mode: "test"`.

## Related docs

- [docs/landing-page.md](../docs/landing-page.md) — shared homepage content
- [docs/mobile-report-contract-map.md](../docs/mobile-report-contract-map.md) — report API contract
- [docs/mobile-internal-testing-runbook.md](../docs/mobile-internal-testing-runbook.md) — Play Console QA
