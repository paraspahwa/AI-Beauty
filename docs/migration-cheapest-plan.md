# AI-Beauty — Cheapest Migration Guide + Pricing Strategy

## Executive Summary

Forget Kubernetes. The cheapest path to microservices isolation is:
**Vercel (free) + Fly.io ($3–5/mo) + Upstash Redis (free) + Supabase (free)**

Total infra cost: **$3–10/month** vs $150–400/month for Kubernetes.

---

## Current AI Cost Per Analysis (Actual Numbers)

### Per-report cost breakdown (one user submits one selfie):

| Step | Service | What Happens | Est. Cost |
|------|---------|--------------|-----------|
| Image compression | Sharp (free) | Resize to 512px | $0 |
| Face detection | AWS Rekognition `DetectFaces` | 1 API call | ~$0.001 |
| Face shape | GPT-4o-mini Vision | ~800 input tokens + image | ~$0.002 |
| Color analysis | GPT-4o Vision | ~1200 input tokens + image | ~$0.006 |
| Skin analysis | GPT-4o Vision | ~1000 input tokens + image | ~$0.005 |
| Features (eyes/nose/lips) | GPT-4o-mini | ~600 input tokens | ~$0.001 |
| Glasses recommendations | GPT-4o-mini | ~500 input tokens | ~$0.001 |
| Hairstyle recommendations | GPT-4o-mini | ~500 input tokens | ~$0.001 |
| Summary compilation | GPT-4o-mini | ~800 input tokens | ~$0.001 |
| Color swatch previews (12x) | Replicate flux-kontext-fast | 12 × ~$0.003 | ~$0.036 |
| **Total per analysis** | | | **~$0.054** |

### Monthly AI cost at different user volumes:

| Users/Month | Reports | AI Cost | Infra Cost | Total Cost |
|-------------|---------|---------|------------|------------|
| 50 | 50 | ~$2.70 | $3–5 | **~$6–8** |
| 200 | 200 | ~$10.80 | $5–8 | **~$16–19** |
| 500 | 500 | ~$27.00 | $8–10 | **~$35–37** |
| 1,000 | 1,000 | ~$54.00 | $10–15 | **~$64–69** |
| 5,000 | 5,000 | ~$270.00 | $15–25 | **~$285–295** |

> **Key insight:** At current scale, AI costs dominate — infra is almost free.
> Break-even at ₹99/report India or $2.99/report abroad needs only ~2 users/month.

---

