# Mobile Studio Parity Plan

Date: 2026-05-26
Scope: Close the remaining mobile-vs-web gaps for Studio features in `apps/mobile`.

## Current State

Mobile Studio is no longer a prototype.

Implemented today:
- Vault browsing, filtering, bulk delete, preview, and report jump in `apps/mobile/app/(tabs)/studio.tsx`
- Makeup generation in `apps/mobile/app/studio/makeup/[id].tsx`
- Hair color generation in `apps/mobile/app/studio/hair/[id].tsx`
- Report share flow and report-to-studio launch in `apps/mobile/app/report/[id].tsx`
- Saved local history and save-to-report behavior in `apps/mobile/lib/studio-history.ts`

Still missing relative to web:
- Glasses try-on flow backed by `src/app/api/reports/[id]/virtual-tryon/route.ts`
- Outfit recommendation and color swatch generation backed by `src/app/api/reports/[id]/outfit-generator/route.ts` and `src/app/api/reports/[id]/visuals/colors/route.ts`
- Standalone Studio Canvas entry and session flow matching `src/app/studio/page.tsx` and `src/app/studio/[canvasId]/page.tsx`
- Native mobile PDF/export handling for Studio-related outputs

## Design Principle

Do not fork Studio business logic into mobile. Reuse the existing web APIs and keep mobile focused on:
- request shaping
- generation progress and recovery UI
- local presentation state
- vault and report integration

## Priority Order

1. Add mobile API wrappers for missing Studio actions
2. Ship mobile glasses try-on
3. Ship mobile outfit and color swatch flows
4. Add standalone mobile Studio Canvas entry
5. Tighten export and cross-surface navigation

## Phase 1: Shared Mobile Studio Plumbing

### Goal

Create the reusable mobile API and navigation surface needed for the missing Studio actions.

### Files to change

- `apps/mobile/lib/api.ts`
- `apps/mobile/app/(tabs)/studio.tsx`
- `apps/mobile/app/report/[id].tsx`
- `apps/mobile/lib/studio-history.ts` if new history kinds are added

### Work

- Add `generateGlassesPreview(reportId, formData)` for `POST /api/reports/[id]/virtual-tryon`
- Add `generateOutfitIdeas(reportId, payload)` for `POST /api/reports/[id]/outfit-generator`
- Add `generateColorSwatchSlot(reportId, slot)` for `POST /api/reports/[id]/visuals/colors?slot=N`
- Add mobile response types for outfit sessions and color swatch progress
- Extend Studio launch affordances in vault and report surfaces so new actions can be opened from the same places as makeup and hair

### Acceptance criteria

- Mobile can call each missing Studio API without ad hoc fetches in screen files
- New Studio actions have typed request and response contracts in `apps/mobile/lib/api.ts`
- Existing report and vault navigation patterns remain unchanged for makeup and hair

## Phase 2: Glasses Try-On On Mobile

### Goal

Expose a new glasses try-on route using the existing virtual try-on backend.

### Files to add

- `apps/mobile/app/studio/glasses/[id].tsx`

### Files to change

- `apps/mobile/app/(tabs)/studio.tsx`
- `apps/mobile/app/report/[id].tsx`
- `apps/mobile/lib/api.ts`
- `apps/mobile/lib/studio-history.ts`

### Implementation notes

- Mirror the existing hair and makeup screen structure: source image, option picker, generate CTA, recent history, save-to-report
- Because the backend expects `clothImage` and optional `personImage`, the mobile UI needs a garment-image picker rather than only a preset selector
- Keep the first version report-bound only; do not mix in canvas support yet
- Save successful results into the same local history mechanism using a new kind such as `glasses`

### Acceptance criteria

- User can upload a glasses reference image and generate a preview from a report
- Generated preview can be reopened from local history and saved back into report visuals
- Studio vault reflects the saved generated asset through the existing backend asset persistence

## Phase 3: Outfit And Swatch Flows On Mobile

### Goal

Bring the recommendation and palette-visual part of Studio onto mobile.

### Files to add

- `apps/mobile/app/studio/outfits/[id].tsx`
- `apps/mobile/app/studio/colors/[id].tsx`

### Files to change

- `apps/mobile/app/(tabs)/studio.tsx`
- `apps/mobile/app/report/[id].tsx`
- `apps/mobile/lib/api.ts`

### Implementation notes

- Outfit generation is recommendation-first, not image-first, so the mobile screen should present selectable occasion and vibe controls and then render returned looks as cards
- Color swatch generation is slot-based and parallel on web; mobile should present a progress-oriented screen instead of assuming one blocking request
- Keep failure states explicit per swatch slot: `pending`, `ready`, and `failed`
- If individual swatch images are already persisted into report visual assets, render them in the report Studio tab once present

### Acceptance criteria

- User can request outfit ideas from mobile and view the generated look set
- User can trigger swatch generation and see slot-by-slot progress without the screen feeling frozen
- Generated swatches appear in the correct report or Studio sections when available

## Phase 4: Mobile Studio Canvas Entry

### Goal

Give mobile a standalone Studio path independent of the report flow.

### Files to add

- `apps/mobile/app/studio/index.tsx` or an equivalent entry route
- `apps/mobile/app/studio/canvas/[id].tsx`

### Files to change

- `apps/mobile/app/(tabs)/studio.tsx`
- `apps/mobile/lib/api.ts`

### Web surfaces to mirror

- `src/app/studio/page.tsx`
- `src/app/studio/[canvasId]/page.tsx`
- `src/app/api/studio/upload/route.ts`

### Implementation notes

- Start with upload and session open only; do not try to replicate the full web component hierarchy one-for-one
- The mobile canvas route should act as a launcher into the same action family as report-bound Studio: makeup, hair, glasses, outfits, colors
- Reuse the existing vault grouping by `sourceType` so canvas-generated assets and report-generated assets stay coherent

### Acceptance criteria

- User can start Studio without first creating a report
- Canvas-generated assets remain distinguishable from report-generated assets in the vault
- Quota and entitlement messaging is visible before generation begins

## Phase 5: Polish And Recovery

### Goal

Reduce friction across cross-surface transitions and failure states.

### Files to change

- `apps/mobile/app/report/[id].tsx`
- `apps/mobile/app/(tabs)/studio.tsx`
- `apps/mobile/app/(tabs)/account.tsx`

### Work

- Replace the current PDF web handoff with a more explicit export sheet if native download is still deferred
- Improve return-path messaging after browser-based payment or subscription flows
- Add clearer empty states in Studio for users with no report-bound or canvas-bound assets
- Normalize action naming so report tab, vault actions, and standalone Studio use the same labels

## Recommended Build Sequence

### Sprint 1

- Phase 1 shared plumbing
- Phase 2 glasses try-on

### Sprint 2

- Phase 3 outfit ideas
- Phase 3 color swatches

### Sprint 3

- Phase 4 Studio Canvas
- Phase 5 polish and recovery

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Virtual try-on needs user-supplied garment imagery | Poor UX if hidden behind report-only assumptions | Treat glasses try-on as its own input flow, not a simple preset picker |
| Swatch generation is parallel and long-running | UI can look broken or stalled | Model each slot separately and render progress state by slot |
| Canvas and report contexts can drift apart | Vault confusion and duplicated logic | Keep a single vault model and distinguish by `sourceType` only |
| Mobile docs are stale | Engineers may implement against outdated assumptions | Treat this file as the Studio source of truth and update parity docs after Phase 1 |

## Definition Of Done

Mobile Studio parity is good enough when:
- users can create makeup, hair, glasses, outfit, and color outputs from mobile
- users can start from either a report or a standalone canvas path
- generated assets remain navigable through the vault and report surfaces
- the remaining mobile-to-web handoffs are intentional, explained, and minimal