# Mobile Manual QA Checklist (All Main Pages)

Date: 2026-06-03
Target: Android emulator via Android Studio
Reference run setup: [docs/mobile-android-studio-step-by-step.md](docs/mobile-android-studio-step-by-step.md)
Quick tester version: [docs/mobile-manual-qa-one-page-2026-06-03.md](docs/mobile-manual-qa-one-page-2026-06-03.md)

## Test Session Info

- Tester:
- Device/AVD:
- Build SHA/Branch:
- API base URL:
- Start time:
- End time:

## Quick Exit Criteria

- No crash across home -> analyze -> report -> studio -> chat -> account flows.
- Report tabs render correctly (face, skin, hair, glasses, studio, shop).
- Locked vs unlocked states are clear and recover after payment return.
- Core studio generators return images or safe empty/error states.

---

## A. Auth + App Entry

1. Open app from emulator launcher.
2. Confirm app boot without runtime red screen.
3. Go to Account tab and sign in.
4. Close app and reopen; confirm session persistence.
5. Sign out and sign back in.

Pass/Fail: 
Notes:

---

## B. Home + Intent + Analysis

Route: `/(tabs)/home`

1. Validate intent cards:
   - Complete Analysis
   - Studio Pro
2. Switch between intents and confirm button labels update.
3. Pick selfie from gallery.
4. Confirm navigation to analysis loading screen.
5. Wait until redirected to report.
6. Repeat with camera capture path.

Expected:
- Intent selection persists into analysis start.
- No stuck loading after backend is reachable.

Pass/Fail:
Notes:

---

## C. Report Screen Core

Route: `/report/[id]`

1. Confirm report header, image, and status chips render.
2. Swipe/press through all tabs:
   - Face
   - Skin
   - Hair
   - Glasses
   - Studio
   - Shop
3. Validate section-level lock cards for unpaid report.
4. Validate unlocked content for paid report account.
5. Use share action and revoke action.
6. Use "Open web report for PDF" action.

Expected:
- No blank screens.
- No undefined/unsafe data crashes.
- Lock state copy is clear and contextual.

Pass/Fail:
Notes:

---

## D. Report Tab Detail Checks

### D1. Face Tab

1. Face shape card visible when data exists.
2. Color analysis card shows season + palette chips.
3. Landmark and palette visual cards:
   - Render image when available.
   - Show safe empty text when missing.

Pass/Fail:
Notes:

### D2. Skin Tab

1. Paid: shows skin type/concerns/zones.
2. Unpaid: shows locked section with unlock options.

Pass/Fail:
Notes:

### D3. Hair Tab

1. Paid: hairstyle guide visible.
2. Hairstyle preview gallery works.
3. "Open hair color studio" navigates correctly.

Pass/Fail:
Notes:

### D4. Glasses Tab

1. Paid: glasses recommendations visible.
2. Glasses previews gallery works.
3. "Open glasses studio" navigates correctly.

Pass/Fail:
Notes:

### D5. Studio Tab

1. Buttons navigate to makeup/hair/glasses/outfits studios.
2. Makeup previews gallery renders if available.
3. Saved visuals list supports open preview + remove.

Pass/Fail:
Notes:

### D6. Shop Tab

1. Summary card visible.
2. Color swatch gallery renders safely.
3. Chat/open color studio/share actions work.

Pass/Fail:
Notes:

---

## E. Studio Tools

### E1. Makeup Studio
Route: `/studio/makeup/[id]`

1. Custom mode generation works.
2. Inspo mode:
   - Pick reference image
   - Generate transfer
   - Detected look shows
3. Save flow writes to report saved visuals.

Pass/Fail:
Notes:

### E2. Hair Studio
Route: `/studio/hair/[id]`

1. Custom color/style generation works.
2. Inspo mode transfer works.
3. Applied controls text renders.

Pass/Fail:
Notes:

### E3. Glasses Studio
Route: `/studio/glasses/[id]`

1. Reference image picker works.
2. Try-on generation returns output or safe error.

Pass/Fail:
Notes:

### E4. Outfit Studio
Route: `/studio/outfits/[id]`

1. Generate outfits.
2. Feedback toggles and history persist.

Pass/Fail:
Notes:

### E5. Color Swatch Studio
Route: `/studio/colors/[id]`

1. Slot generation/retry actions work.
2. Report reflects generated swatches.

Pass/Fail:
Notes:

### E6. Canvas Studio
Routes:
- `/studio/canvas/create`
- `/studio/canvas/[id]`

1. Canvas upload succeeds.
2. Scan color works.
3. Generate (makeup/hair/outfit) works.
4. Share/revoke actions work.

Pass/Fail:
Notes:

---

## F. Chat + Progress + Style DNA

### F1. Style Chat
Route: `/chat/[id]`

1. Send message and receive assistant response.
2. Bookmark save/delete works.

Pass/Fail:
Notes:

### F2. Progress
Route: `/progress`

1. Timeline/charts render.
2. No crash with sparse data.

Pass/Fail:
Notes:

### F3. Style DNA
Route: `/style-dna`

1. Summary data renders.
2. Empty state graceful for new users.

Pass/Fail:
Notes:

---

## G. Payment / Unlock Recovery UX

1. Trigger report unlock flow from locked section.
2. Confirm browser handoff opens correctly.
3. Return to app and use refresh/retry CTAs.
4. Confirm status updates without stale banner.
5. In Account tab, test "Open Studio Pro checkout again" recovery action.

Pass/Fail:
Notes:

---

## H. Security and Error Handling Spot Checks

1. With backend stopped, confirm API timeout errors are user-readable (no raw stack dump).
2. With invalid image upload, confirm safe validation message appears.
3. Confirm no debug secrets are shown in UI.

Pass/Fail:
Notes:

---

## Final Sign-off Matrix

- Auth flows: Pass / Fail
- Home + analysis: Pass / Fail
- Report tabs (6/6): Pass / Fail
- Studio tools: Pass / Fail
- Chat/Progress/Style DNA: Pass / Fail
- Payment recovery: Pass / Fail
- Security/error handling: Pass / Fail

Overall release confidence: Low / Medium / High
Blockers:
Follow-up tasks:
