# Mobile Gesture Full Regression (45-60 Minutes)

Date: 2026-05-29
App: Renovaara Mobile

This is the full execution card for device testing. It is based on the detailed tap-by-tap matrix in:
- `docs/mobile-gesture-manual-checklist.md`

## Run metadata

- Tester:
- Device model:
- Android version:
- Build version:
- Free account:
- Paid/Studio Pro account:

## Execution order (recommended)

1. Auth guard checks (signed-out)
2. Account sign-in/sign-out baseline
3. Home upload entry and analysis
4. Reports list and report detail flows
5. Chat flow with bookmarks and ingredient tools
6. Style DNA and Progress pages
7. Studio vault flows (preview/filter/actions/bulk)
8. Studio Canvas create and canvas actions
9. Report Studio tools (makeup, hair, glasses, colors, outfits)
10. Sign-out regression and deep-link guard retest

## Severity model

- P0: Crash, data leak, auth bypass, payment unlock wrong
- P1: Core flow blocked, incorrect entitlement state
- P2: UX issue, non-blocking functional defect

## Gate criteria

- `Go` only if:
  - No P0
  - No unresolved P1 in auth, payment, report, or studio generation
  - Sign-out and signed-out route guards pass
- Otherwise `No-go`

## Sign-off

- P0 count:
- P1 count:
- P2 count:
- Final decision: [ ] Go [ ] No-go
- Evidence folder/screenshot IDs:

## Detailed checklist pointer

For every tap-level step and pass/fail entry, execute and mark:
- `docs/mobile-gesture-manual-checklist.md`
