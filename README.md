# StyleAI ✦ — AI-Powered Personal Beauty Analysis

> Upload a selfie and unlock a personalized style report: color season, face shape, skin analysis, spectacles guide, and hairstyle recommendations — all powered by GPT-4o and AWS Rekognition.

![StyleAI](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-green?logo=supabase) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-purple?logo=openai)

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Local Setup](#local-setup)
5. [Environment Variables](#environment-variables)
6. [Supabase Setup](#supabase-setup)
7. [AWS Setup](#aws-setup)
8. [Razorpay Setup](#razorpay-setup)
9. [Running the App](#running-the-app)
10. [Project Structure](#project-structure)
11. [API Routes](#api-routes)
12. [How the AI Pipeline Works](#how-the-ai-pipeline-works)
13. [Payment Flow](#payment-flow)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)

---

## Features

| Feature | Details |
|---------|---------|
| 📸 **Selfie Upload** | Drag-and-drop or click to upload; client-side image compression |
| 🤖 **8-Stage AI Pipeline** | AWS Rekognition landmarks + GPT-4o color/skin/style analysis |
| 🎨 **5-Section Report** | Face Shape · Color Season · Skin Analysis · Spectacles · Hairstyle |
| 💰 **Free + Paid Tiers** | Free preview (color + face shape); $9.99 unlocks full report + PDF download |
| 💳 **Razorpay Payments** | Order create → Razorpay checkout modal → server signature verification → webhook fallback |
| 🔐 **Auth + RLS** | Supabase magic-link email login; Row Level Security on all tables |
| 📱 **Responsive UI** | Warm cream theme, glass morphism, Framer Motion animations |
| 📄 **PDF Download** | Server-rendered report downloadable as HTML/PDF |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + custom design tokens |
| Animation | Framer Motion 12 |
| Auth + DB + Storage | [Supabase](https://supabase.com) |
| AI Analysis | [OpenAI GPT-4o / GPT-4o-mini](https://platform.openai.com) |
| Face Detection | [AWS Rekognition](https://aws.amazon.com/rekognition/) |
| Payments | [Razorpay](https://razorpay.com) |
| Image Processing | Sharp |

---

## Prerequisites

Make sure you have the following installed and accounts created:

- **Node.js** v18.17+ — [nodejs.org](https://nodejs.org)
- **npm** v9+ (bundled with Node.js)
- **Supabase** account — [supabase.com](https://supabase.com)
- **OpenAI** API key — [platform.openai.com](https://platform.openai.com/api-keys)
- **AWS** account with Rekognition access — [aws.amazon.com](https://aws.amazon.com)
- **Razorpay** account *(optional for payments)* — [razorpay.com](https://razorpay.com)

---

## Local Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/paraspahwa/AI-Beauty.git
cd AI-Beauty
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in all values (see [Environment Variables](#environment-variables) below).

### Step 4 — Set up Supabase

See the full [Supabase Setup](#supabase-setup) section below.

### Step 5 — Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Every variable required by the app. Copy `.env.example` to `.env.local` and populate each one.

```env
# ── App ─────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=StyleAI

# ── Supabase ─────────────────────────────────────────────────────────────────
# From: Supabase Dashboard → Project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key   # Never expose this client-side!
SUPABASE_STORAGE_BUCKET=selfies

# ── OpenAI ───────────────────────────────────────────────────────────────────
# From: platform.openai.com → API Keys
OPENAI_API_KEY=sk-...
OPENAI_VISION_MODEL=gpt-4o          # DO NOT change to gpt-5 — it does not exist
OPENAI_MINI_MODEL=gpt-4o-mini       # DO NOT change to gpt-5-mini — it does not exist

# ── AWS Rekognition ──────────────────────────────────────────────────────────
# From: AWS Console → IAM → Your User → Security Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# ── Razorpay ─────────────────────────────────────────────────────────────────
# From: Razorpay Dashboard → Settings → API Keys
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_PAID_PRICE_USD=9.99
NEXT_PUBLIC_PAID_PRICE_INR=829

# ── Feature Flags ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_ENABLE_PDF=true
```

---

## Supabase Setup

### 1. Create a project

Go to [app.supabase.com](https://app.supabase.com) → click **New project** → choose a name, database password, and region.

### 2. Copy your API credentials

Navigate to **Project Settings → API**:

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon** / **public** key |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key (keep secret!) |

### 3. Run database migrations

Open **SQL Editor** in your Supabase dashboard. Run each migration file below, **in order**:

#### Migration 1 — Initial schema

Paste the full contents of `supabase/migrations/0001_init.sql` into the SQL editor and click **Run**.

This creates:
- `profiles`, `reports`, `recommendations`, `payments` tables
- Row Level Security policies
- Storage bucket `selfies`
- Auth trigger to auto-create a profile on sign-up

#### Migration 2 — Constraints, indexes, and payment RPC functions

Paste the full contents of `supabase/migrations/0002_constraints_indexes_rpc.sql` and click **Run**.

This creates:
- `complete_payment()` and `complete_webhook_payment()` Postgres functions used by the payment API routes
- Additional `CHECK` constraints on status columns
- Performance indexes

> ⚠️ **The payment routes will throw a runtime error if Migration 2 has not been applied.**

### 4. Create the storage bucket

In **Storage → New bucket**:
- **Name**: `selfies`
- **Public**: ❌ OFF (must be private)

### 5. Configure Auth

In **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback`

In **Authentication → Providers → Email**:
- Make sure **Enable Email provider** is ON
- **Confirm email**: OFF is fine for development (magic link works without confirmation)

---

## AWS Setup

### 1. Create an IAM user

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam) → **Users → Add users**
2. **User name**: `styleai-rekognition`
3. **Access type**: Programmatic access (generates Access Key ID + Secret)
4. **Permissions**: Attach policy `AmazonRekognitionReadOnlyAccess`

### 2. Save credentials

After creating the user, copy the:
- **Access Key ID** → `AWS_ACCESS_KEY_ID`
- **Secret Access Key** → `AWS_SECRET_ACCESS_KEY`

Set `AWS_REGION` to the AWS region you want Rekognition calls to use (e.g. `us-east-1`, `ap-south-1`).

> 💡 The app gracefully degrades if Rekognition is unavailable — the AI pipeline continues without facial landmark data.

---

## Razorpay Setup

> You can skip this section if you want to test without payments. The free-tier features work without Razorpay configured.

### 1. Get test API keys

Log in to [Razorpay Dashboard](https://dashboard.razorpay.com) → **Settings → API Keys → Generate Test Key Pair**:
- **Key ID** → `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- **Key Secret** → `RAZORPAY_KEY_SECRET`

### 2. Configure a webhook

In **Settings → Webhooks → Add New Webhook**:
- **Webhook URL**: `https://your-domain.com/api/webhooks/razorpay`
  - For local testing: use [ngrok](https://ngrok.com) — `ngrok http 3000` — and use the HTTPS tunnel URL
- **Secret**: create a strong secret → `RAZORPAY_WEBHOOK_SECRET`
- **Active Events**: ✅ `payment.captured`, ✅ `payment.failed`

---

## Running the App

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at [localhost:3000](http://localhost:3000) |
| `npm run build` | Build for production |
| `npm run start` | Start production server (after build) |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type-checker (`tsc --noEmit`) |

---

## Project Structure

```
AI-Beauty/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── api/
│   │   │   ├── analyze/route.ts     # POST — upload selfie & run AI pipeline
│   │   │   ├── payments/
│   │   │   │   ├── create/route.ts  # POST — create Razorpay order
│   │   │   │   └── verify/route.ts  # POST — verify payment signature
│   │   │   ├── reports/[id]/
│   │   │   │   └── pdf/route.ts     # GET  — download report as PDF/HTML
│   │   │   └── webhooks/
│   │   │       └── razorpay/route.ts# POST — Razorpay payment webhook
│   │   ├── auth/page.tsx            # Magic-link sign-in
│   │   ├── report/[id]/
│   │   │   ├── page.tsx             # Tabbed report viewer (server component)
│   │   │   └── loading.tsx          # Skeleton loading state
│   │   ├── success/page.tsx         # Post-payment success page
│   │   ├── upload/
│   │   │   ├── page.tsx             # Selfie upload page
│   │   │   └── loading.tsx          # Skeleton loading state
│   │   ├── error.tsx                # Global error boundary
│   │   ├── not-found.tsx            # 404 page
│   │   ├── layout.tsx               # Root layout (Navbar + fonts + metadata)
│   │   ├── page.tsx                 # Landing page
│   │   └── globals.css              # Global styles + Tailwind base
│   │
│   ├── components/
│   │   ├── Navbar.tsx               # Sticky glass navigation bar (mobile + desktop)
│   │   ├── ImageUploader.tsx        # Drag-drop selfie uploader
│   │   ├── Paywall.tsx              # Razorpay payment modal
│   │   ├── report/                  # Report section cards
│   │   │   ├── ReportLayout.tsx     # Tabbed report shell
│   │   │   ├── ColorAnalysisCard.tsx
│   │   │   ├── FaceFeaturesCard.tsx
│   │   │   ├── SkinAnalysisCard.tsx
│   │   │   ├── SpectaclesCard.tsx
│   │   │   └── HairstyleCard.tsx
│   │   └── ui/                      # Reusable primitives (shadcn-style)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── tabs.tsx
│   │       ├── progress.tsx
│   │       └── dialog.tsx
│   │
│   ├── lib/
│   │   ├── env.ts                   # Typed, validated env variable access
│   │   ├── utils.ts                 # cn(), formatCurrency()
│   │   ├── animations.ts            # Framer Motion variants (fadeUp, slideIn, etc.)
│   │   ├── supabase/
│   │   │   ├── client.ts            # Browser Supabase client
│   │   │   ├── server.ts            # Server-side Supabase clients
│   │   │   └── middleware.ts        # Auth session refresh middleware
│   │   ├── ai/
│   │   │   ├── pipeline.ts          # 8-stage analysis orchestrator
│   │   │   ├── openai.ts            # OpenAI client + typed calls
│   │   │   ├── rekognition.ts       # AWS Rekognition DetectFaces wrapper
│   │   │   └── image.ts             # Sharp image compression helper
│   │   └── payments/
│   │       └── razorpay.ts          # Razorpay client + HMAC signature verification
│   │
│   ├── prompts/index.ts             # All AI prompt templates
│   └── types/report.ts              # CompiledReport and related types
│
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql            # Schema, tables, RLS, storage, auth trigger
│       └── 0002_constraints_indexes_rpc.sql  # CHECK constraints + payment RPC functions
│
├── .env.example                     # Environment variable template
├── next.config.js                   # Next.js config (image domains, body size limit)
├── tailwind.config.ts               # Design tokens (colors, shadows, animations)
├── tsconfig.json
└── package.json
```

---

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/analyze` | ✅ Required | Upload selfie (multipart/form-data), run AI pipeline, return `{ reportId }` |
| `POST` | `/api/payments/create` | ✅ Required | Create a Razorpay order for a report |
| `POST` | `/api/payments/verify` | ✅ Required | Verify Razorpay payment signature and unlock full report |
| `GET` | `/api/reports/[id]/pdf` | ✅ Required | Download the structured report as an HTML file |
| `POST` | `/api/webhooks/razorpay` | HMAC only | Webhook receiver for `payment.captured` / `payment.failed` events |

---

## How the AI Pipeline Works

The pipeline in `src/lib/ai/pipeline.ts` runs these stages in sequence/parallel:

```
1. Compress image to 512px JPEG (Sharp)
2. AWS Rekognition DetectFaces  → facial landmarks
   (pipeline continues without landmarks if AWS is unavailable)
3. GPT-4o-mini Vision           → face shape classification
4. GPT-4o       (parallel) →  color season analysis
   GPT-4o       (parallel) →  skin analysis
5. GPT-4o-mini  (parallel) →  eye/nose/lips/cheeks features
   GPT-4o-mini  (parallel) →  spectacles recommendations
   GPT-4o-mini  (parallel) →  hairstyle recommendations
6. GPT-4o-mini               → compile personalized summary paragraph
```

Cost optimisation:
- Images are compressed to **512 px JPEG** before AI calls
- ~80% of calls use the cheaper **GPT-4o-mini** model
- Results are stored in the database — re-renders never re-run the pipeline

---

## Payment Flow

```
Browser                         Server                    Razorpay
   |                              |                           |
   |── POST /api/payments/create ─▶ Create order              |
   |                              |── Create Razorpay order ──▶|
   |◀─ { orderId, amount } ───────|◀─ { id } ─────────────────|
   |                              |                           |
   |── Open Razorpay Checkout ─────────────────────────────── ▶|
   |◀─ payment signature ──────────────────────────────────── |
   |                              |                           |
   |── POST /api/payments/verify ─▶ Verify HMAC signature     |
   |                              |── RPC complete_payment() ─▶ DB
   |◀─ { success: true } ─────── |                           |
   |                              |                           |
   |                   POST /api/webhooks/razorpay ◀─── Razorpay (async)
   |                              |── RPC complete_webhook_payment() → DB
```

The webhook is the **source of truth** — it unlocks the report even if the browser tab closes before the verify response arrives.

---

## Deployment

### Deploy to Vercel (recommended)

1. **Push** your code to GitHub.
2. **Import** the repo at [vercel.com/new](https://vercel.com/new).
3. In **Project Settings → Environment Variables**, add every variable from `.env.local`.
4. Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://styleai.vercel.app`).
5. In **Supabase → Auth → URL Configuration**, update:
   - **Site URL** → your production domain
   - **Redirect URLs** → `https://your-domain.com/auth/callback`
6. In **Razorpay → Webhooks**, update the URL to `https://your-domain.com/api/webhooks/razorpay`.
7. Click **Deploy**.

> ⚠️ The `/api/analyze` route has a **60-second timeout** (`export const maxDuration = 60`).  
> Vercel's **Pro plan** or higher is required for function timeouts above 10 seconds.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `function complete_payment() does not exist` | Run `supabase/migrations/0002_constraints_indexes_rpc.sql` in Supabase SQL editor |
| Infinite auth redirect loop | Add `http://localhost:3000/auth/callback` to Supabase **Redirect URLs** |
| Uploaded images returning 400/403 | Ensure the `selfies` bucket exists and is set to **private** in Supabase Storage |
| Razorpay webhook returns 400 | Verify `RAZORPAY_WEBHOOK_SECRET` in `.env.local` matches the Razorpay dashboard secret |
| OpenAI API error: model not found | Ensure `OPENAI_VISION_MODEL=gpt-4o` and `OPENAI_MINI_MODEL=gpt-4o-mini` (not `gpt-5`) |
| AI pipeline timeout | The pipeline takes 30–50 s; make sure `maxDuration = 60` in `api/analyze/route.ts` |
| `next build` error: `React.ReactNode` | Ensure `import type { ReactNode } from 'react'` is used in `layout.tsx` |

---

## Security Notes

- All database tables use **Row Level Security** — users can only read and modify their own data.
- Selfies are stored in a **private** Supabase Storage bucket; report pages generate short-lived signed URLs server-side.
- Razorpay payment signatures are validated using `crypto.timingSafeEqual` to prevent timing attacks.
- The `SUPABASE_SERVICE_ROLE_KEY` is only used in server-side API routes — it is never shipped to the browser.
- Payment DB updates use **atomic Postgres RPC functions** to prevent race conditions between the verify endpoint and the webhook.

---

## License

MIT — build something beautiful with it. ✦
