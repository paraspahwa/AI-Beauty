# Renovaara — AI Agent Instructions

**App:** Renovaara | AI-powered beauty analysis SaaS (report-only)  
**Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase, Tailwind CSS 3, Vitest, Expo mobile  
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
```

> `npm run build` will fail without native binaries for `sharp`. Run `npm install --include=optional sharp` on Linux/Vercel.

Mobile (`apps/mobile`): `npm run typecheck` after `npm install` in that directory.

---

## Architecture

```
src/app/          — Next.js App Router (pages + API routes)
src/components/   — React components (ui/ primitives + report components)
src/lib/          — Business logic (ai/, supabase/, payments/, auth/, utils)
src/prompts/      — All AI prompt strings (index.ts)
src/types/        — Shared domain types (report.ts)
src/middleware.ts — Edge middleware: session refresh + in-process IP rate limiter
supabase/migrations/ — Sequential SQL migrations (source of truth for schema)
apps/mobile/      — Expo app mirroring report-only flow
```

### Product flow

`Upload → POST /api/analyze → unpaid preview → Razorpay one-time unlock → webhook → trigger-previews → 7-section paid report`

### API Routes
| Route | Purpose |
|---|---|
| `POST /api/analyze` | Full AI pipeline (SSE stream, `maxDuration=60`) |
| `GET /api/reports/[id]` | Fetch compiled report |
| `POST /api/payments/create` | Create Razorpay order |
| `POST /api/payments/verify` | Verify checkout signature (test mode only) |
| `POST /api/webhooks/razorpay` | Authoritative payment unlock + trigger-previews |
| `POST /api/internal/trigger-previews` | Paid preview batch: hairstyle, glasses, hair color |
| `GET /api/reports/[id]/visuals` | Lazy regen `?type=hairstyle\|glasses\|hairColor&index=N` |
| `POST /api/reports/[id]/hair-color` | On-demand hair colour try-on (paid) |
| `GET /api/reports/[id]/pdf` | PDF export (paid) |

---

## Supabase Client Rules — Never Mix These

| Client | File | When to use |
|---|---|---|
| `createSupabaseBrowserClient()` | `lib/supabase/client.ts` | Client components only |
| `createSupabaseServerClient()` | `lib/supabase/server.ts` | Server components, Route Handlers, Server Actions |
| `createSupabaseAdminClient()` | `lib/supabase/server.ts` | Webhooks/background jobs only — bypasses RLS |

- `updateSession()` in `lib/supabase/middleware.ts` is called **only** from `src/middleware.ts`.
- Multi-table writes use **stored RPCs** (`complete_webhook_payment`, `upsert_style_prefs`, `record_webhook_event`).

---

## AI Pipeline

9-stage sequential pipeline in `src/lib/ai/pipeline.ts`:  
`Rekognition → face shape → color → skin vision → skin routine → features → glasses → hairstyle → style guide → summary`

- All OpenAI calls go through `chatJSON<T>()` in `lib/ai/openai.ts`.
- Always `response_format: { type: "json_object" }`.
- Images pre-compressed to 512px max via `compressForAI()` in `lib/ai/image.ts`.
- Model tiers: `env.openai.visionModel` (`gpt-4o`) and `env.openai.miniModel` (`gpt-4o-mini`).
- **Do not change models to GPT-5*** — outputs are shaped for gpt-4o/gpt-4o-mini.
- Retry: `withRetry()` in `lib/ai/resilience.ts`, 2 attempts.
- Validation: Zod + normalization in `lib/ai/contracts.ts`.

### Preview generation (paid, fire-and-forget via `trigger-previews`)
- Hairstyle previews (up to 5): `generateHairstylePreviews` / FAL + Replicate
- Glasses previews (up to 3): `generateGlassesPreviews`
- Hair colour previews (up to 5): `generateHairColorPreviews`
- **Replicate SDK**: always `useFileOutput: false`

### Paid report sections (web + mobile)
1. Face — `faceShape` + `features`
2. Skin — `skinAnalysis`
3. Color — `colorAnalysis`
4. Hairstyle — `hairstyle` + `hairstylePreviews`
5. Hair colour — `hairstyle.colors` + `hairColorPreviews`
6. Spectacles — `glasses` + `glassesPreviews`
7. Style guide — `styleGuide` (pipeline JSON)

---

## Payment Flow — Critical Rules

1. **Webhook is the authoritative unlock source.** `POST /api/payments/verify` does NOT set `is_paid` in production.
2. Signature verification uses `timingSafeEqual`.
3. Currency from `CF-IPCountry` / `X-Vercel-IP-Country` headers.
4. `PAYMENT_TEST_ALLOW_IN_PROD` **must be `false`** in production.
5. Webhook idempotency: `record_webhook_event(event_id)` RPC.

---

## Report Type — Key Gotcha

`SkinAnalysisResult.routine` is a **union type**:
- Old: `{ step; product }[]`
- New: `{ am: [...]; pm: [...] }`

**Always check** `!Array.isArray(routine) && "am" in routine` before assuming AM/PM.

See `src/types/report.ts` and `StyleGuideResult`.

---

## Prompts

All prompt strings: `src/prompts/index.ts`.  
Key builders: `buildColorAnalysisPrompt()`, `buildSkinRoutinePrompt()`, `buildFeaturesPrompt()`, `buildGlassesPrompt()`, `buildStyleGuidePrompt()`.

---

## Environment Variables

Centralized in `src/lib/env.ts` (server) and `src/lib/public-env.ts` (client-safe).

**Required server:** `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `INTERNAL_API_SECRET` (≥16 chars), `ADMIN_EMAIL_ALLOWLIST`

**Required public:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `NEXT_PUBLIC_APP_URL`

See [docs/pending-manual-tasks.md](docs/pending-manual-tasks.md).

---

## Database

Schema: `supabase/migrations/` (25 migrations).  
**Keep:** `profiles`, `reports`, `payments`, `webhook_events`, `user_style_prefs`, `recommendations`, `image_hashes`

**Dropped in 0025 (report-only):** `chat_messages`, `studio_canvases`, `generated_assets`, `subscriptions`, `plans`, `usage_counters`

Key RPCs: `complete_webhook_payment`, `upsert_style_prefs`, `record_webhook_event`, `try_consume_window` (analyze rate limits)

---

## Testing

- Unit tests: `src/lib/ai/confidence.test.ts`, `contracts.test.ts`, `pipeline.test.ts`
- Vitest: `node` environment, `@` alias → `./src`

---

## Middleware

1. IP rate limits: `/api/analyze` (8/min), `/api/reports` (15/min), `/api/payments` (10/min)
2. Auth: `/upload`, `/report`, `/dashboard`, `/success`
3. Session refresh via `updateSession()`

Hard quota: `DAILY_ANALYSIS_QUOTA = 10` per user in analyze route handler.

---

## Security Rules

- Admin client bypasses RLS — always validate `user_id` ownership.
- `selfies` bucket must remain **private**.
- `INTERNAL_API_SECRET` ≥16 chars — `/api/internal/trigger-previews` returns 503 otherwise.
