# Mobile Tester Sheet (Printable, 1-Page)

Date: 2026-05-29
App: Renovaara Mobile
Package: com.paraspahwa.renovaaramobile

Use this as a quick handout while executing device tests.
Detailed scripts:
- docs/mobile-gesture-fast-smoke.md
- docs/mobile-gesture-full-regression.md
- docs/mobile-gesture-manual-checklist.md
- Sample filled run: docs/mobile-gesture-tester-sheet-example.md

## Run Info

- Tester:
- Device model:
- Android version:
- Build version:
- Account (free):
- Account (paid/studio pro):
- Start time:
- End time:

## Quick Severity Guide

- P0: Crash, auth bypass, payment/unlock incorrect, private data leak
- P1: Core flow broken, blocking errors in report/studio/chat
- P2: Non-blocking UI/UX issues

## Defect ID convention

- Format: `MOB-AREA-###`
- `AREA` examples:
   - `AUTH` (sign-in/session/guard)
   - `HOME` (upload/entry)
   - `REPORT` (report/paywall/share)
   - `CHAT` (assistant/bookmarks/ingredients)
   - `STUDIO` (vault/canvas/tools)
   - `PAY` (checkout/entitlement)
- Example IDs:
   - `MOB-AUTH-001`
   - `MOB-STUDIO-017`

## Fast Pass/Fail Grid

- Signed-out route guard (reports/style-dna/progress/report deep-link): [ ] Pass [ ] Fail
- Sign-in and sign-out cycle: [ ] Pass [ ] Fail
- Home upload flow (camera/library): [ ] Pass [ ] Fail
- Analysis to report transition: [ ] Pass [ ] Fail
- Report tabs + share + chat open: [ ] Pass [ ] Fail
- Chat send + bookmark + share: [ ] Pass [ ] Fail
- Style DNA screen load + refresh: [ ] Pass [ ] Fail
- Progress screen load + open report: [ ] Pass [ ] Fail
- Studio vault open + preview + action/delete: [ ] Pass [ ] Fail
- Studio canvas create + one generation: [ ] Pass [ ] Fail
- Report studio tool generation (any one): [ ] Pass [ ] Fail
- Sign-out regression retest for protected routes: [ ] Pass [ ] Fail

## Defect Log (Fill During Run)

1. ID:
   - Severity: [ ] P0 [ ] P1 [ ] P2
   - Page/route:
   - Steps to reproduce:
   - Expected:
   - Actual:
   - Screenshot/video ref:

2. ID:
   - Severity: [ ] P0 [ ] P1 [ ] P2
   - Page/route:
   - Steps to reproduce:
   - Expected:
   - Actual:
   - Screenshot/video ref:

3. ID:
   - Severity: [ ] P0 [ ] P1 [ ] P2
   - Page/route:
   - Steps to reproduce:
   - Expected:
   - Actual:
   - Screenshot/video ref:

4. ID:
   - Severity: [ ] P0 [ ] P1 [ ] P2
   - Page/route:
   - Steps to reproduce:
   - Expected:
   - Actual:
   - Screenshot/video ref:

## Release Decision

- P0 count:
- P1 count:
- P2 count:
- Final recommendation: [ ] Go [ ] No-go
- Sign-off (QA):
- Sign-off (Owner):
