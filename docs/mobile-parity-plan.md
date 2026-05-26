# Mobile Parity Plan

Date: 2026-05-26
Scope: Compare `apps/mobile` against the current web product and define an implementation plan for mobile parity.

## Executive Summary

The mobile app is beyond a prototype, but it is not yet feature-complete relative to the web app.

Mobile currently covers:
- Authenticated app shell with Expo Router
- Selfie capture and upload for analysis
- Analysis polling and report loading
- Basic report viewing
- Report unlock and Studio Pro browser handoff
- Style consultant chat
- Studio vault browsing
- Makeup preview generation
- Hair color preview generation
- Subscription status and cancellation

Mobile does not yet cover the full web experience for report tabs, sharing, studio breadth, product intelligence, and user retention surfaces.

## Current Mobile Coverage

### Implemented

| Area | Mobile surface | Notes |
|---|---|---|
| App shell | `apps/mobile/app/_layout.tsx`, `apps/mobile/app/(tabs)` | Tabs for Home, Reports, Studio, Account |
| Upload and analyze | `apps/mobile/app/(tabs)/home.tsx` | Camera and gallery upload are implemented |
| Analysis waiting state | `apps/mobile/app/analysis/[id].tsx` | Polling fallback implemented |
| Reports list | `apps/mobile/app/(tabs)/reports.tsx` | Lists report history from Supabase |
| Report detail | `apps/mobile/app/report/[id].tsx` | Loads report, unlock flow, saved visuals |
| Chat | `apps/mobile/app/chat/[id].tsx` | Report-scoped chat implemented |
| Studio vault | `apps/mobile/app/(tabs)/studio.tsx` | Vault browsing, filtering, delete, preview |
| Makeup studio | `apps/mobile/app/studio/makeup/[id].tsx` | Generate preview, keep local history, save to report |
| Hair studio | `apps/mobile/app/studio/hair/[id].tsx` | Generate preview, keep local history, save to report |
| Account and billing | `apps/mobile/app/(tabs)/account.tsx` | Sign in, sign out, Studio Pro status, cancel |
| Mobile API wrapper | `apps/mobile/lib/api.ts` | Wraps reports, chat, payments, subscriptions, vault, makeup, hair |

### Partially Implemented

| Area | Gap |
|---|---|
| Report detail | Implemented as one long screen, not parity with web tab model |
| Payments | Works via browser handoff, but mobile lacks web paywall richness |
| Studio | Strong for makeup and hair only; broader canvas parity is missing |
| Vault | Present, but not yet tied to all web generation types |

## Web Features Not Yet Matched On Mobile

### P0: Core parity gaps

| Feature | Web owner | Current mobile state | Priority |
|---|---|---|---|
| Intent-aware upload flow | `src/app/upload/page.tsx` | Missing | P0 |
| Report tab model: face, skin, glasses, hair, studio, shop | `src/app/report/[id]/page.tsx`, `src/components/report/*` | Missing | P0 |
| Rich report visuals: landmark overlay, palette board, signed assets | `src/app/report/[id]/page.tsx` | Missing | P0 |
| Paywall parity for report vs Studio Pro | `src/components/Paywall.tsx` | Partial | P0 |
| Better premium gating inside report | `src/app/report/[id]/page.tsx` | Partial | P0 |

### P1: Studio parity gaps

| Feature | Web owner | Current mobile state | Priority |
|---|---|---|---|
| Glasses virtual try-on | `src/app/api/reports/[id]/virtual-tryon/route.ts` | Missing | P1 |
| Clothing color swatches or outfit generation | `src/app/api/reports/[id]/outfit-generator/route.ts`, `src/app/api/reports/[id]/visuals/colors/route.ts` | Missing | P1 |
| Studio canvas entry and session model | `src/app/studio/page.tsx`, `src/app/api/studio/upload/route.ts` | Missing | P1 |
| Studio share flow | `src/app/api/studio/share/route.ts` | Missing | P1 |
| Vault support for all generated asset types | Web studio + report visuals | Partial | P1 |

