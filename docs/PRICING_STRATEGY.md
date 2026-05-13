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

## 2. Proposed Plans

### 🇮🇳 India Pricing (INR)

| Plan | Price | What's Included | Target |
|---|---|---|---|
| **Free** | ₹0 | Face shape + intro (no AI previews) | Acquisition / top of funnel |
| **Starter** | ₹199 | Full report + 3 AI studio generations | Students, first-time users |
| **Full Report** | ₹399 | Full report + 10 AI studio generations + PDF | Working professionals |
| **Glow Monthly** | ₹599/mo | Unlimited reports + 30 AI generations/mo + priority | Power users, fashion lovers |
| **Glow Annual** | ₹4,999/yr | Same as monthly, 30% saving | Loyalists |

> **Current live price:** ₹399 (mapped from $9.99). Recommendation: **drop to ₹399** for India to maximize conversion vs. cost margin.

---

### 🌍 International Pricing (USD)

| Plan | Price | What's Included | Target |
|---|---|---|---|
| **Free** | $0 | Face shape + intro (no AI previews) | Acquisition |
| **Starter** | $3.99 | Full report + 3 AI studio generations | Casual users |
| **Full Report** | $9.99 | Full report + 10 AI studio generations + PDF | Core target ✅ (current) |
| **Glow Monthly** | $14.99/mo | Unlimited reports + 30 AI generations/mo + priority | Enthusiasts |
| **Glow Annual** | $99/yr | Same as monthly, 44% saving | Loyalists |

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

| Feature | Free | Starter | Full | Glow |
|---|---|---|---|---|
| Face shape + traits | ✅ | ✅ | ✅ | ✅ |
| Color analysis summary | ✅ | ✅ | ✅ | ✅ |
| Skin analysis | ❌ | ✅ | ✅ | ✅ |
| Spectacles guide | ❌ | ✅ | ✅ | ✅ |
| Hairstyle guide | ❌ | ✅ | ✅ | ✅ |
| Shopping guide | ❌ | ✅ | ✅ | ✅ |
| AI Makeup Studio (granular) | ❌ | 3 gens | 10 gens | 30/mo |
| Virtual Clothing Try-On | ❌ | 2 gens | 5 gens | 15/mo |
| AI Hair Color Try-On | ❌ | 1 gen | 5 gens | 10/mo |
| PDF download | ❌ | ❌ | ✅ | ✅ |
| Share link | ❌ | ✅ | ✅ | ✅ |
| Priority AI queue | ❌ | ❌ | ❌ | ✅ |
| Multiple reports | ❌ | 1 | 1 | Unlimited |

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

## 8. Next Implementation Steps

### Phase 1 (Now — 1 week)
- [ ] Add `plan` column to `reports` table (free / starter / full / glow)
- [ ] Gate AI generation count per plan in the studio route
- [ ] Add Razorpay plan IDs for subscription tiers
- [ ] Update pricing UI on landing page (dual currency toggle IN ↔ USD)

### Phase 2 (2–4 weeks)
- [ ] Stripe integration for USD subscriptions
- [ ] Usage counter per user per month (AI generations)
- [ ] Subscription management dashboard
- [ ] Referral tracking (simple UUID-based)

### Phase 3 (1–2 months)
- [ ] Influencer/affiliate link generation
- [ ] Festive discount coupon system
- [ ] AppSumo lifetime deal listing
- [ ] Analytics dashboard (MRR, conversion rate, AI cost per user)

---

*Reviewed by: Jarvis — AI-Beauty Orchestration Layer*

