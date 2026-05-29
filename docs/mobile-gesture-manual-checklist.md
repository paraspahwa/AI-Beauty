# Mobile Gesture Manual QA Checklist (Tap-by-Tap)

Date: 2026-05-29
App: Renovaara Mobile
Package: com.paraspahwa.renovaaramobile

Use this on a real device or emulator during smoke/regression testing.

## Tester metadata

- Tester:
- Device model:
- Android version:
- Build versionCode/versionName:
- Network: [ ] Wi-Fi [ ] 4G/5G
- Session start time:

## Accounts and test data

- Free account email:
- Paid or Studio Pro account email:
- Test report ID with completed output:
- Test report ID with preview-only output:

## Result legend

- Mark each step: `[ ] Pass` or `[ ] Fail`
- If fail: add short note and screenshot ID.

---

## 1) Launch and auth guard checks

### 1.1 Cold start without session

1. Open app from a force-closed state. [ ] Pass [ ] Fail
2. Verify initial route lands on Home tab shell. [ ] Pass [ ] Fail
3. Tap Reports tab while signed out. Expected: redirected to Account/sign-in surface. [ ] Pass [ ] Fail
4. Tap Home actions Open Style DNA and Open Progress while signed out. Expected: redirect to Account, no crash. [ ] Pass [ ] Fail
5. Deep-link test: open report route from notification/dev tools while signed out. Expected: loading then redirect to Account. [ ] Pass [ ] Fail

Page result (Launch/auth guard): [ ] Pass [ ] Fail
Notes:

---

## 2) Account tab (sign-in/sign-out)

1. Tap Email input, type valid email. [ ] Pass [ ] Fail
2. Tap Password input, type valid password. [ ] Pass [ ] Fail
3. Tap Sign in. Expected: status updates to Signed in, no error alert. [ ] Pass [ ] Fail
4. Tap Go Studio Pro (if non-pro) and verify browser handoff opens. [ ] Pass [ ] Fail
5. Return to app and verify activation status refresh path is visible. [ ] Pass [ ] Fail
6. Tap Sign out. Expected: status Signed out and entitlement reset. [ ] Pass [ ] Fail

Page result (Account): [ ] Pass [ ] Fail
Notes:

---

## 3) Home tab (upload entry)

1. Tap intent card Master Blueprint Report. [ ] Pass [ ] Fail
2. Tap intent card Full Interactive AI Studio. [ ] Pass [ ] Fail
3. Tap Capture selfie and deny camera permission. Expected: friendly permission alert. [ ] Pass [ ] Fail
4. Tap Capture selfie and allow camera permission, capture image. [ ] Pass [ ] Fail
5. Tap Pick selfie and choose image from library. [ ] Pass [ ] Fail
6. Tap Open latest report. Expected: opens latest report or shows no-report alert. [ ] Pass [ ] Fail
7. Tap Open Style DNA. [ ] Pass [ ] Fail
8. Tap Open Progress. [ ] Pass [ ] Fail

Page result (Home): [ ] Pass [ ] Fail
Notes:

---

## 4) Analysis screen (/analysis/[id])

1. Start analysis from Home and land on analysis page. [ ] Pass [ ] Fail
2. Observe step text progression over time. [ ] Pass [ ] Fail
3. Verify transition to /report/[id] when ready. [ ] Pass [ ] Fail
4. Failure path test (if available): verify readable failure state text. [ ] Pass [ ] Fail

Page result (Analysis): [ ] Pass [ ] Fail
Notes:

---

## 5) Reports tab

1. Tap Reports tab and wait for list load. [ ] Pass [ ] Fail
2. Tap view chip Continue. [ ] Pass [ ] Fail
3. Tap view chip History. [ ] Pass [ ] Fail
4. Tap Open on a report card. Expected: opens /report/[id]. [ ] Pass [ ] Fail
5. Tap Delete on a report card and cancel in confirm dialog. [ ] Pass [ ] Fail
6. Tap Delete and confirm for one test report (non-critical). [ ] Pass [ ] Fail
7. Tap Open Style DNA from insights card. [ ] Pass [ ] Fail
8. Tap Open Progress from insights card. [ ] Pass [ ] Fail

Page result (Reports): [ ] Pass [ ] Fail
Notes:

---

## 6) Report detail (/report/[id])

1. Open a report from Reports tab. [ ] Pass [ ] Fail
2. Swipe or tap each tab chip: Face, Skin, Hair, Glasses, Studio, Shop. [ ] Pass [ ] Fail
3. Tap Open chat. Expected: opens /chat/[id]. [ ] Pass [ ] Fail
4. Tap Share and complete native share sheet flow. [ ] Pass [ ] Fail
5. Tap export/PDF handoff and verify browser opens report URL. [ ] Pass [ ] Fail
6. For preview report, tap unlock and verify browser checkout handoff opens. [ ] Pass [ ] Fail
7. Return from checkout and verify payment status block updates. [ ] Pass [ ] Fail
8. If Studio Pro active, verify entitlement block and generation counters are visible. [ ] Pass [ ] Fail

