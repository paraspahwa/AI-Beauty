# Renovaara — Pricing Strategy & Cost Analysis

> Last updated: 2025 | Markets: India 🇮🇳 + International 🌍

---

## 1. Cost Per Report (AI Infrastructure)

| Service | Usage | Est. Cost per Report |
|---|---|---|
| GPT-4o (analysis + report) | ~4,000 tokens in / ~2,000 out | ~$0.05 |
| AWS Rekognition (face detection) | 1 image | ~$0.001 |
| FAL makeup-application | per generation (~$0.05–0.08 each) | ~$0.06 (1 gen avg) |
| FAL virtual-tryon | per generation (~$0.06–0.10 each) | ~$0.08 (1 gen avg) |
| FAL hair-change | per generation (~$0.05–0.08 each) | ~$0.06 (1 gen avg) |
| Supabase storage (images) | ~5 MB/report | ~$0.001 |
| Vercel compute | per request | ~$0.002 |
| **Total (no AI previews)** | | **~$0.07** |
| **Total (with 3 AI previews)** | | **~$0.27** |
| **Total (heavy user, 10 previews)** | | **~$0.87** |

> **Conclusion:** Safe margin starts at ₹199 / $3.99 for a single report with 1–2 previews.

---

## 2. Active Plans (v2 — 2025)

> Previous multi-tier model (Starter / Full / Glow) is retired. Two clear plans now live.

### 🇮🇳 India Pricing (INR)

| Plan | Price | Type | What's Included |
|---|---|---|---|
| **Free** | ₹0 | Always free | Face shape + colour intro (no AI studio) |
| **Report** | ₹299 | One-time per report | Full analysis + PDF + 5 AI Studio gens |
| **Studio Pro** | ₹999/mo | Recurring subscription | Unlimited reports + 150 AI gens/month + priority |

### 🌍 International Pricing (USD)

| Plan | Price | Type | What's Included |
|---|---|---|---|
| **Free** | $0 | Always free | Face shape + colour intro |
| **Report** | $3.99 | One-time per report | Full analysis + PDF + 5 AI Studio gens |
| **Studio Pro** | $12.99/mo | Recurring subscription | Unlimited reports + 150 AI gens/month + priority |

> **AI generation cap:** 150/month (soft limit — enforced server-side, not shown to users).
> At 130 gens a gentle "Fair-use threshold approaching" badge shows. At 150 returns 429.

---

## 3. Psychological Pricing Notes

### India
- ₹199 beats ₹200 psychological barrier — feels affordable
- ₹399 feels like a "special offer" vs ₹499+
- ₹599/mo is the Netflix/Spotify anchor users are familiar with
- Annual ₹4,999 is an easy "yes" when monthly is ₹599 (saves ₹2,189)

### International
- $3.99 entry is the App Store "impulse buy" threshold
- $9.99 is the established beauty/lifestyle app sweet spot
- $14.99/mo subscription targets the Vogue/Glamour reader who spends $15–50/mo on beauty content
- $99/yr is under the $100 mental block

---

## 4. Feature Gating per Plan

| Feature | Free | Report (₹299) | Studio Pro (₹999/mo) |
|---|---|---|---|
| Face shape + traits | ✅ | ✅ | ✅ |
| Colour analysis summary | ✅ | ✅ | ✅ |
| Skin analysis | ❌ | ✅ | ✅ |
| Spectacles guide | ❌ | ✅ | ✅ |
| Hairstyle guide | ❌ | ✅ | ✅ |
| Shopping guide | ❌ | ✅ | ✅ |
| AI Makeup Studio | ❌ | 5 gens (this report) | 150 gens/month (all reports) |
| Virtual Clothing Try-On | ❌ | counted in 5 | counted in 150 |
| AI Hair Colour Try-On | ❌ | counted in 5 | counted in 150 |
| PDF download | ❌ | ✅ | ✅ |
| Share link | ❌ | ✅ | ✅ |
| Multiple reports | ❌ | 1 (this unlock) | Unlimited |
| Priority AI queue | ❌ | ❌ | ✅ |

---

## 5. Razorpay Integration (India)

