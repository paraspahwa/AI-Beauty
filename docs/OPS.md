# Operations Guide

All external services used by Renovaara, how to access them, and what env vars they need.

---

## 1. Hosting — Vercel

| Item | Detail |
|---|---|
| **Dashboard** | https://vercel.com/paraspahwa/ai-beauty |
| **Production URL** | Set by `NEXT_PUBLIC_APP_URL` env var |
| **Logs** | Vercel Dashboard → Deployments → Inspect → Logs |
| **Cron / Background** | `maxDuration: 60` requires Pro plan |
| **Env vars** | All variables from `.env.example` must be set in Vercel project settings |

**Deploy:** Push to `main` → auto-deploys. Manual: Vercel Dashboard → Deploy.

---

## 2. Database — Supabase

| Item | Detail |
|---|---|
| **Dashboard** | https://supabase.com/dashboard |
| **Project** | Check `NEXT_PUBLIC_SUPABASE_URL` for project ref |
| **SQL Editor** | Supabase Dashboard → SQL Editor |
| **Migrations** | `supabase/migrations/*.sql` — run in order |
| **RLS Policies** | Applied via migrations |

**Apply new migrations:**
```sql
-- Copy-paste each file from supabase/migrations/ into SQL Editor and run
-- Files must be run in order (0001, 0002, … 0028)
```

**Key tables created by recent migrations:**
| Migration | Tables/Changes |
|---|---|
| `0027_referral_program.sql` | `referral_code`, `referred_by`, `referral_credits` on `profiles`; `referral_redemptions` table |
| `0028_coupon_codes.sql` | `coupon_codes` table; `apply_coupon()` function |

**Seed influencer coupon codes:**
```sql
insert into public.coupon_codes (code, discount_type, discount_value, max_uses, note)
values
  ('FREE100', 'percentage', 100, 50, 'Launch promo — 100% off'),
  ('BEAUTY50', 'percentage', 50, 100, 'Influencer — 50% off');
```

---

## 3. Email — Resend

| Item | Detail |
|---|---|
| **Dashboard** | https://resend.com |
| **API Keys** | Resend Dashboard → API Keys |
| **Env var** | `RESEND_API_KEY=re_...` |
| **Sending domain** | Must verify domain in Resend (e.g. `renovaara.in`) |
| **From address** | `noreply@<your-domain>` (set in `src/lib/email.ts`) |

**Emails sent:**
| Trigger | Email | File |
|---|---|---|
| User signs up | Welcome email | `src/app/auth/callback/route.ts` |
| Analysis completes | Report-ready notification | `src/app/api/analyze/route.ts` |

**To test in dev:** No API key needed — falls back to `console.log`.

---

## 4. Analytics — Plausible + PostHog

The app supports two analytics providers. Configure whichever you prefer.

### Plausible (recommended — privacy-first)

| Item | Detail |
|---|---|
| **Dashboard** | https://plausible.io |
| **Setup** | Add domain in Plausible → Settings → Add website |
| **Env var** | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=renovaara.in` |
| **Script** | Auto-loaded by `src/components/AnalyticsScripts.tsx` |
| **CSP** | `plausible.io` already whitelisted in `next.config.js` |

### PostHog

| Item | Detail |
|---|---|
| **Dashboard** | https://app.posthog.com |
| **Env var** | `NEXT_PUBLIC_POSTHOG_KEY=phc_...` |
| **Env var (optional)** | `NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com` |
| **CSP** | `app.posthog.com`, `i.posthog.com` already whitelisted |

### Events tracked automatically

| Event | When | File |
|---|---|---|
| `page_view` | Every route change | `src/components/PageViewTracker.tsx` |
| `unlock_analysis` | Payment initiated | `src/components/Paywall.tsx` |
| `download_pdf` | PDF downloaded | `src/components/report/PdfDownloadShare.tsx` |
| `share_report` | Report shared (any platform) | `src/components/report/PdfDownloadShare.tsx` |
| `share_infographic` | Infographic shared | `src/components/report/InfographicShareButton.tsx` |
| `generate_share_card` | Share card generated | `src/components/report/SeasonShareCard.tsx` |
| `download_share_card` | Share card downloaded | `src/components/report/SeasonShareCard.tsx` |
| `share_card` | Share card posted to social | `src/components/report/SeasonShareCard.tsx` |
| `share_referral` | Referral link shared | `src/components/referral/ReferralProgram.tsx` |
| `copy_referral_link` | Referral link copied | `src/components/referral/ReferralProgram.tsx` |

---

## 5. Payments — Razorpay

| Item | Detail |
|---|---|
| **Dashboard** | https://dashboard.razorpay.com |
| **Test mode** | Dashboard → Settings → Test mode |
| **Webhooks** | Dashboard → Settings → Webhooks → Add endpoint |
| **Webhook URL** | `https://<your-domain>/api/webhooks/razorpay` |
| **Events to send** | `payment.captured`, `payment.failed` |

