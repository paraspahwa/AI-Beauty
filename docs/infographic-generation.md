# Infographic Generation — Developer Guide

Paid beauty reports deliver **seven infographic sections** (six in the main unlock + Style Guide add-on). Generation is split between **auto-queued** jobs (preview + face features) and **user-triggered** jobs (remaining paid sections).

## Section inventory

Defined in `src/lib/ai/infographic-sections.ts` (`BLUEPRINT_SECTIONS`):

| Section ID | Tier | Auto-queued on unlock? | User-triggered? |
|------------|------|------------------------|-----------------|
| `faceFeaturesPreview` | Free (after analyze) | Yes (`ensure-infographics`) | — |
| `faceFeatures` | Paid | Yes (webhook + `ensure-infographics`) | — |
| `skin` | Paid | No | Yes |
| `color` | Paid | No | Yes |
| `hairstyle` | Paid | No | Yes |
| `spectacles` | Paid | No | Yes |
| `hairColor` | Paid | No | Yes |
| `styleGuide` | Add-on (₹99) | Yes (style-guide webhook) | Retry via API |

Manual paid sections are listed in `MANUAL_PAID_INFOGRAPHIC_SECTIONS` (`src/lib/ai/run-analysis-infographics.ts`).

## End-to-end flow

```
POST /api/analyze
  → pipeline completes, report status = ready
  → kickOffPostAnalysisInfographics (preview only)
  → client may call ensure-infographics for missing preview

User pays (report_unlock)
  → webhook: complete_webhook_payment RPC
  → kickOffInfographicSectionInBackground(reportId, "faceFeatures")
  → trigger-previews (legacy hairstyle/glasses/hair-color previews)

User opens report
  → ReportLayout polls while any asset is pending
  → ensure-infographics (idempotent) queues preview + faceFeatures if missing
  → AnalysisSectionCard shows "Generate …" for skin/color/hairstyle/spectacles/hairColor

User taps Generate
  → POST /api/reports/[id]/generate-infographic { section }
  → kickOffInfographicSectionInBackground → /api/internal/trigger-infographics

Style Guide add-on
  → upload body image → pay style_guide_addon
  → webhook: complete_style_guide_webhook_payment
  → kickOffStyleGuideInfographicInBackground
  → runStyleGuideAnalysis then runStyleGuideInfographic (FAL gpt-image-2/edit)
```

## API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/reports/[id]/ensure-infographics` | Session | Idempotent queue for preview + `faceFeatures` only |
| `POST /api/reports/[id]/generate-infographic` | Session | User starts one manual paid section |
| `POST /api/reports/[id]/retry-infographic` | Session | Re-fire a failed paid section |
| `POST /api/reports/[id]/retry-style-guide` | Session | Re-fire Style Guide infographic |
| `POST /api/internal/trigger-infographics` | `INTERNAL_API_SECRET` | Background worker (one section per request) |
| `POST /api/internal/trigger-style-guide` | `INTERNAL_API_SECRET` | Style Guide background worker |

`generate-infographic` validates `section` with `isManualPaidInfographicSection()` and requires premium access (`is_paid` or admin allowlist).

## Core modules

| Module | Role |
|--------|------|
| `src/lib/ai/kickoff-infographics.ts` | `scheduleInternalPost` wrappers — never blocks on FAL |
| `src/lib/ai/ensure-infographics.ts` | `ensureReportInfographicsQueued()` — preview + faceFeatures only |
| `src/lib/ai/run-analysis-infographics.ts` | `runSinglePaidInfographic`, `runFaceFeaturesPreviewInfographic`, status helpers |
| `src/lib/ai/run-style-guide-infographic.ts` | `styleGuideNeedsGeneration`, `runStyleGuideInfographic` |
| `src/lib/ai/generate-analysis-infographic.ts` | FAL image edit per section |
| `src/components/report/AnalysisSectionCard.tsx` | Paid-section UI: generate / pending / ready / retry |
| `src/components/report/StyleGuideSection.tsx` | 3-step add-on: upload → pay → generate |

## Asset storage

Infographic metadata is stored on `reports.visual_assets` (JSON). Images live in the private `selfies` bucket at paths computed by `analysis-infographics.ts` (`analysisInfographicStoragePath`, `styleGuideInfographicStoragePath`).

Statuses per asset: `missing` → `pending` → `ready` | `failed`.

## Style Guide add-on UX

`StyleGuideSection` uses a 3-step flow (copy uses "Personal Style Board"):

1. **Upload** full-body photo → `POST /api/reports/[id]/body-image` (requires main report unlock)
2. **Pay** → `StyleGuidePaywall` with `product: style_guide_addon`
3. **Generate** — webhook kicks off `trigger-style-guide`; UI polls every 5s while `pending`

`paymentInitiated && !isPaid && bodyUploaded` shows a waiting state only when the body photo is already uploaded (avoids false "payment received" before upload).

Generation gate: `styleGuideNeedsGeneration()` requires `is_style_guide_paid`, `body_image_path`, pipeline outputs (`face_shape`, `color_analysis`, `features`), and no concurrent `pending` asset.

## Vault integration

`src/lib/vault/compile-vault.ts` signs URLs for ready infographics with bounded concurrency (`SIGN_URL_CONCURRENCY = 24`, `VAULT_REPORT_LIMIT = 100`). Vault items appear as infographics complete — manual generation means vault fills progressively as users generate sections.

## Testing

| Test file | Covers |
|-----------|--------|
| `src/lib/ai/run-analysis-infographics.test.ts` | Paid section generation helpers |
| `src/lib/ai/run-style-guide-infographic.test.ts` | `styleGuideNeedsGeneration` gates |
| `src/lib/ai/run-style-guide-analysis.test.ts` | Style guide text analysis |
| `src/lib/ai/pipeline.test.ts` | Pipeline stages including style guide data |

Run: `npm test`

## Operational notes

- **FAL required:** All image infographics need `FAL_KEY`. Missing key throws before queueing.
- **Webhook does not queue all six:** Only `faceFeatures` auto-starts on unlock. Do not reintroduce `kickOffInfographicsInBackground` for all sections without revisiting UX and cost controls.
- **PDF download:** `PdfDownloadShare` on the report header is disabled while `infographicPending` — users may have only generated a subset of sections.
- **Admin bypass:** `hasPremiumAccess` treats admin allowlist emails as paid for generation gates.

## Common pitfalls

- Assuming all six paid infographics generate on payment — users must tap **Generate** per section (except face features).
- Calling `kickOffInfographicsInBackground` from the webhook — current code intentionally queues only `faceFeatures`.
- Style Guide before main unlock — `body-image` route rejects if `is_paid` is false.
- Confusing `faceFeaturesPreview` (free) with `faceFeatures` (paid full board) in storage paths and UI.
