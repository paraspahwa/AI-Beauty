# Mobile Phase 1 Backlog

Date: 2026-05-26
Parent plan: `docs/mobile-parity-plan.md`
Scope: Phase 1 only - core report and paywall parity for `apps/mobile`.

## Objective

Ship the minimum set of mobile changes required to make the primary beauty-analysis journey comparable to web:

1. User chooses product intent before upload
2. User uploads or captures a selfie
3. User waits for analysis completion
4. User sees a structured report instead of a single long screen
5. User can understand what is locked, unlock it, and continue without confusion
6. User can enter Studio from the report with the right context

## Recommended Build Order

1. Validate report payload completeness for mobile rendering
2. Add upload intent selection
3. Refactor report detail into tabbed sections
4. Add section-aware premium gating
5. Render report visual assets where available
6. Tighten paywall and unlock recovery UX

## Workstreams

### W1. Report Data Contract Audit

Status: Not started
Priority: P0
Effort: S
Risk: Medium

#### Goal

Confirm whether `GET /api/reports/[id]` already returns enough data for mobile parity, especially around visual assets and report-section completeness.

#### Files

- `apps/mobile/lib/api.ts`
- `src/app/api/reports/[id]/route.ts`
- `src/types/report.ts`
- `src/app/report/[id]/page.tsx`

#### Tasks

- Compare mobile `MobileReport` shape against the actual API response
- Check whether visual assets already include palette board, landmarks, glasses previews, hairstyle previews, color swatches, and makeup previews
- Identify fields that mobile currently drops from typing even if backend already sends them
- Decide whether to widen `MobileReport` or add a mobile view-model transformer

#### Acceptance Criteria

- Documented list of missing fields, if any
- No guessing about server payload shape before UI refactor begins
- Clear decision on whether backend changes are required

#### Dependency

- None

---

### W2. Upload Intent Selection

Status: Not started
Priority: P0
Effort: M
Risk: Low

#### Goal

Bring the mobile entry flow closer to web by letting the user explicitly choose between Complete Analysis and Studio Pro before upload.

#### Files

- `apps/mobile/app/(tabs)/home.tsx`
- `apps/mobile/lib/api.ts` if metadata needs to be sent
- Optional: `apps/mobile/app/(tabs)/_components/*`

#### Tasks

- Add two intent cards or segmented controls for `report` and `studio_pro`
- Preserve intent through camera or gallery selection
- Pass intent into the analysis flow or downstream payment/report navigation when needed
- Add concise upload guidance similar to the web upload page

#### Acceptance Criteria

- User can clearly choose a purchase path before upload
- Intent survives capture or gallery upload
- The post-analysis flow reflects the chosen intent
- Home screen still works if the user ignores the intent selector and uses default flow

#### Dependency

- W1 recommended first

---

### W3. Report Screen Refactor

Status: Not started
Priority: P0
Effort: L
Risk: Medium

#### Goal

Replace the current long-form report detail screen with a structured tabbed or segmented layout aligned to the web report information architecture.

#### Files

- `apps/mobile/app/report/[id].tsx`
- New: `apps/mobile/app/report/_components/ReportHeader.tsx`
- New: `apps/mobile/app/report/_components/ReportTabs.tsx`
- New: `apps/mobile/app/report/_components/FaceTab.tsx`
- New: `apps/mobile/app/report/_components/SkinTab.tsx`
- New: `apps/mobile/app/report/_components/GlassesTab.tsx`
- New: `apps/mobile/app/report/_components/HairTab.tsx`
- New: `apps/mobile/app/report/_components/StudioTab.tsx`
- New: `apps/mobile/app/report/_components/ShopTab.tsx`

#### Tasks

- Extract shared report header and status summary
- Introduce a mobile tab state model mirroring web sections
- Move face, skin, glasses, hair, studio, and shop content into separate section components
- Preserve existing payment-refresh and browser-return logic during the refactor
- Preserve saved visuals and studio launch actions

#### Acceptance Criteria

- Report is broken into clearly navigable sections
- Existing report content remains available after refactor
- Payment-return handling still works from within report
- Studio launch actions still receive the correct report id and image url

#### Dependency

- W1 first

---

### W4. Section-Level Premium Gating

Status: Not started
Priority: P0
Effort: M
Risk: Medium

#### Goal

Move from one general lock state to section-specific premium gating that better matches the web report behavior.

#### Files

- `apps/mobile/app/report/[id].tsx`
- New section components under `apps/mobile/app/report/_components/*`

#### Tasks

- Define which sections are preview-safe versus paid-only
- Show locked-state cards inside gated sections instead of only at the bottom of the screen
- Keep unlock CTA visible in the right context
- Re-fetch and rehydrate the report cleanly after payment completion

#### Acceptance Criteria