**Env vars:**
| Var | Where to find |
|---|---|
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Dashboard → API Keys |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | Set when creating webhook in Razorpay Dashboard |

**Test mode:** Set `PAYMENT_TEST_MODE=true` in `.env.local` for local testing.

---

## 6. AI Providers

### OpenAI

| Item | Detail |
|---|---|
| **Dashboard** | https://platform.openai.com |
| **Env var** | `OPENAI_API_KEY=sk-...` |
| **Models** | `gpt-4o` (vision), `gpt-4o-mini` (all other stages) |

### AWS Rekognition

| Item | Detail |
|---|---|
| **Console** | https://console.aws.amazon.com/rekognition |
| **Region** | `us-east-1` (set via `AWS_REGION`) |
| **Env vars** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |

### FAL.ai (image generation)

| Item | Detail |
|---|---|
| **Dashboard** | https://fal.ai/dashboard |
| **Env var** | `FAL_KEY` |

### Replicate (image generation)

| Item | Detail |
|---|---|
| **Dashboard** | https://replicate.com/account |
| **Env var** | `REPLICATE_API_TOKEN=r8_...` |

---

## 7. Storage — Supabase Storage

| Item | Detail |
|---|---|
| **Bucket** | Set via `SUPABASE_STORAGE_BUCKET` (default: `selfies`) |
| **Dashboard** | Supabase Dashboard → Storage |
| **URL format** | `https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>` |

---

## 8. Affiliate Commerce (Amazon)

| Item | Detail |
|---|---|
| **Associates Tag** | `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` (set in env) |
| **Product links** | Hardcoded tag `renovaara-21` in `ProductRecommendations.tsx` |
| **Dashboard** | https://affiliate-program.amazon.com |

---

## 9. All Environment Variables

See `.env.example` for the complete list with descriptions. Key vars to set for production:

```
NEXT_PUBLIC_APP_URL              # Production URL
NEXT_PUBLIC_SUPABASE_URL         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY        # Supabase service role (server-side)
OPENAI_API_KEY                   # OpenAI
AWS_ACCESS_KEY_ID                # AWS Rekognition
AWS_SECRET_ACCESS_KEY            # AWS Rekognition
NEXT_PUBLIC_RAZORPAY_KEY_ID      # Razorpay public key
RAZORPAY_KEY_SECRET              # Razorpay secret
RAZORPAY_WEBHOOK_SECRET          # Razorpay webhook secret
RESEND_API_KEY                   # Transactional emails
NEXT_PUBLIC_PLAUSIBLE_DOMAIN     # Plausible analytics domain
```

---

## 10. Monitoring & Alerts

| Service | What to watch |
|---|---|
| Vercel | Deploy logs, function errors, edge function timeouts |
| Supabase | Database CPU, connection pool, storage usage |
| Razorpay | Failed payments, webhook delivery status |
| Plausible | Traffic spikes, bounce rate, conversion funnel |
| Resend | Email delivery rate, bounce rate |