### P1: Retention and history gaps

| Feature | Web owner | Current mobile state | Priority |
|---|---|---|---|
| Style DNA view | `src/app/dashboard/style-dna/*` | Missing | P1 |
| Progress tracker | `src/app/dashboard/progress/*` | Missing | P1 |
| Report delete and share management | dashboard and report actions | Partial | P1 |
| PDF export entry point | `src/app/api/reports/[id]/pdf/route.ts` | Missing | P1 |
| Public report sharing | `src/app/api/reports/[id]/share/route.ts`, `src/app/r/*` | Missing | P1 |

### P2: Recommendation and commerce gaps

| Feature | Web owner | Current mobile state | Priority |
|---|---|---|---|
| Chat bookmarks | `src/app/api/chat/bookmarks/*` | Missing | P2 |
| Ingredient analysis | `src/app/api/ingredients/analyze/route.ts` | Missing | P2 |
| Product comparison | `src/app/api/ingredients/compare/route.ts`, related UI cards | Missing | P2 |
| Shop-tab parity | `src/components/report/*` and related APIs | Missing | P2 |

### Web-only unless explicitly requested for mobile

These should not block mobile parity for the product itself:
- Admin surfaces
- Pipeline debug tools
- Landing-page marketing modules such as activity ticker, testimonials, and sample carousel
- OG image generation and social preview surfaces

## Recommended Delivery Sequence

1. Phase 1: Core report and paywall parity
2. Phase 2: Studio breadth parity
3. Phase 3: Sharing, history, and retention
4. Phase 4: Product intelligence and shop flows
5. Phase 5: Optional marketing carryover

## Phase 1: Core Report And Paywall Parity

### Goal

Make mobile capable of the same primary user journey as web:
upload -> analyze -> browse full structured report -> unlock paid content -> open studio from report.

### Deliverables

- Add upload intent selection for Complete Analysis vs Studio Pro
- Refactor mobile report into tabs aligned with web sections
- Surface premium and free-preview gating per section instead of one flat screen
- Add rich visual asset rendering when available
- Improve payment and plan messaging to match web paywall behavior

### Files to add or change

- Update `apps/mobile/app/(tabs)/home.tsx`
- Refactor `apps/mobile/app/report/[id].tsx`
- Add `apps/mobile/app/report/_components/*`
- Extend `apps/mobile/lib/api.ts`
- Add shared report view models in `apps/mobile/lib/*` if needed

### API dependencies

- Reuse `GET /api/reports/[id]`
- Reuse `POST /api/payments/create`
- Reuse `POST /api/payments/verify`
- Reuse `GET /api/subscriptions/status`
- Confirm the report payload already exposes enough visual asset metadata for mobile rendering

### Acceptance criteria

- User can choose report intent before upload
- Report sections are split into mobile tabs or segmented sections matching web information architecture
- Paid-only sections are clearly gated and unlock after payment refresh
- Palette board and visual assets appear when present
- Report remains usable for both preview and paid users

## Phase 2: Studio Breadth Parity

### Goal

Bring mobile studio beyond makeup and hair into a broader try-on and canvas experience.

### Deliverables

- Add glasses try-on flow
- Add clothing swatch or outfit generation flow
- Add standalone studio upload or canvas creation flow where appropriate
- Connect vault items back to their originating studio actions
- Expose quota usage more clearly in studio entry points

### Files to add or change

- Update `apps/mobile/app/(tabs)/studio.tsx`
- Add `apps/mobile/app/studio/glasses/[id].tsx`
- Add `apps/mobile/app/studio/outfits/[id].tsx` or equivalent
- Update `apps/mobile/app/report/[id].tsx`
- Extend `apps/mobile/lib/api.ts`

### API dependencies

