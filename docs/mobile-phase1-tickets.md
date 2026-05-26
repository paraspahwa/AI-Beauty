# Mobile Phase 1 Tickets

Date: 2026-05-26
Parent docs:
- `docs/mobile-parity-plan.md`
- `docs/mobile-phase1-backlog.md`

Use this document as a tracking-ready issue list for the first mobile parity milestone.

## Ticket MP1-1: Audit Mobile Report Contract Against Web API

### Summary

Audit the mobile report type and data usage against the actual `GET /api/reports/[id]` response so the Phase 1 UI work is built on the real payload.

### Why

Mobile currently narrows the report data aggressively in `apps/mobile/lib/api.ts`. Before refactoring the report UI, confirm which fields already exist and which are being dropped by local typing.

### Scope

- Compare `MobileReport` with the report API route and shared web types
- Identify missing fields relevant to mobile parity
- Decide whether to widen `MobileReport` or add a dedicated mobile transformer
- Call out whether any backend change is required for visual assets

### Files

- `apps/mobile/lib/api.ts`
- `src/app/api/reports/[id]/route.ts`
- `src/types/report.ts`
- `src/app/report/[id]/page.tsx`

### Deliverable

- A verified field map for mobile report rendering
- Updated mobile types if the contract is already sufficient
- A short note in code comments or docs if backend follow-up is required

### Acceptance Criteria

- No unknowns remain about report payload shape for Phase 1 UI work
- Visual asset availability is explicitly confirmed
- Mobile types reflect actual server payload for all Phase 1 sections

### Dependencies

- None

### Estimate

- Small

---

## Ticket MP1-2: Add Product Intent Selection To Mobile Home

### Summary

Update the mobile home screen so users can choose a report-first or Studio Pro-first path before selecting a selfie.

### Why

The web upload flow is intent-aware and packages the product clearly. Mobile currently jumps straight into upload, which hides plan context and weakens the first-run purchase path.

### Scope

- Add intent selection UI to the mobile home screen
- Preserve intent through camera and gallery upload
- Carry intent into downstream analysis and report navigation
- Add concise upload guidance inspired by web

### Files

- `apps/mobile/app/(tabs)/home.tsx`
- Optional `apps/mobile/app/(tabs)/_components/*`
- `apps/mobile/lib/api.ts` only if request metadata must change

### Deliverable

- Mobile home screen with a clear plan choice before upload

### Acceptance Criteria

- User can choose between Complete Analysis and Studio Pro before upload
- Intent survives image selection and analysis start
- Existing analysis flow still works if no explicit choice is made

### Dependencies

- MP1-1 recommended first

### Estimate

- Medium

---

## Ticket MP1-3: Refactor Mobile Report Into Structured Sections

### Summary

Refactor the current long-form report screen into a structured mobile report experience aligned with the web information architecture.

### Why

The current screen contains all report content in a single scroll surface. That is the largest parity gap in the mobile product experience.

### Scope

- Introduce mobile report tabs or segmented navigation
- Split report rendering into face, skin, glasses, hair, studio, and shop sections
- Extract report header and shared cards into local components
- Preserve report loading, unlock refresh, and studio launch behavior

### Files

- `apps/mobile/app/report/[id].tsx`
- New `apps/mobile/app/report/_components/ReportHeader.tsx`
- New `apps/mobile/app/report/_components/ReportTabs.tsx`
- New section components under `apps/mobile/app/report/_components/*`

### Deliverable

- A sectioned report screen that matches the web report model closely enough for parity work to continue

### Acceptance Criteria

- Report content is split into clearly navigable sections
- Existing report actions still work after refactor
- Payment-return state and report refresh still behave correctly

### Dependencies

- MP1-1

### Estimate

- Large

---

## Ticket MP1-4: Add Section-Level Premium Gating

### Summary

Implement section-aware lock states in the mobile report instead of relying on one generic premium CTA area.

### Why

Web parity depends on users understanding what is available in preview and what unlocks with payment. The current mobile report does not separate those states clearly enough.

### Scope

- Define preview-safe and premium-only sections
- Add contextual lock cards inside gated sections
- Keep unlock CTA connected to the relevant section
- Ensure the report updates cleanly after payment confirmation

### Files

- `apps/mobile/app/report/[id].tsx`
- `apps/mobile/app/report/_components/*`

### Deliverable

- Clear section-level premium behavior consistent with the web report experience

### Acceptance Criteria

- Free users can browse preview-safe content without confusion
- Locked sections clearly explain what unlocks
- Paid users see gated content without stale lock states after refresh

### Dependencies

- MP1-3

### Estimate

- Medium

---

## Ticket MP1-5: Render Report Visual Assets On Mobile

### Summary

Add support for rendering report visual assets on mobile where the backend already provides them.

### Why

Visual assets are a major part of perceived web quality. Mobile currently underuses that output even when it may already be available from the report API.

### Scope

- Add mobile typings for report visual assets
- Render landmark overlays when present
- Render palette board and swatches when present
- Render hairstyle, makeup, and glasses previews when present
- Add safe empty or pending states when assets are unavailable

### Files

- `apps/mobile/lib/api.ts`
- `apps/mobile/app/report/_components/*`

### Deliverable

- Visual asset rendering integrated into the correct report sections

### Acceptance Criteria

- Report visuals render without unsafe field access
- Missing or pending visuals do not break mobile report UX
- Visual sections remain readable on smaller screens

### Dependencies

- MP1-1
- MP1-3 recommended first for placement

### Estimate

- Medium

---

## Ticket MP1-6: Improve Mobile Paywall And Unlock Recovery UX

### Summary

Tighten the mobile unlock flow so report purchase and Studio Pro activation are clearer and more reliable after browser handoff.

### Why

Mobile currently supports checkout return logic, but the plan distinction and recovery states are not strong enough for parity with the web paywall flow.

### Scope

- Clarify one-time report purchase vs Studio Pro subscription messaging
- Improve in-app progress and waiting states after browser checkout starts
- Add stronger manual refresh and retry affordances after return
- Ensure checkout banners clear correctly after success

### Files

- `apps/mobile/app/report/[id].tsx`
- `apps/mobile/app/(tabs)/account.tsx`
- Optional new `apps/mobile/app/report/_components/UnlockCard.tsx`

### Deliverable

- A clearer and less error-prone unlock experience on mobile

### Acceptance Criteria

- User can tell which plan they are activating
- Browser return path is understandable and recoverable
- Success state clears pending status banners promptly

### Dependencies

- MP1-3 recommended
- MP1-4 recommended

### Estimate

- Medium

---

## Suggested Execution Order

1. MP1-1
2. MP1-2
3. MP1-3
4. MP1-4
5. MP1-5
6. MP1-6

## Suggested Milestone Definition

Phase 1 milestone is complete when all six tickets are done and `apps/mobile` passes typecheck with the new report flow in place.