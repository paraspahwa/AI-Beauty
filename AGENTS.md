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

`Upload selfie → POST /api/analyze → face-shape infographic preview → Razorpay ₹299 unlock → webhook → kickOffInfographicsInBackground (6 parallel jobs) → paid report`

`Style Guide add-on (optional): upload full-body → Razorpay ₹99 → webhook → trigger-style-guide → styleGuide infographic`

### API Routes
| Route | Purpose |
|---|---|
| `POST /api/analyze` | Full AI pipeline (SSE stream, `maxDuration=60`) |
| `GET /api/reports/[id]` | Fetch compiled report |
| `POST /api/payments/create` | Create Razorpay order (`product`: `report_unlock` \| `style_guide_addon`) |
| `POST /api/payments/verify` | Verify checkout signature (test mode only) |
| `POST /api/webhooks/razorpay` | Authoritative unlock; branches on `payments.product` |
| `POST /api/reports/[id]/body-image` | Full-body upload for Style Guide add-on (requires main unlock) |
| `POST /api/internal/trigger-infographics` | One section per request (`section` param); `maxDuration=300` |
| `POST /api/internal/trigger-style-guide` | Style Guide infographic (`maxDuration=300`) |
| `POST /api/reports/[id]/retry-infographic` | Re-fire failed paid infographic section |
| `POST /api/reports/[id]/retry-style-guide` | Re-fire Style Guide infographic |
| `POST /api/internal/trigger-previews` | Legacy hairstyle/glasses/hair-color previews |
| `GET /api/vault` | User's uploads + analysis assets (signed URLs) for Vault page |
| `GET /api/reports/[id]/pdf` | Analysis PDF — generated infographic images only (paid) |
| `GET /api/reports/[id]/pdf/style-guide` | Style Guide PDF — separate add-on document |

**Pages:** `/vault` — gallery of uploads, infographics, and PDFs with download + social share.

---

## Supabase Client Rules — Never Mix These

| Client | File | When to use |
|---|---|---|
| `createSupabaseBrowserClient()` | `lib/supabase/client.ts` | Client components only |
| `createSupabaseServerClient()` | `lib/supabase/server.ts` | Server components, Route Handlers, Server Actions |
| `createSupabaseAdminClient()` | `lib/supabase/server.ts` | Webhooks/background jobs only — bypasses RLS |

- `updateSession()` in `lib/supabase/middleware.ts` is called **only** from `src/middleware.ts`.
- Multi-table writes use **stored RPCs** (`complete_webhook_payment`, `complete_style_guide_webhook_payment`, `upsert_style_prefs`, `record_webhook_event`).

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

### Analysis infographics (fal `openai/gpt-image-2/edit`)
- **Free preview** (after analyze): `faceFeaturesPreview` — face-shape-only
- **Paid** (after unlock, **one parallel internal POST per section** via `kickOffInfographicsInBackground`): `faceFeatures`, `skin`, `color`, `hairstyle`, `spectacles`, `hairColor`
- **Style Guide add-on** (separate ₹99 paywall, full-body image): `analysisInfographics.styleGuide` via `trigger-style-guide`
- Prompts: `skin_v3`, `color_v3`, `hairstyle_v3`, `spectacles_v3`, `hair_color_v3`, `face_features_v3`, `style_guide_v2`
- Input: face crop for face features; **full portrait** for skin/color/hairstyle/spectacles/hair color; **full-body** for style guide
- UI: `AnalysisInfographicImage.tsx` — image only, no HTML layout cards

### Preview generation (paid, fire-and-forget via `trigger-previews`)
- Hairstyle previews (up to 5): `generateHairstylePreviews` / FAL + Replicate
- Glasses previews (up to 3): `generateGlassesPreviews`
- Hair colour previews (up to 5): `generateHairColorPreviews`
- **Replicate SDK**: always `useFileOutput: false`

### Paid report sections (web)
1. Face — `faceFeatures` infographic
2. Skin — `skin` infographic
3. Color — `color` infographic
4. Hairstyle — `hairstyle` infographic
5. Hair colour — `hairColor` infographic
6. Spectacles — `spectacles` infographic
7. Style guide — **add-on** (`styleGuide` infographic, ₹99, requires `body_image_path`)

---

## Payment Flow — Critical Rules

1. **Webhook is the authoritative unlock source.** `POST /api/payments/verify` does NOT set `is_paid` in production.
2. Two SKUs on `payments.product`: `report_unlock` (₹299) and `style_guide_addon` (₹99).
3. Style Guide sets `reports.is_style_guide_paid` only — does not touch `is_paid`.
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

## Developer docs

| Doc | Covers |
|-----|--------|
| [docs/landing-page.md](docs/landing-page.md) | Homepage structure, `home-content.json`, hero video portal, dossier carousel, sample images |
| [docs/architecture.json](docs/architecture.json) | Machine-readable route/component map (partially stale on legacy studio/chat) |
| [docs/pending-manual-tasks.md](docs/pending-manual-tasks.md) | Env setup and manual ops checklist |

---

## Database

Schema: `supabase/migrations/` (26 migrations).  
**Keep:** `profiles`, `reports`, `payments`, `webhook_events`, `user_style_prefs`, `recommendations`, `image_hashes`

**Dropped in 0025 (report-only):** `chat_messages`, `studio_canvases`, `generated_assets`, `subscriptions`, `plans`, `usage_counters`

Key RPCs: `complete_webhook_payment`, `complete_style_guide_webhook_payment`, `complete_style_guide_payment`, `upsert_style_prefs`, `record_webhook_event`, `try_consume_window` (analyze rate limits)

---

## Testing

- Unit tests: `src/lib/ai/confidence.test.ts`, `contracts.test.ts`, `pipeline.test.ts`, `animations.deck.test.ts`
- Vitest: `node` environment, `@` alias → `./src`

---

## Middleware

1. IP rate limits: `/api/analyze` (8/min), `/api/reports` (15/min), `/api/payments` (10/min)
2. Auth: `/upload`, `/report`, `/dashboard`, `/vault`, `/success`
3. Session refresh via `updateSession()`

Hard quota: `DAILY_ANALYSIS_QUOTA = 10` per user in analyze route handler.

---

## Security Rules

- Admin client bypasses RLS — always validate `user_id` ownership.
- `selfies` bucket must remain **private**.
- `INTERNAL_API_SECRET` ≥16 chars — `/api/internal/trigger-previews` returns 503 otherwise.