- `POST /api/reports/[id]/virtual-tryon`
- `POST /api/reports/[id]/outfit-generator`
- `POST /api/reports/[id]/visuals/colors`
- `POST /api/studio/upload`
- `POST /api/studio/generate`
- `POST /api/studio/share`
- `GET /api/studio/vault`

### Acceptance criteria

- User can launch at least four studio actions from mobile: makeup, hair, glasses, outfit or swatch generation
- Generated assets show in vault and can be previewed or removed
- Quota and entitlement state are visible before generation starts

## Phase 3: Sharing, History, And Retention

### Goal

Increase repeat use and cross-device continuity.

### Deliverables

- Add report sharing flow
- Add PDF export entry point or browser handoff
- Add Style DNA screen
- Add progress tracker or a simplified report timeline
- Add delete-report management if still absent on mobile

### Files to add or change

- Add `apps/mobile/app/style-dna.tsx` or a tab-local route
- Add `apps/mobile/app/progress.tsx` or a tab-local route
- Update `apps/mobile/app/(tabs)/reports.tsx`
- Update `apps/mobile/app/report/[id].tsx`
- Extend `apps/mobile/lib/api.ts`

### API dependencies

- `POST /api/reports/[id]/share`
- `GET /api/reports/[id]/pdf`
- Any existing dashboard or preference endpoints used by web style DNA surfaces

### Acceptance criteria

- User can share a report from mobile
- User can open a PDF version from mobile
- Style DNA and progress history are accessible without visiting web

## Phase 4: Product Intelligence And Shop Flows

### Goal

Bring advanced recommendation tools to mobile after the core journey is stable.

### Deliverables

- Add chat bookmarks
- Add ingredient analysis entry point
- Add product comparison workflow
- Add shop-tab parity for relevant recommendations

### Files to add or change

- Update `apps/mobile/app/chat/[id].tsx`
- Add product intelligence routes under `apps/mobile/app/*`
- Extend `apps/mobile/lib/api.ts`

### API dependencies

- `GET/POST /api/chat/bookmarks`
- `POST /api/ingredients/analyze`
- `POST /api/ingredients/compare`

### Acceptance criteria

- User can save useful chat answers
- User can analyze product ingredients from mobile
- User can compare products in a mobile-native view

## Mobile Architecture Recommendations

- Keep using the existing web backend APIs; do not fork business logic into mobile unless unavoidable
- Add mobile-specific view models only when the server response is too wide for UI consumption
- Prefer small route components backed by reusable presentation components under `apps/mobile/app/*/_components`
- Keep secure auth and storage in `apps/mobile/lib/supabase.ts` and `apps/mobile/lib/studio-history.ts`
- Avoid shipping marketing-page parity before product parity

## Suggested Engineering Backlog

### Sprint 1

- Refactor report screen into tabs
- Add upload intent selection
- Improve paywall and unlock messaging
- Validate report payload completeness for mobile visuals

### Sprint 2

- Add glasses try-on screen
- Add outfit or swatch generation screen
- Improve studio launch paths from report and vault

### Sprint 3

- Add report sharing
- Add PDF handoff
- Add Style DNA and progress views

### Sprint 4

- Add chat bookmarks
- Add ingredient analysis and product comparison

## Open Questions Before Implementation

- Should public report sharing open inside the app, browser, or both?
- Should PDF export download locally or just open in browser first?
- Is standalone Studio Canvas a first-class mobile feature, or should mobile studio stay report-first?
- Are outfit generation and color swatches equally important, or should one ship first?
- Should visitor chat remain web-only by product decision?

## Definition Of Done For Mobile Parity

Mobile parity should be considered complete when a signed-in user can:
- Upload a selfie with the same product-intent choices as web
- Complete analysis and browse the same report sections as web
- Unlock report or Studio Pro with clear plan-aware UX
- Use the major studio tools available on web
- Share, revisit, and manage reports from mobile
- Access the most important recommendation and follow-up tools without needing the website