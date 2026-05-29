# Mobile Tester Sheet Example (Filled Sample)

Date: 2026-05-29
App: Renovaara Mobile
Package: com.paraspahwa.renovaaramobile

This is a sample-filled sheet to show the expected reporting format.

## Run Info

- Tester: QA-Internal-01
- Device model: Pixel 7
- Android version: 15
- Build version: 0.1.0 (versionCode 2)
- Account (free): qa.free+01@renovaara.test
- Account (paid/studio pro): qa.pro+01@renovaara.test
- Start time: 14:05
- End time: 14:42

## Quick Severity Guide

- P0: Crash, auth bypass, payment/unlock incorrect, private data leak
- P1: Core flow broken, blocking errors in report/studio/chat
- P2: Non-blocking UI/UX issues

## Defect ID convention

- Format used: `MOB-AREA-###`
- AREA examples used in this sample: `STUDIO`, `CHAT`, `REPORT`, `AUTH`

## Fast Pass/Fail Grid

- Signed-out route guard (reports/style-dna/progress/report deep-link): [x] Pass [ ] Fail
- Sign-in and sign-out cycle: [x] Pass [ ] Fail
- Home upload flow (camera/library): [x] Pass [ ] Fail
- Analysis to report transition: [x] Pass [ ] Fail
- Report tabs + share + chat open: [x] Pass [ ] Fail
- Chat send + bookmark + share: [x] Pass [ ] Fail
- Style DNA screen load + refresh: [x] Pass [ ] Fail
- Progress screen load + open report: [x] Pass [ ] Fail
- Studio vault open + preview + action/delete: [ ] Pass [x] Fail
- Studio canvas create + one generation: [x] Pass [ ] Fail
- Report studio tool generation (any one): [x] Pass [ ] Fail
- Sign-out regression retest for protected routes: [x] Pass [ ] Fail

## Defect Log (Fill During Run)

1. ID: MOB-STUDIO-017
   - Severity: [ ] P0 [ ] P1 [x] P2
   - Page/route: Studio tab (vault)
   - Steps to reproduce:
     1. Sign in
     2. Open Studio tab
     3. Apply filter = canvas
     4. Remove one asset from Actions
     5. Pull to refresh
   - Expected: filter chip remains selected and list refreshes in same filtered state
   - Actual: filter resets to all after refresh
   - Screenshot/video ref: IMG_2026-05-29_1428.png

2. ID: MOB-CHAT-004
   - Severity: [ ] P0 [ ] P1 [ ] P2
   - Page/route:
   - Steps to reproduce:
   - Expected:
   - Actual:
   - Screenshot/video ref:

3. ID: MOB-REPORT-002
   - Severity: [ ] P0 [ ] P1 [ ] P2
   - Page/route:
   - Steps to reproduce:
   - Expected:
   - Actual:
   - Screenshot/video ref:

4. ID: MOB-AUTH-001
   - Severity: [ ] P0 [ ] P1 [ ] P2
   - Page/route:
   - Steps to reproduce:
   - Expected:
   - Actual:
   - Screenshot/video ref:

## Release Decision

- P0 count: 0
- P1 count: 0
- P2 count: 1
- Final recommendation: [x] Go [ ] No-go
- Sign-off (QA): QA-Internal-01
- Sign-off (Owner): Pending