- Free users can still browse available preview content
- Locked sections clearly explain what unlocks
- After payment confirmation, gated sections update without requiring a fresh app session

#### Dependency

- W3

---

### W5. Report Visual Assets

Status: Not started
Priority: P0
Effort: M
Risk: Medium

#### Goal

Render the most important report visuals on mobile when the backend already provides them.

#### Files

- `apps/mobile/lib/api.ts`
- `apps/mobile/app/report/_components/FaceTab.tsx`
- `apps/mobile/app/report/_components/ColorTab.tsx` if a dedicated color section is introduced
- `apps/mobile/app/report/_components/GlassesTab.tsx`
- `apps/mobile/app/report/_components/HairTab.tsx`
- `apps/mobile/app/report/_components/StudioTab.tsx`

#### Tasks

- Add typings for visual assets to the mobile API layer
- Render landmark overlay if present
- Render palette board and swatches if present
- Render hairstyle and makeup preview assets if present
- Render glasses previews if present
- Degrade gracefully when assets are absent or still processing

#### Acceptance Criteria

- Mobile can display ready visual assets without type assertions scattered through UI
- Missing or pending assets do not break the screen
- Visual content is grouped under the correct report sections

#### Dependency

- W1
- W3 recommended before final UI placement

---

### W6. Paywall UX And Unlock Recovery

Status: Not started
Priority: P0
Effort: M
Risk: Low

#### Goal

Make the mobile unlock flow clearer, more plan-aware, and less dependent on the user understanding the browser handoff.

#### Files

- `apps/mobile/app/report/[id].tsx`
- `apps/mobile/app/(tabs)/account.tsx`
- Optional new component: `apps/mobile/app/report/_components/UnlockCard.tsx`

#### Tasks

- Improve plan comparison copy for Complete Analysis versus Studio Pro
- Show stronger progress feedback after browser checkout starts
- Clarify whether the user is waiting on one-time report unlock or Studio Pro activation
- Provide a robust manual refresh path after returning from the browser
- Ensure unlock status clears properly once entitlement updates

#### Acceptance Criteria

- Users can distinguish one-time report purchase from Studio Pro membership
- Browser-return recovery works without confusion
- Stale loading or stale checkout banners do not persist after success

#### Dependency

- W3 and W4 recommended

---

## Cross-Cutting Technical Tasks

### T1. Shared Mobile Report Types

Priority: P0
Effort: S

- Create a dedicated mobile report type module instead of keeping all report types inline in `apps/mobile/lib/api.ts`
- Keep API types and UI view-models separate if the shape starts growing

### T2. Report UI Componentization

Priority: P0
Effort: M

- Move reusable cards, lock states, and report section headers into report-local components
- Keep route file focused on fetching, screen state, and navigation only

### T3. Focused Type Safety Pass

Priority: P0
Effort: S

- Run mobile typecheck after each workstream group
- Remove any unsafe assumptions around optional report fields and visual asset presence

## Suggested Sprint Breakdown

### Sprint A

- W1 Report Data Contract Audit
- T1 Shared Mobile Report Types
- W2 Upload Intent Selection

### Sprint B

- W3 Report Screen Refactor
- T2 Report UI Componentization

### Sprint C

- W4 Section-Level Premium Gating
- W5 Report Visual Assets
- W6 Paywall UX And Unlock Recovery
- T3 Focused Type Safety Pass

## Task Ranking By Value

| Rank | Task | Why |
|---|---|---|
| 1 | W3 Report Screen Refactor | Biggest user-facing parity gain |
| 2 | W4 Section-Level Premium Gating | Needed to make the new report structure behave correctly |
| 3 | W2 Upload Intent Selection | Aligns first-run experience with product packaging |
| 4 | W5 Report Visual Assets | Improves perceived quality and parity quickly |
| 5 | W6 Paywall UX And Unlock Recovery | Reduces checkout confusion and drop-off |
| 6 | W1 Report Data Contract Audit | Small but should happen first to avoid UI rework |

## Risk Ranking

| Risk | Impact | Mitigation |
|---|---|---|
| Mobile report payload is narrower than expected | Blocks visual parity | Finish W1 before deep UI work |
| Report screen refactor breaks payment return flow | Unlock regressions | Preserve and test current checkout state transitions before restructuring |
| Visual assets have inconsistent availability | Broken sections or empty states | Build explicit `pending`, `ready`, and `missing` UI states |
| Section split increases component complexity | Slower iteration | Keep route logic thin and move section rendering into local components |

## Definition Of Done For Phase 1

Phase 1 is done when all of the following are true:

- Home screen lets the user choose a report-first or Studio-first purchase intent
- Mobile report is organized into structured sections instead of one long scroll surface
- Premium and preview content are separated clearly at the section level
- Report visual assets render safely where available
- Unlock and Studio Pro return flows are understandable and reliable
- Mobile typecheck passes for `apps/mobile`