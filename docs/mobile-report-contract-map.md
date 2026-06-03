# Mobile Report Contract Map

Date: 2026-06-03

Purpose: MP1-1 field audit between mobile types and `GET /api/reports/[id]` payload.

## Sources Audited

- `src/app/api/reports/[id]/route.ts`
- `src/types/report.ts`
- `src/app/report/[id]/page.tsx`
- `apps/mobile/lib/api.ts`

## Verified Payload Coverage

`MobileReport` now includes all Phase 1 report fields used by web and mobile parity screens:

- Core: `id`, `userId`, `status`, `isPaid`, `imageUrl`, `createdAt`, `shareToken`, `summary`, `detectedGender`
- Entitlement: `studioEntitlement`
- Analysis sections: `faceShape`, `colorAnalysis`, `skinAnalysis`, `features`, `glasses`, `hairstyle`
- Visuals: `visualAssets.assets.landmarkOverlay`, `paletteBoard`, `glassesPreviews`, `hairstylePreviews`, `colorSwatchPreviews`, `makeupPreviews`
- Meta: `pipelineMeta`, `faceLandmarks`

## Mobile Type Widening Applied

Updated `apps/mobile/lib/api.ts` to avoid dropping server payload fields:

- `MobileColorAnalysis`: added `clothingObservation`
- `MobileSkinAnalysis`: added `imageConfidence` and `routine` union
- `MobileGlasses`: added `avoid` and `colors`
- `MobileHairstyle`: widened `colors` and added `stylingTips`, `hairType`
- `MobileVisualAsset`: added optional `error`
- `MobileReport`: added `userId`, `detectedGender`, `pipelineMeta`

## Backend Follow-up Required?

No backend schema/API change is required for MP1 visual rendering.

Reason: web and mobile both consume the same report route, and visual assets are already resolved with signed URLs in `resolveVisualAssets()` in `src/app/api/reports/[id]/route.ts`.
