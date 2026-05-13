# Renovaara — Pending Manual Tasks (Vercel + External)

These require action outside the codebase. All code changes are already deployed/committed.

## 🔴 P1 — Do First (Revenue / Broken)

1. **Affiliate tags** — Register accounts, then set in Vercel env vars:
   - `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` = your Amazon Associates India tag (e.g. `Renovaara-21`)
   - `NEXT_PUBLIC_MYNTRA_AFFILIATE_SID` = your Admitad/VCommission SID for Myntra
   - Register at: https://associates.amazon.in | https://www.myntra.com/affiliate

2. **App URL** — Set in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_APP_URL` = `https://<your-production-domain>`
   - Fixes sitemap.xml + robots.txt URLs (currently fallback to `https://renovaara.in`)

3. **Verify live prices** — Set/verify in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_PRICE_REPORT_INR` = `299` (one-time report unlock, INR)
   - `NEXT_PUBLIC_PRICE_REPORT_USD` = `3.99` (one-time report unlock, USD)
   - `NEXT_PUBLIC_PRICE_STUDIO_PRO_INR` = `999` (Studio Pro monthly, INR)
   - `NEXT_PUBLIC_PRICE_STUDIO_PRO_USD` = `12.99` (Studio Pro monthly, USD)
   - Remove old `NEXT_PUBLIC_PAID_PRICE_INR` / `NEXT_PUBLIC_PAID_PRICE_USD` once verified
   - ⚠️ Do NOT set `NEXT_PUBLIC_PAID_PRICE_INR=399` — the new report plan is ₹299

## 🟡 P2 — Do This Week

4. **OG image + favicon** — Create and commit to `public/`:
   - `og-image.png` — 1200×630 px (dark obsidian bg, Renovaara logo + tagline)
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

9. **Subscription tiers — Razorpay plan setup** — Create plans in [Razorpay dashboard](https://dashboard.razorpay.com) under Subscriptions → Plans, then set in Vercel:
   - Plan name: `Studio Pro INR Monthly` · Amount: ₹999 · Interval: monthly → copy Plan ID
   - Plan name: `Studio Pro USD Monthly` · Amount: $12.99 · Interval: monthly → copy Plan ID
   - `RAZORPAY_PLAN_ID_STUDIO_PRO_INR` = `plan_XXXXXXXXXXXXXX`
   - `RAZORPAY_PLAN_ID_STUDIO_PRO_USD` = `plan_XXXXXXXXXXXXXX`
   - Also add these Razorpay webhook events in dashboard: `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`
   - Run migration: `supabase db push` → applies `0019_plans_subscriptions.sql`

