# Renovaara — AI Agent Instructions

**App:** Renovaara | AI-powered beauty analysis SaaS  
**Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase, Tailwind CSS 3, Vitest  
**Deploy:** Vercel Pro (required — pipeline needs `maxDuration = 60`)

---

## Build & Test Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build (run before pushing)
npm run typecheck    # tsc --noEmit (no build artifacts)
npm run lint         # ESLint
npm test             # Vitest single run
npm run test:watch   # Vitest watch mode
npm run eval         # Eval pipeline (calls real OpenAI — needs OPENAI_API_KEY)
npm run eval:stage -- face_shape --runs 5  # Eval single stage
```

> `npm run build` will fail without native binaries for `sharp`. Run `npm install --include=optional sharp` on Linux/Vercel.

---

## Architecture

```
src/app/          — Next.js App Router (pages + API routes)
src/components/   — React components (ui/ primitives + feature components)
src/lib/          — All business logic (ai/, supabase/, payments/, auth/, utils)
src/prompts/      — All AI prompt strings (index.ts)
src/types/        — Shared domain types (report.ts)
src/middleware.ts — Edge middleware: session refresh + in-process IP rate limiter
supabase/migrations/ — 20 sequential SQL migrations (source of truth for schema)
design-system/renovaara/MASTER.md — Design tokens and component specs
docs/             — Architecture docs, roadmaps, operational runbooks
```

### API Routes
| Route | Purpose |
|---|---|
| `POST /api/analyze` | Full AI pipeline (SSE stream, `maxDuration=60`) |
| `POST /api/chat` | Streaming style consultant chat (`maxDuration=30`) |
| `GET /api/reports/[id]` | Fetch compiled report |
| `POST /api/payments/create` | Create Razorpay order |
| `POST /api/payments/verify` | Verify checkout signature |
| `POST /api/webhooks/razorpay` | Authoritative payment unlock source |
| `POST /api/internal/trigger-visuals` | Fire-and-forget visual generation (`maxDuration=300`) |
| `GET /api/og/[token]` | OG image via Puppeteer/Chromium |
| `GET /api/admin/canary-stats` | Prompt A/B variant stats |

---

## Supabase Client Rules — Never Mix These

| Client | File | When to use |
|---|---|---|
| `createSupabaseBrowserClient()` | `lib/supabase/client.ts` | Client components only |
| `createSupabaseServerClient()` | `lib/supabase/server.ts` | Server components, Route Handlers, Server Actions |
| `createSupabaseAdminClient()` | `lib/supabase/server.ts` | Webhooks/background jobs only — bypasses RLS |

- `updateSession()` in `lib/supabase/middleware.ts` is called **only** from `src/middleware.ts`.
- Multi-table writes always use **stored RPCs** (e.g. `complete_payment`, `upsert_style_prefs`, `try_consume_generation`) — never raw multi-table updates.

---

## AI Pipeline

8-stage sequential pipeline in `src/lib/ai/pipeline.ts`:  
`Rekognition → face shape → color → skin vision → skin routine → features → glasses → hairstyle → summary`

- All OpenAI calls go through `chatJSON<T>()` in `lib/ai/openai.ts`.
- Always `response_format: { type: "json_object" }` — every prompt must instruct JSON output.
- Images are pre-compressed to 512px max via `compressForAI()` in `lib/ai/image.ts`.
- Model tiers: `env.openai.visionModel` (`gpt-4o`) and `env.openai.miniModel` (`gpt-4o-mini`).
- **Do not change models to GPT-5*** — pipeline outputs are shaped for gpt-4o/gpt-4o-mini.
- Retry logic: `withRetry()` in `lib/ai/resilience.ts`, 2 attempts, 250ms×attempt backoff.
- Canary A/B system: `lib/ai/canary.ts` — variant IDs stored in `pipeline_meta.stages[].variantId`.
- All AI output is validated by Zod schemas in `lib/ai/contracts.ts`; normalization functions safe-fallback on bad AI output.

### Visual Asset Generation (fire-and-forget)
- Hairstyle try-ons: FAL `fal-ai/image-apps-v2/hair-change` → Replicate Kontext (fallback) → SDXL (last resort)
- Glasses: Replicate SDXL inpainting
- Makeup (4 looks): FAL Flux Kontext Pro
- Clothing swatches (12): Replicate Flux Kontext Pro at `megapixels: "0.25"`
- **Replicate SDK**: always `useFileOutput: false` — `FileOutput` objects break URL validation

---

## Payment Flow — Critical Rules

1. **Webhook is the authoritative unlock source.** `POST /api/payments/verify` does NOT set `is_paid`. Only `payment.captured` webhook event does (via `complete_webhook_payment` RPC).
2. Signature verification uses `timingSafeEqual` — never use `===` for HMAC comparisons.
3. Currency is derived from `CF-IPCountry` / `X-Vercel-IP-Country` server headers — never trust the client's currency hint.
4. `PAYMENT_TEST_ALLOW_IN_PROD` **must be `false`** in production.
5. Webhook idempotency: `record_webhook_event(event_id)` RPC deduplicates by Razorpay event ID.

---

## Report Type — Key Gotcha

`SkinAnalysisResult.routine` is a **union type** for backward compatibility:
- Old reports: `{ step: string; product: string }[]` (flat array)
- New reports: `{ am: [...]; pm: [...] }` (split object)

**Always check** `!Array.isArray(routine) && "am" in routine` before assuming AM/PM structure.

See full type definitions in `src/types/report.ts`.

---

## Prompts

All prompt strings live in `src/prompts/index.ts`.  
Key builders: `buildColorAnalysisPrompt(opts?)`, `buildSkinRoutinePrompt()`, `buildFeaturesPrompt()`, `buildGlassesPrompt()`.  
The canary variant `color_v1` is **weight 0 (disabled)**. The active variant (`color_v2_dominant`) uses a sentinel value `"__dominant_color_variant__"` that triggers `buildColorAnalysisPrompt()` dynamically instead of using the stored string.

---

## Design System

Full design tokens: [design-system/renovaara/MASTER.md](design-system/renovaara/MASTER.md)  
Page-level overrides: `design-system/pages/[page-name].md` — **check these before applying Master rules**.

**Color name gotcha — Tailwind aliases are semantically inverted:**
| Tailwind name | Actual color | Canonical name |
|---|---|---|
| `terracotta` | Pink `#EC4899` | `chrome` |
| `olive` | Violet `#8B5CF6` | `iris` |
| `obsidian` | Soft pink bg `#FDF2F8` | `obsidian` |