Page result (Report detail): [ ] Pass [ ] Fail
Notes:

---

## 7) Chat (/chat/[id])

1. Open Chat from report page. [ ] Pass [ ] Fail
2. Tap a suggestion chip. Expected: user bubble and assistant reply appear. [ ] Pass [ ] Fail
3. Type custom message and tap Send. [ ] Pass [ ] Fail
4. Tap Bookmark on an assistant message. [ ] Pass [ ] Fail
5. Tap Share on a bookmark/message and verify native share sheet appears. [ ] Pass [ ] Fail
6. Tap Ingredient analyzer with short input (<10 chars). Expected: validation alert. [ ] Pass [ ] Fail
7. Paste valid ingredient list and tap Analyze ingredients. [ ] Pass [ ] Fail
8. Fill both product ingredient lists and tap Compare products. [ ] Pass [ ] Fail

Page result (Chat): [ ] Pass [ ] Fail
Notes:

---

## 8) Style DNA (/style-dna)

1. Open Style DNA from Home/Reports/Account. [ ] Pass [ ] Fail
2. Tap Refresh. [ ] Pass [ ] Fail
3. Verify identity snapshot fields render (or empty-state CTA). [ ] Pass [ ] Fail
4. Tap New analysis and verify navigation back to Home. [ ] Pass [ ] Fail

Page result (Style DNA): [ ] Pass [ ] Fail
Notes:

---

## 9) Progress (/progress)

1. Open Progress from Home/Reports/Account. [ ] Pass [ ] Fail
2. Tap Refresh. [ ] Pass [ ] Fail
3. Verify one of states renders correctly:
   - no analyses
   - single analysis
   - timeline with multiple analyses
   [ ] Pass [ ] Fail
4. Tap Open report from timeline item. [ ] Pass [ ] Fail

Page result (Progress): [ ] Pass [ ] Fail
Notes:

---

## 10) Studio tab (vault)

1. Open Studio tab and verify vault list loads. [ ] Pass [ ] Fail
2. Tap filter chips (all/canvas/report if present). [ ] Pass [ ] Fail
3. Tap sort options (newest/oldest/tool if present). [ ] Pass [ ] Fail
4. Tap a card to preview image modal. [ ] Pass [ ] Fail
5. Tap Actions and remove one test asset. [ ] Pass [ ] Fail
6. Enter bulk mode, select multiple assets, execute bulk delete. [ ] Pass [ ] Fail
7. Pull-to-refresh list and verify state consistency after deletes. [ ] Pass [ ] Fail

Page result (Studio tab): [ ] Pass [ ] Fail
Notes:

---

## 11) Studio Canvas create and canvas actions

### 11.1 Create canvas (/studio/canvas/create)

1. Tap Capture photo and complete camera flow. [ ] Pass [ ] Fail
2. Tap Choose from library and select image. [ ] Pass [ ] Fail
3. Tap Open Studio Canvas and verify navigation to /studio/canvas/[id]. [ ] Pass [ ] Fail

### 11.2 Canvas actions (/studio/canvas/[id])

1. Tap Run quick scan. [ ] Pass [ ] Fail
2. Tap Generate makeup look. [ ] Pass [ ] Fail
3. Tap Generate hair look. [ ] Pass [ ] Fail
4. Tap Generate outfit look. [ ] Pass [ ] Fail
5. Tap Share canvas and verify share sheet. [ ] Pass [ ] Fail
6. Tap revoke share (if active) and verify success state. [ ] Pass [ ] Fail

Page result (Studio Canvas): [ ] Pass [ ] Fail
Notes:

---

## 12) Report Studio tools

For one report ID, open each tool page and execute one generation.

- Makeup (/studio/makeup/[id]): [ ] Pass [ ] Fail
- Hair (/studio/hair/[id]): [ ] Pass [ ] Fail
- Glasses (/studio/glasses/[id]): [ ] Pass [ ] Fail
- Colors (/studio/colors/[id]): [ ] Pass [ ] Fail
- Outfits (/studio/outfits/[id]): [ ] Pass [ ] Fail

Notes:

---

## 13) Sign-out regression

1. While on authenticated page (report/chat/style-dna/progress), go to Account and tap Sign out. [ ] Pass [ ] Fail
2. Navigate back to Reports/Home actions/deep links for protected routes. Expected: redirect to Account, no crash. [ ] Pass [ ] Fail
3. Relaunch app and verify signed-out state persists correctly. [ ] Pass [ ] Fail

Page result (Sign-out regression): [ ] Pass [ ] Fail
Notes:

---

## Final run summary

- Total sections passed:
- Total sections failed:
- Blockers (P0):
- High severity (P1):
- Medium severity (P2):
- Go/No-go recommendation for internal rollout: [ ] Go [ ] No-go