## Recommended Infrastructure Stack (Cheapest)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT (keep as-is)                         │
│                                                                 │
│  Vercel Hobby (FREE)                                            │
│  ├── Next.js frontend                                           │
│  ├── /api/analyze          (60s limit — fine for GPT pipeline)  │
│  ├── /api/chat             (streaming SSE)                      │
│  ├── /api/reports/*        (CRUD, PDF)                          │
│  ├── /api/payments/*       (Razorpay)                           │
│  └── /api/admin/*          (canary stats)                       │
│                                                                 │
│  Supabase Free Tier                                             │
│  ├── PostgreSQL DB                                              │
│  ├── Auth (SSR sessions)                                        │
│  └── Storage (selfies + visual assets)                          │
└─────────────────────────────────────────────────────────────────┘
							  │
							  │ publish job (non-blocking)
							  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ADD (NEW — $3–5/month)                       │
│                                                                 │
│  Upstash Redis (FREE — 10k cmds/day)                           │
│  └── visuals:queue  (job list)                                  │
│  └── visuals:retry  (retry list)                                │
│                                                                 │
│  Fly.io visual-gen-worker ($3–5/month shared-cpu-1x 256MB)     │
│  ├── Polls Upstash queue every 30s                              │
│  ├── Runs all 12 Replicate swatch jobs (no timeout limit)       │
│  ├── Runs Sharp image processing                                │
│  └── Writes results to Supabase Storage                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Migration Guide

---

### PHASE 0 — Preparation (Day 1, 30 minutes)

#### Step 0.1 — Create Upstash account
1. Go to https://upstash.com → Sign up (free)
2. Create a new Redis database → Region: `ap-south-1` (Mumbai)
3. Copy these two values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Add to `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxx
   ```

#### Step 0.2 — Create Fly.io account
1. Go to https://fly.io → Sign up (free)
2. Install flyctl: `npm install -g @flydotio/flyctl` or follow https://fly.io/docs/hands-on/install-flyctl/
3. Run `flyctl auth login`

#### Step 0.3 — Add Upstash Redis to project
```bash
npm install @upstash/redis
```

---

### PHASE 1 — Wire Upstash Queue into Analyze Route (Day 1, 1 hour)

**Goal:** Replace the fragile fire-and-forget HTTP call with a durable queue push.

#### What changes in `src/app/api/analyze/route.ts`:

**Before (current):**
```typescript
// Fragile — lost if Vercel pod recycles mid-flight
kickOffVisualsInBackground(report.id, env.app.url, env.internal.secret)
```

**After:**
```typescript
import { Redis } from "@upstash/redis";
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Durable — job survives pod recycling
await redis.lpush("visuals:queue", JSON.stringify({
  reportId: report.id,
  userId: user.id,
  enqueuedAt: Date.now(),
}));
```

**Add to `env.ts`:**
```typescript
upstash: {
  redisUrl: optional(process.env.UPSTASH_REDIS_REST_URL),
  redisToken: optional(process.env.UPSTASH_REDIS_REST_TOKEN),
},
```

---

### PHASE 2 — Build the Fly.io Worker (Day 2, 2–3 hours)

Create `services/visual-gen-worker/` alongside the existing monolith:

```
services/
  visual-gen-worker/
	src/
	  index.ts          ← worker entry point (queue poller)
	  processor.ts      ← visual generation logic (copy from trigger-visuals)
	  supabase.ts       ← admin client factory
	  env.ts            ← env var loader
	Dockerfile
	fly.toml
	package.json
	tsconfig.json
```

#### `services/visual-gen-worker/src/index.ts`
```typescript
import { Redis } from "@upstash/redis";
import { processVisuals } from "./processor";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const QUEUE_KEY = "visuals:queue";
const RETRY_KEY = "visuals:retry";
const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 5_000; // 5 seconds

async function processQueue(queueKey: string) {
  const raw = await redis.rpop(queueKey);
  if (!raw) return;

  const job = JSON.parse(raw as string) as {
	reportId: string;
	userId: string;
	retries?: number;
	enqueuedAt: number;
  };

  const waitMs = Date.now() - job.enqueuedAt;
  console.log(`[worker] Processing report ${job.reportId} (waited ${waitMs}ms)`);

  try {
	await processVisuals(job.reportId);
	console.log(`[worker] ✓ report ${job.reportId} complete`);
  } catch (err) {
	const retries = (job.retries ?? 0) + 1;
	console.error(`[worker] ✗ report ${job.reportId} failed (attempt ${retries}):`, err);
	if (retries < MAX_RETRIES) {
	  await redis.lpush(RETRY_KEY, JSON.stringify({ ...job, retries }));
	} else {
	  console.error(`[worker] Dead-lettered report ${job.reportId} after ${MAX_RETRIES} attempts`);
	}
  }
}

async function runWorker() {
  console.log("[worker] Starting visual-gen-worker...");
  while (true) {
	try {
	  // Process main queue first, then retry queue
	  await processQueue(QUEUE_KEY);
	  await processQueue(RETRY_KEY);
	} catch (err) {
	  console.error("[worker] Queue poll error:", err);
	}
	await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

runWorker();
```

#### `services/visual-gen-worker/Dockerfile`
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx tsc --outDir dist

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Install sharp native binary for alpine
RUN npm install --global npm@latest
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# sharp needs platform-specific build
RUN npm install sharp --ignore-scripts=false --platform=linux --arch=x64
USER node
CMD ["node", "dist/index.js"]
```

#### `services/visual-gen-worker/fly.toml`
```toml
app = "ai-beauty-visual-gen"
primary_region = "sin"     # Singapore — best latency to India + SE Asia

[build]
  dockerfile = "Dockerfile"

# No HTTP port needed — this is a pure queue worker
[env]
  NODE_ENV = "production"

# Cheapest Fly.io machine — 256MB RAM, shared CPU
# Costs ~$3–5/month (billed by second, only when running)
[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"

# Auto-stop when idle (saves money during off-hours)
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
```

#### Deploy to Fly.io:
```bash
cd services/visual-gen-worker
flyctl launch --no-deploy          # creates fly.toml + app
flyctl secrets set \
  UPSTASH_REDIS_REST_URL="..." \
  UPSTASH_REDIS_REST_TOKEN="..." \
  REPLICATE_API_TOKEN="..." \
  SUPABASE_URL="..." \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  INTERNAL_API_SECRET="..."
flyctl deploy
```

---

### PHASE 3 — Verify End-to-End (Day 2, 30 minutes)

1. Submit a selfie through the UI
2. In Vercel logs: confirm `lpush visuals:queue` fires
3. In Fly.io logs (`flyctl logs`): confirm worker picks up job
4. Check Supabase Storage: confirm 12 swatch images appear
5. Check report page: confirm swatches render without "Generating…"

#### Upstash Console Monitoring:
- Go to Upstash dashboard → your Redis DB → CLI
- `LLEN visuals:queue` → should be 0 when worker is healthy
- `LLEN visuals:retry` → should stay 0

---

### PHASE 4 — Keep `/api/internal/trigger-visuals` as Fallback (Day 3, 30 minutes)

Keep the existing `/api/internal/trigger-visuals` route alive as a manual
retrigger for admin use. Update it to also drain the queue for a specific report:

```typescript
// Existing route stays — just used for manual retrigger now
// Admin can POST /api/internal/trigger-visuals { reportId } to force regenerate
```

This means the client-side polling in `ReportLayout.tsx` still works as a
safety net if the Fly.io worker is down.

---

### PHASE 5 — Optional: Move PDF to Fly.io (Week 2, if needed)

Puppeteer + Chromium is ~400MB and hits Vercel's 50MB function limit.
If PDF export breaks on Vercel, move just the PDF endpoint to Fly.io:

```
services/
  pdf-service/
	src/index.ts       ← Express app, single POST /pdf endpoint
	Dockerfile         ← includes chromium install
	fly.toml           ← shared-cpu-1x, 1GB RAM ($5–10/mo)
```

Add to Vercel: `next.config.js` rewrites `/api/reports/*/pdf` → `https://ai-beauty-pdf.fly.dev/pdf`