These legacy aliases remain for backward compatibility. New code should use `chrome`, `iris`, `obsidian`.

UI primitives in `src/components/ui/` use Radix + `class-variance-authority` + `tailwind-merge`.

---

## Environment Variables

All env vars are centralized in `src/lib/env.ts` (server) and `src/lib/public-env.ts` (client-safe).

**Required server vars:**
```
SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, RAZORPAY_KEY_SECRET,
RAZORPAY_WEBHOOK_SECRET, INTERNAL_API_SECRET (≥16 chars), ADMIN_EMAIL_ALLOWLIST
```

**Required public vars:**
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
NEXT_PUBLIC_RAZORPAY_KEY_ID, NEXT_PUBLIC_APP_URL
```

See [docs/pending-manual-tasks.md](docs/pending-manual-tasks.md) for env vars that must be set in Vercel dashboard.

---

## Database

Schema source of truth: `supabase/migrations/` (20 migrations).  
Key tables: `profiles`, `reports`, `payments`, `chat_messages`, `user_style_prefs`, `generated_assets`, `plans`, `subscriptions`, `usage_counters`, `webhook_events`, `image_hashes`.

Key RPCs (always prefer these over raw multi-table writes):
- `complete_webhook_payment` — atomic payment + report + profile unlock
- `upsert_style_prefs` — personalization memory upsert
- `try_consume_generation` — atomic quota check + increment
- `get_studio_entitlement` — tier, remaining gens, cap, reset date
- `record_webhook_event` — idempotency deduplication
- `expire_stuck_reports` — pg_cron job every 10 min

---

## Testing

- Unit tests: `src/lib/ai/confidence.test.ts`, `contracts.test.ts`, `pipeline.test.ts`
- Eval fixtures: `scripts/eval-fixtures/<stage>/<id>.json` (golden labels for prompt canaries)
- Vitest config: `node` environment, `isolate: true`, `@` alias → `./src`
- The eval pipeline (`npm run eval`) calls **real OpenAI** — never run in CI without API key management.

---

## Middleware

`src/middleware.ts` does three things:
1. **In-process rate limiting** (LRU, 4096 entries, resets on cold start — first-pass only):
   - `/api/analyze` → 8 req/60s per IP
   - `/api/chat` → 30 req/60s per IP
2. **Auth protection**: `/upload`, `/report`, `/dashboard`, `/success`, `/admin` require Supabase session.
3. **Session refresh** via `updateSession()` on every request.

Hard quota gate for analysis: `DAILY_ANALYSIS_QUOTA = 10` per user in the route handler (not middleware).

---

## Security Rules

- `createSupabaseAdminClient()` bypasses RLS — always validate `user_id` ownership explicitly.
- `selfies` storage bucket must remain **private**.
- `INTERNAL_API_SECRET` must be ≥16 chars — `/api/internal/trigger-visuals` returns 503 otherwise.
- Supabase `Site URL` must be set to the production domain in Dashboard → Auth → URL Configuration.

---

## Docs

| File | Purpose |
|---|---|
| [docs/pending-manual-tasks.md](docs/pending-manual-tasks.md) | Env vars, Razorpay plan IDs, and external accounts to set up |
| [docs/optimisation-roadmap.md](docs/optimisation-roadmap.md) | Cost reduction plan ($1.20 → $0.15 per report) |
| [docs/PRICING_STRATEGY.md](docs/PRICING_STRATEGY.md) | Pricing tiers and margin math |
| [docs/success-plan.md](docs/success-plan.md) | Operational health, known gotchas, founder notes |
| [docs/visual-analysis-roadmap.md](docs/visual-analysis-roadmap.md) | Visual asset generation improvements |
| [docs/microservices-plan.md](docs/microservices-plan.md) | Future Kubernetes migration plan |
