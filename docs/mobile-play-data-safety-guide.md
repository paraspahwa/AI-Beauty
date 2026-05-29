# Mobile Play Data Safety Guide (Pre-Fill)

Date: 2026-05-29
Scope: Android Play Console -> App content -> Data safety
Package: com.paraspahwa.renovaaramobile

This document is an implementation-guided draft to speed up Play Console completion. Final legal/compliance confirmation should be done by your business owner or legal reviewer.

## Evidence basis in code

- Auth/session persistence: `apps/mobile/lib/supabase.ts`
- Photo upload and AI workflows: `apps/mobile/lib/api.ts`, `apps/mobile/app/(tabs)/home.tsx`, `apps/mobile/app/studio/**`
- Browser checkout handoff: `apps/mobile/app/(tabs)/account.tsx`, `apps/mobile/app/report/[id].tsx`
- Public privacy policy page: `src/app/privacy/page.tsx`

## Recommended high-level toggles

## Data collection
- Set to: Yes
- Reason: app collects account and user-provided image/content data for core functionality.

## Data sharing
- Set to: Yes (limited processors)
- Reason: app shares required data with service providers (for analysis, auth, payments, email, hosting).

## Security practices
- Data encrypted in transit: Yes
- User can request deletion: Yes (per privacy policy and account/report delete flows)

## Data types matrix (suggested)

1. Personal info -> Email address
- Collected: Yes
- Shared: Yes (service providers)
- Required for app functionality: Yes
- Purpose: Account management, app functionality, fraud prevention/security, communications

2. Photos and videos -> User images/selfies
- Collected: Yes
- Shared: Yes (AI processing + infrastructure processors)
- Required for app functionality: Yes
- Purpose: App functionality, personalization

3. App activity -> In-app interactions/content (chat prompts, style preferences, generated results)
- Collected: Yes
- Shared: Limited (service providers required to process features)
- Required for app functionality: Yes
- Purpose: App functionality, analytics, personalization

4. Financial info -> Purchase context/order metadata (not raw card details)
- Collected: Yes (indirectly via backend/payment flow)
- Shared: Yes (payment processor)
- Required for app functionality: Only for paid features
- Purpose: Purchases, fraud prevention/security

5. Device or other identifiers -> Auth/session/request identifiers
- Collected: Yes (operational/security context)
- Shared: Limited processors
- Required for app functionality: Yes
- Purpose: App functionality, fraud prevention/security

## Not declared as collected (based on current mobile code)

- Contacts
- Precise location
- Audio recordings/microphone content
- SMS/Call logs

Note: RECORD_AUDIO permission has been removed from app config, and no audio capture flow is present in `apps/mobile/**`.

## Processor mapping (from current privacy policy)

- Supabase: auth/database/session
- OpenAI: AI analysis of uploaded images/prompts
- Razorpay: payment processing
- Resend: transactional email
- Vercel: hosting and request-level operational logs

## Draft answers for Play Data Safety prompts

1. Does your app collect or share any required user data types?
- Suggested: Yes

2. Is all user data encrypted in transit?
- Suggested: Yes

3. Do you provide a way for users to request that their data is deleted?
- Suggested: Yes

4. Are any data types collected for analytics?
- Suggested: Yes (app activity/usage signals)

5. Are any data types collected for advertising or marketing?
- Suggested: No direct ad-network data collection indicated in mobile implementation

## Known caveats to confirm before final submit

- Verify exact analytics payload details (if any additional SDK telemetry is added later).
- Confirm whether any crash/performance monitoring SDK is enabled in production; if added, update this matrix.
- Ensure privacy policy URL in Play Console points to the live production domain, e.g. `https://<your-domain>/privacy`.

## Quick completion workflow

1. Open Play Console -> App content -> Data safety.
2. Apply responses from the matrix above.
3. Cross-check with `docs/mobile-play-console-checklist.md`.
4. Submit draft for policy review.
5. If Play flags a mismatch, update this doc and app disclosures together.