---

## Full Cost Model

### Infrastructure (Monthly)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Hobby | **$0** |
| Supabase | Free | **$0** |
| Upstash Redis | Free (10k cmds/day) | **$0** |
| Fly.io visual-gen-worker | shared-cpu-1x 256MB | **$3–5** |
| Fly.io pdf-service (optional) | shared-cpu-1x 1GB | **$5–10** |
| **Total infra** | | **$3–15/mo** |

### AI Costs Per 100 Reports

| Model | Usage | Cost/100 reports |
|-------|-------|-----------------|
| AWS Rekognition | 100 DetectFaces calls | $0.10 |
| GPT-4o (color + skin) | 200 calls × ~1100 tokens | $1.10 |
| GPT-4o-mini (others) | 500 calls × ~650 tokens | $0.20 |
| Replicate flux-kontext-fast | 1200 image jobs × $0.003 | $3.60 |
| **Total AI / 100 reports** | | **~$5.00** |

> **Cost per report: ~$0.05** (5 cents USD / ₹4.2)

---

## Pricing Strategy — What Plans to Sell

### Guiding Principle
- Your cost per report: **~₹4.2 / $0.05**
- Minimum viable margin: **10x cost = ₹42 / $0.50**
- Healthy margin: **20x cost = ₹84 / $1.00**
- Premium margin: **50x cost = ₹210 / $2.50**

---

### India Pricing (Razorpay — INR)

#### Option A — Pay Per Report (Recommended to start)
| Plan | Price | Your Cost | Margin | Who Buys |
|------|-------|-----------|--------|----------|
| Single Report | ₹99 | ₹4.2 | 23x | Curious first-timers |
| 3 Reports | ₹249 | ₹12.6 | 20x | Users who retake after haircut/makeover |
| 5 Reports | ₹349 | ₹21 | 17x | Gift packs, families |

#### Option B — Subscription (Add after 200+ users)
| Plan | Price/Month | Reports/Month | Your Cost | Margin |
|------|-------------|---------------|-----------|--------|
| Basic | ₹199/mo | 2 | ₹8.4 | 24x |
| Pro | ₹499/mo | 8 | ₹33.6 | 15x |
| Salon | ₹1,499/mo | 30 | ₹126 | 12x |

> **Salon plan** is for beauty parlours / makeup artists running analysis for clients.
> This is a B2B segment with much less price sensitivity.

#### Recommended Launch Strategy (India):
1. **Launch at ₹99/report** (psychological price — feels like a coffee)
2. **Limited-time offer: ₹49 for first report** to acquire first 100 users
3. After 100 users → introduce 3-pack at ₹249
4. After 500 users → introduce subscription

---

### International Pricing (Stripe — USD)

#### Option A — Pay Per Report
| Plan | Price | Your Cost | Margin | Who Buys |
|------|-------|-----------|--------|----------|
| Single Report | $2.99 | $0.05 | 60x | Anyone curious |
| 3 Reports | $6.99 | $0.15 | 47x | Seasonal refresh |
| 5 Reports | $9.99 | $0.25 | 40x | Gift / family |

#### Option B — Subscription
| Plan | Price/Month | Reports/Month | Your Cost | Margin |
|------|-------------|---------------|-----------|--------|
| Starter | $4.99/mo | 2 | $0.10 | 50x |
| Pro | $9.99/mo | 8 | $0.40 | 25x |
| Studio | $29.99/mo | 40 | $2.00 | 15x |

#### Recommended Launch Strategy (International):
1. **Launch at $2.99/report** — impulse buy price point
2. **Free first report** for email capture (use quota system already in codebase)
3. After product-market fit → add subscription

---

### Feature Gating by Plan

