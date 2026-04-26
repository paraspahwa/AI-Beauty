# StyleAI ✦

> AI Personal Stylist — upload a selfie and get a personalized beauty report:
> face shape, color season, skin care, spectacles, and hairstyle recommendations.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · OpenAI · AWS Rekognition · Razorpay**.

---

## ✨ Features

| | |
|---|---|
| 📸 **Selfie upload** | Drag-drop, client compression, secure private storage |
| 🤖 **8-stage AI pipeline** | Rekognition landmarks + GPT-5 Vision/Mini analysis |
| 🎨 **5-section report** | Face · Color · Skin · Spectacles · Hairstyle |
| 🪙 **Free + paid tiers** | Free preview (color + face shape); $9.99 unlocks the full report + PDF |
| 💳 **Razorpay payments** | Order create → checkout → server verify + webhook |
| 🔐 **Auth + RLS** | Supabase magic-link email login, row-level security on all tables |
| 📱 **Mobile-first UI** | Warm beige theme, soft shadows, Cormorant + Inter typography |

---

## 🗂 Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts          # POST  upload + run pipeline
│   │   ├── reports/[id]/route.ts     # GET   fetch (paywalled) report
│   │   ├── reports/[id]/pdf/route.ts # GET   PDF / printable HTML
│   │   ├── payments/create/route.ts  # POST  create Razorpay order
│   │   ├── payments/verify/route.ts  # POST  verify checkout signature
│   │   └── webhooks/razorpay/route.ts# POST  Razorpay webhook
│   ├── auth/page.tsx                 # magic-link login
│   ├── upload/page.tsx               # selfie uploader
│   ├── report/[id]/page.tsx          # tabbed report viewer
│   ├── success/page.tsx              # post-payment redirect
│   ├── layout.tsx · globals.css · page.tsx
│   └── middleware.ts                 # Supabase session refresh
├── components/
│   ├── ImageUploader.tsx
│   ├── Paywall.tsx
│   ├── report/{ReportLayout, FaceFeaturesCard, ColorAnalysisCard,
│   │           SkinAnalysisCard, SpectaclesCard, HairstyleCard}.tsx
│   └── ui/{button,card,badge,tabs,progress,dialog}.tsx   # shadcn-style primitives
├── lib/
│   ├── env.ts                        # typed env access
│   ├── utils.ts                      # cn(), formatCurrency()
│   ├── supabase/{client,server,middleware}.ts
│   ├── ai/{openai,rekognition,image,pipeline}.ts
│   └── payments/razorpay.ts
├── prompts/index.ts                  # all AI prompts as constants
└── types/report.ts                   # shared domain types

supabase/
└── migrations/0001_init.sql          # tables, triggers, RLS, storage bucket
```

---

## 🚀 Setup

### 1 · Prerequisites
- Node.js ≥ 20
- A Supabase project
- An OpenAI API key with GPT-5 access (or override the model env vars)
- AWS account with Rekognition access *(optional — pipeline degrades gracefully)*
- A Razorpay account (test mode is fine for development)

### 2 · Clone & install
```bash
npm install
cp .env.example .env.local         # fill in your secrets
```

### 3 · Provision the database
Open Supabase → SQL editor → paste **`supabase/migrations/0001_init.sql`** and run it.
This creates `profiles`, `reports`, `recommendations`, `payments`, the `selfies` storage bucket,
RLS policies, and an `auth.users` trigger that auto-creates a profile on signup.

### 4 · Run locally
```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint
```

### 5 · Razorpay webhook (local testing)
Expose your dev server (e.g. `ngrok http 3000`) and register the URL
`https://<tunnel>/api/webhooks/razorpay` in your Razorpay dashboard with
events `payment.captured` and `payment.failed`. Set the same secret you
used for `RAZORPAY_WEBHOOK_SECRET`.

---

## 🧠 The analysis pipeline

`src/lib/ai/pipeline.ts` runs in the following order:

1. **AWS Rekognition** `DetectFaces` for facial landmarks (graceful fallback if unavailable).
2. **GPT-5 Mini Vision** → face shape classification.
3. **GPT-5 Vision** ⟂ in parallel → color season + skin analysis (high-quality calls).
4. **GPT-5 Mini** ⟂ in parallel → eyes/nose/lips/cheeks features, glasses (uses face shape), hairstyle.
5. **GPT-5 Mini** → compile a warm 120-180 word personalized intro.

Cost-saving conventions used throughout:
- Images compressed to **512 px JPEG** before being sent to AI.
- **GPT-5 Mini** for ~80 % of calls; full Vision reserved for color + skin.
- Results are cached in the `reports` row so re-renders never hit the AI.

> 💡 To swap models, set `OPENAI_VISION_MODEL` / `OPENAI_MINI_MODEL` in `.env.local`.

---

## 💳 Payment flow

```
[ user ] -- POST /api/payments/create -----> Razorpay (order created, row inserted)
[ user ] -- Checkout modal opens via SDK --> Razorpay
[ user ] -- handler() returns signature ---> POST /api/payments/verify
                                              ├── HMAC-SHA256 signature check
                                              ├── payments.status='paid'
                                              ├── reports.is_paid=true
                                              └── profiles.is_paid=true
Razorpay --- POST /api/webhooks/razorpay --> redundant server-side unlock
```

The webhook is the source of truth — it unlocks even if the browser drops the response.

---

## 🚢 Deploy to Vercel

1. Push to GitHub and import into Vercel.
2. Add every variable from `.env.example` to **Project → Settings → Environment Variables**.
3. Set the production `NEXT_PUBLIC_APP_URL` to your Vercel domain.
4. In Razorpay → Webhooks, register `https://<your-domain>/api/webhooks/razorpay`.

The `analyze` route runs up to **60 s** (`maxDuration = 60`). For long videos / batch
processing move the pipeline to a background queue (Inngest, Vercel Cron, etc.).

---

## 🔒 Security notes

- All tables use **Row Level Security**; users can only read their own data.
- Selfies live in a **private** Supabase Storage bucket; the report page signs
  short-lived URLs server-side.
- Razorpay signatures are validated with `crypto.timingSafeEqual`.
- The service-role key is **only** used server-side, never shipped to the browser.

---

## 📜 License

MIT — build something beautiful with it.
