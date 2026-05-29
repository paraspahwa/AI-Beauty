# Mobile Gesture Fast Smoke (15 Minutes)

Date: 2026-05-29
App: Renovaara Mobile

Use this for quick pre-release confidence on a single device.

## Run metadata

- Tester:
- Device:
- Build:
- Account used:

## Pass rule

- Any single fail in core flow = `No-go` for rollout.

## 0) Signed-out guard (2 min)

1. Force-close app and relaunch signed out. [ ] Pass [ ] Fail
2. Tap Reports tab. Expected: routed to Account. [ ] Pass [ ] Fail
3. From Home tap Open Style DNA and Open Progress. Expected: routed to Account. [ ] Pass [ ] Fail

## 1) Sign-in and session (2 min)

1. Sign in with valid credentials in Account tab. [ ] Pass [ ] Fail
2. Move across Home, Reports, Studio tabs after sign-in. [ ] Pass [ ] Fail

## 2) Analysis happy path (4 min)

1. Home -> Pick selfie (gallery) and start analysis. [ ] Pass [ ] Fail
2. Wait for Analysis screen to move to Report screen. [ ] Pass [ ] Fail
3. On report, tap Face/Skin/Hair/Glasses/Studio/Shop chips. [ ] Pass [ ] Fail

## 3) Chat and share (3 min)

1. From report tap Open chat. [ ] Pass [ ] Fail
2. Tap one suggestion chip and receive assistant response. [ ] Pass [ ] Fail
3. Bookmark one assistant message. [ ] Pass [ ] Fail
4. Back to report and tap Share to open share sheet. [ ] Pass [ ] Fail

## 4) Studio quick check (3 min)

1. Studio tab -> open one asset preview. [ ] Pass [ ] Fail
2. Open one report studio tool (makeup/hair/glasses/colors/outfits) and generate once. [ ] Pass [ ] Fail
3. Studio Canvas create -> pick image -> open canvas -> run one generation. [ ] Pass [ ] Fail

## 5) Sign-out regression (1 min)

1. Sign out from Account tab. [ ] Pass [ ] Fail
2. Try entering report/chat/style-dna/progress paths again. Expected: routed to Account. [ ] Pass [ ] Fail

## Fast smoke outcome

- Critical fails:
- Go/No-go: [ ] Go [ ] No-go