| Feature | Free | ₹99 / $2.99 | Pro Sub | Salon/Studio |
|---------|------|------------|---------|-------------|
| Color season analysis | ✅ (text only) | ✅ full | ✅ full | ✅ full |
| AI swatch previews (12 images) | ❌ | ✅ | ✅ | ✅ |
| PDF export | ❌ | ✅ | ✅ | ✅ |
| Style consultant chat | ❌ | 5 msgs | Unlimited | Unlimited |
| Hairstyle previews | ❌ | ✅ | ✅ | ✅ |
| Glasses previews | ❌ | ✅ | ✅ | ✅ |
| Re-analysis (same month) | ❌ | ❌ | ✅ | ✅ |
| White-label PDF (salon) | ❌ | ❌ | ❌ | ✅ |
| Client report management | ❌ | ❌ | ❌ | ✅ |

---

### Revenue Projections

#### Conservative (India focus, ₹99/report):
| Month | Users | Paying (10%) | Revenue | AI Cost | Infra | Profit |
|-------|-------|-------------|---------|---------|-------|--------|
| 1 | 50 | 5 | ₹495 | ₹21 | ₹420 | **₹54** |
| 3 | 200 | 20 | ₹1,980 | ₹84 | ₹420 | **₹1,476** |
| 6 | 800 | 80 | ₹7,920 | ₹336 | ₹840 | **₹6,744** |
| 12 | 3,000 | 300 | ₹29,700 | ₹1,260 | ₹840 | **₹27,600** |

#### Optimistic (India + International mix):
| Month | India Revenue | International Revenue | Total | Cost | Profit |
|-------|-------------|----------------------|-------|------|--------|
| 3 | ₹4,000 | $200 (~₹16,700) | ₹20,700 | ₹2,000 | **₹18,700** |
| 6 | ₹12,000 | $600 (~₹50,100) | ₹62,100 | ₹5,000 | **₹57,100** |
| 12 | ₹40,000 | $2,000 (~₹1,67,000) | ₹2,07,000 | ₹15,000 | **₹1,92,000** |

---

## Payment Implementation Notes

### Current State
- Razorpay integrated (INR) — `src/lib/payments/razorpay.ts` ✅
- `priceINR` and `priceUSD` in `env.ts` ✅
- Webhook handling exists ✅

### What to Add for International
1. **Stripe** for USD/EUR/GBP payments (Razorpay international support is limited)
2. Add `stripe` npm package
3. New routes: `/api/payments/stripe-create` + `/api/webhooks/stripe`
4. Currency detection: use `Accept-Language` header or IP geolocation

### Quick Stripe Add (India residents can use Stripe with LUT):
```typescript
// src/lib/payments/stripe.ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createStripeSession(reportId: string, priceUSD: number) {
  return stripe.checkout.sessions.create({
	payment_method_types: ["card"],
	line_items: [{ price_data: {
	  currency: "usd",
	  product_data: { name: "AI Beauty Analysis Report" },
	  unit_amount: Math.round(priceUSD * 100),
	}, quantity: 1 }],
	mode: "payment",
	success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?reportId=${reportId}`,
	cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/report/${reportId}`,
	metadata: { reportId },
  });
}
```

---

## Migration Execution Timeline

| Day | Task | Time | Cost Impact |
|-----|------|------|-------------|
| Day 1 AM | Create Upstash + Fly.io accounts | 30 min | $0 |
| Day 1 PM | Wire Upstash queue into analyze route | 1 hr | $0 |
| Day 2 AM | Build visual-gen-worker service | 2 hr | $0 |
| Day 2 PM | Deploy to Fly.io + test end-to-end | 1 hr | +$3–5/mo |
| Day 3 | Monitor logs, fix edge cases | 2 hr | $0 |
| Week 2 | Add Stripe for international payments | 4 hr | +$0 (Stripe free) |
| Week 3 | Add subscription plans | 4 hr | Revenue uplift |
| Month 2 | Move PDF to Fly.io if needed | 4 hr | +$5–10/mo |

**Total migration effort: ~3 days of focused work**
**Total new monthly cost: $3–5**
**Revenue potential within 3 months: ₹20,000–₹60,000+/month**

---

## Summary Recommendation

1. **Do not migrate to Kubernetes** — not justified until $10k+/month revenue
2. **Add Fly.io worker this week** — removes the only real architectural risk (visual gen timeout)
3. **Keep everything else on Vercel** — it's free and handles your current load easily
4. **Launch at ₹99/report in India** — covers costs at 1 paying user per month
5. **Add Stripe + $2.99 international pricing** — 3x the addressable market
6. **Revisit infrastructure** only when monthly revenue exceeds ₹2,00,000 ($2,400)

At that point, Vercel Pro ($20/mo) + Fly.io scale-up ($20–50/mo) is still the
right move — not Kubernetes.
