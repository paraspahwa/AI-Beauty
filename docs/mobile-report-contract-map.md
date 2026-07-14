# Mobile Report Contract Map

Date: 2026-07-03 (updated)

Purpose: Document how the mobile app consumes the web report API after the report-only refactor.

## Type alignment

`apps/mobile/lib/api.ts` exports:

```ts
export type { CompiledReport as MobileReport };
```

Mobile screens import `CompiledReport` from `@web/types/report` directly. There is **no** parallel `Mobile*` analysis schema — the server payload is used as-is.

## Primary endpoints

| Mobile function | Route | Auth |
|---|---|---|
| `fetchReport(id)` | `GET /api/reports/[id]` | Bearer (Supabase JWT) |
| `listReports()` | Supabase `reports` select | Supabase client |
| `ensureInfographics(id)` | `POST /api/reports/[id]/ensure-infographics` | Bearer |
| `generateInfographic(id, section)` | `POST /api/reports/[id]/generate-infographic` | Bearer |
| `retryInfographic(id, section)` | `POST /api/reports/[id]/retry-infographic` | Bearer |
| `fetchVault()` | `GET /api/vault` | Bearer |

## `CompiledReport` fields used by mobile

### Core

- `id`, `status`, `isPaid`, `isStyleGuidePaid`, `createdAt`, `imageUrl`, `summary`
- `faceShape`, `colorAnalysis`, `skinAnalysis`, `features`, `glasses`, `hairstyle`, `styleGuide`

### Visual assets

Path: `report.visualAssets.assets.analysisInfographics`

| Key | Tier | Notes |
|---|---|---|
| `faceFeaturesPreview` | Free | Shown before unlock |
| `faceFeatures` | Paid | Full face infographic |
| `skin`, `color`, `hairstyle`, `spectacles`, `hairColor` | Paid | Manual-trigger sections (`MANUAL_PAID_INFOGRAPHIC_SECTIONS`) |
| `styleGuide` | Add-on | Requires `isStyleGuidePaid` + `body_image_path` |

Each asset is a `ReportVisualAsset`: `{ status: "missing" \| "pending" \| "ready" \| "failed", url?, error? }`.

`ReportLayout` polls `fetchReport` while any relevant asset is `pending`.

### Skin routine union

`skinAnalysis.routine` may be:

- Legacy: `{ step, product }[]`
- Current: `{ am: [...], pm: [...] }`

Check `!Array.isArray(routine) && "am" in routine` before rendering AM/PM.

## Infographic section IDs

Canonical registry: `src/lib/ai/infographic-sections.ts`.

Paid sections the user can manually generate (not auto-queued on unlock):

`skin`, `color`, `hairstyle`, `spectacles`, `hairColor`

`faceFeaturesPreview` is preview-tier only — `isManualPaidInfographicSection("faceFeaturesPreview")` returns false.

## Backend changes required?

No — mobile and web share `GET /api/reports/[id]` and the same `resolveVisualAssets()` signed-URL logic.

## Removed / obsolete (pre–report-only)

The following are **not** in the current mobile app or API contract:

- `studioEntitlement`, makeup/hair studio previews, chat messages
- `visualAssets.assets.landmarkOverlay`, `paletteBoard`, `makeupPreviews`
- Subscription / Studio Pro billing surfaces

If you encounter these in older docs (`docs/mobile-parity-plan.md`, gesture checklists), treat them as historical.

## Sources

- `src/app/api/reports/[id]/route.ts`
- `src/types/report.ts`
- `apps/mobile/lib/api.ts`
- `apps/mobile/components/report/ReportLayout.tsx`
