# StyleAI — Pending Manual Tasks (Vercel + External)

These require action outside the codebase. All code changes are already deployed/committed.

## 🔴 P1 — Do First (Revenue / Broken)

1. **Affiliate tags** — Register accounts, then set in Vercel env vars:
   - `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` = your Amazon Associates India tag (e.g. `styleai-21`)
   - `NEXT_PUBLIC_MYNTRA_AFFILIATE_SID` = your Admitad/VCommission SID for Myntra
   - Register at: https://associates.amazon.in | https://www.myntra.com/affiliate

2. **App URL** — Set in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_APP_URL` = `https://<your-production-domain>`
   - Fixes sitemap.xml + robots.txt URLs (currently fallback to `https://styleai.app`)

3. **Verify live price** — Confirm `NEXT_PUBLIC_PAID_PRICE_INR` is set to correct value (₹829, not ₹399 default)

## 🟡 P2 — Do This Week

4. **OG image + favicon** — Create and commit to `public/`:
   - `og-image.png` — 1200×630 px (dark obsidian bg, StyleAI logo + tagline)
   - `favicon.ico` — 48×48 px
   - `apple-touch-icon.png` — 180×180 px
   - Tool: https://realfavicongenerator.net (upload 512×512 SVG → generates all sizes)

5. **Receipt + refund emails** — Set in Vercel env vars:
   - `RESEND_API_KEY` = your Resend API key (free tier: 3,000 emails/mo at https://resend.com)
   - `REFUND_NOTIFY_EMAIL` = internal email to receive refund request notifications
   - `/api/payments/refund` and webhook receipt email are already wired — just needs keys

6. **Google Search Console** — Verify domain ownership:
   - Go to https://search.google.com/search-console
   - Add property → URL prefix → your domain
   - Get verification code → add to `src/app/layout.tsx` metadata: `verification: { google: "YOUR_CODE" }`
   - Submit sitemap: `https://<domain>/sitemap.xml`

## 🟢 P3 — This Month

7. **Flipkart affiliate** — Add Flipkart affiliate links to `WardrobeCapsuleCard.tsx` and `src/lib/affiliates.ts`
   - Register at: https://affiliate.flipkart.com

8. **Razorpay international payments** — Enable in Razorpay dashboard under "International Payments"
   - Allows USD-paying users to pay via card without Stripe

9. **Subscription tiers** — Implement Glow Monthly (₹599) + Glow Annual (₹4,999) per `docs/PRICING_STRATEGY.md`
   - Needs: `supabase/migrations/0019_subscriptions.sql` + Razorpay subscription API