- Use **Razorpay** for INR payments (already partially integrated)
- Offer UPI, Net Banking, Cards, EMI (no-cost EMI on ₹399+ via HDFC/ICICI)
- Enable **Razorpay Subscriptions** for Glow Monthly/Annual plan
- Add **Razorpay Smart Collect** for international card fallback

### Payment flow
```
User clicks "Get Full Report" 
  → Select currency (INR / USD auto-detected by IP)
  → Razorpay (INR) OR Stripe (USD)
  → Webhook confirms payment
  → report.is_paid = true
  → User redirected to /report/[id]
```

---

## 6. Go-to-Market Recommendations

### India 🇮🇳
1. **Instagram Reels** — "I tried AI makeup try-on" transformation content (zero spend, organic)
2. **Nykaa / Myntra adjacent SEO** — target "best lipstick for oval face", "glasses for round face" keywords
3. **Influencer seeding** — 5–10 micro influencers (10k–100k followers) in beauty/fashion niche, offer free Full reports
4. **Referral program** — "Share your report, get ₹50 off next one" (low CAC)
5. **Festive pricing** — Diwali / Valentine's / wedding season promotions (20–30% off)

### International 🌍
1. **TikTok + YouTube Shorts** — "My AI stylist told me..." format
2. **Pinterest SEO** — style inspiration boards with "find your face shape" pins
3. **Product Hunt launch** — #1 Product of the Day target (free traffic spike)
4. **AppSumo / StackSocial** — lifetime deal ($49) for early international user acquisition
5. **Google Ads** — target "virtual makeup try-on", "AI hair color" (CPC ~$0.80–1.20)

---

## 7. Unit Economics (Target)

| Metric | India | International |
|---|---|---|
| Target price | ₹399 | $9.99 |
| AI cost per report | ₹23 (~$0.27) | $0.27 |
| Payment gateway (2%) | ₹8 | $0.20 |
| Infra (Vercel + Supabase) | ₹5 | $0.06 |
| **Gross margin** | **₹363 (~91%)** | **$9.46 (~95%)** |
| Break-even (infra $50/mo) | ~9 reports/mo | ~6 reports/mo |

---

## 8. Implementation Status

### ✅ Phase 1 — Done (Code shipped)
- [x] `plans` + `subscriptions` + `usage_counters` tables added (`0019_plans_subscriptions.sql`)
- [x] `plan_tier` enum (`free` / `report` / `studio_pro`) with RPCs for entitlement + quota
- [x] AI generation routes (makeup, virtual-tryon, hair-color) gated by tier + monthly counter
- [x] `src/lib/entitlement.ts` — `getStudioEntitlement()` helper
- [x] Subscription create / verify / cancel API routes (`/api/subscriptions/*`)
- [x] Razorpay webhook expanded for `subscription.*` lifecycle events
- [x] `Paywall.tsx` redesigned — two-plan cards (Report ₹299 + Studio Pro ₹999/mo)
- [x] `AIBeautyStudio.tsx` — quota banner (remaining gens + reset date)
- [x] Landing page pricing updated — 3-card layout (Free / Report / Studio Pro)
- [x] `env.ts` + `public-env.ts` — new price env vars and Razorpay plan ID vars added

### 🟡 Phase 2 — Manual / Pending (This week)
- [ ] Run `supabase db push` → applies `0019_plans_subscriptions.sql`
- [ ] Create Razorpay subscription plans in dashboard → set `RAZORPAY_PLAN_ID_STUDIO_PRO_INR` + `RAZORPAY_PLAN_ID_STUDIO_PRO_USD`
- [ ] Enable `subscription.*` webhook events in Razorpay dashboard
- [ ] Verify all price env vars are set in Vercel (`NEXT_PUBLIC_PRICE_REPORT_INR=299`, etc.)
- [ ] Wire `/api/subscriptions/cancel` into an account/billing settings page

### 🔵 Phase 3 — Roadmap (2–4 weeks)
- [ ] Stripe integration for USD subscriptions (alternative to Razorpay international)
- [ ] Subscription management page (view plan, cancel, billing history)
- [ ] Referral tracking (simple UUID-based, ₹50 credit)
- [ ] Festive discount coupon system
- [ ] Analytics dashboard (MRR, AI cost per user, conversion rate)

---

*Reviewed by: Jarvis — AI-Beauty Orchestration Layer*

