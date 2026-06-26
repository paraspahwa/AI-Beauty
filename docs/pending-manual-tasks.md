# Renovaara — Pending Manual Tasks (Vercel + External)

These require action outside the codebase. All code changes are already deployed/committed.

## ✅ Completed in Code (report-only refactor)

- Upload → analyze → one-time Razorpay unlock → 7-section report
- `POST /api/internal/trigger-previews` (hairstyle, glasses, hair colour only)
- Style Guide pipeline stage + `reports.style_guide` column (migration `0024`)
- Studio, subscriptions, chat, sharing, Blueprint, admin/eval tooling removed
- Mobile app aligned to report-only tabs (Home, Reports, Account)

## 🔴 P1 — Do First (Revenue / Broken)

1. **App URL** — Set in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_APP_URL` = `https://<your-production-domain>`

2. **Verify live prices** — Set/verify in Vercel:
   - `NEXT_PUBLIC_PRICE_REPORT_INR` = `299`
   - `NEXT_PUBLIC_PRICE_REPORT_USD` = `3.99`

3. **Apply migrations** — `supabase db push` (includes `0024_style_guide.sql`, `0025_report_only_cleanup.sql`)

## 🟡 P2 — Do This Week

4. **OG image + favicon** — Create and commit to `public/`:
   - `og-image.png` — 1200×630 px (dark obsidian bg, Renovaara logo + tagline)
   - `favicon.ico` — 48×48 px
   - `apple-touch-icon.png` — 180×180 px
   - Tool: https://realfavicongenerator.net (upload 512×512 SVG → generates all sizes)

5. **Receipt emails** — Set in Vercel env vars:
   - `RESEND_API_KEY` = your Resend API key (free tier: 3,000 emails/mo at https://resend.com)
   - Payment webhook receipt email is already wired — just needs key

6. **Google Search Console** — Verify domain ownership:
   - Go to https://search.google.com/search-console
   - Add property → URL prefix → your domain
   - Get verification code → add to `src/app/layout.tsx` metadata: `verification: { google: "YOUR_CODE" }`
   - Submit sitemap: `https://<domain>/sitemap.xml`

## 🟢 P3 — This Month

7. **Razorpay international payments** — Enable in Razorpay dashboard under "International Payments"
   - Allows USD-paying users to pay via card

~~8. Subscription tiers~~ — Removed in report-only product (one-time unlock only).

