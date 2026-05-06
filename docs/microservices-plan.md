# AI-Beauty — Microservices & Kubernetes Migration Plan

## Overview

This document describes the plan to decompose the current Next.js monolith into
discrete, independently deployable microservices, each running as a Docker
container orchestrated by Kubernetes.

The current application is a single Next.js 15 process that handles:
- Image upload and validation
- AWS Rekognition face detection
- OpenAI multi-stage AI inference pipeline (face shape, color, skin, features, glasses, hairstyle, summary)
- Replicate-based image generation (hair previews, glasses previews)
- SVG/canvas visual asset assembly
- Style consultant chat (streaming)
- Razorpay payment lifecycle
- Report CRUD and PDF export
- Public share tokens
- Admin and canary analytics
- Supabase Auth SSR session handling
- React front-end rendering (Next.js App Router)

---

## Identified Microservices (8 services + 1 gateway)

| # | Service Name            | Replaces                                                   | Language / Runtime |
|---|-------------------------|------------------------------------------------------------|--------------------|
| 1 | `frontend`              | Next.js pages, components, layouts                        | Next.js 15 (Node)  |
| 2 | `api-gateway`           | Reverse-proxy + auth-token validation layer               | Node / Nginx       |
| 3 | `analysis-service`      | `/api/analyze` — pipeline orchestration                   | Node 20            |
| 4 | `vision-service`        | AWS Rekognition calls (`lib/ai/rekognition.ts`)           | Node 20            |
| 5 | `inference-service`     | All OpenAI GPT-4o calls (`lib/ai/pipeline.ts` stages 2-8) | Node 20            |
| 6 | `visual-gen-service`    | Replicate image gen + SVG assembly (`lib/ai/visuals.ts`, `lib/ai/color-swatch-v2.ts`, `/api/internal/trigger-visuals`) | Node 20 |
| 7 | `chat-service`          | `/api/chat` — streaming style-consultant chat             | Node 20            |
| 8 | `payment-service`       | `/api/payments/*`, `/api/webhooks/razorpay`               | Node 20            |
| 9 | `report-service`        | `/api/reports/[id]/*` — CRUD, share, PDF, hair-color      | Node 20            |
| 10| `admin-service`         | `/api/admin/*` — canary stats, cleanup                    | Node 20            |

---

## Architecture Diagram

```
                        ┌──────────────────────────────────────────────────────┐
                        │               Kubernetes Cluster                     │
                        │                                                      │
  User Browser  ──────► │  Ingress (nginx-ingress / AWS ALB)                  │
                        │       │                                              │
                        │       ▼                                              │
                        │  ┌─────────────┐                                    │
                        │  │ api-gateway │  (JWT validation, rate-limit,       │
                        │  │  :3000      │   routing, abuse-guard)             │
                        │  └──────┬──────┘                                    │
                        │         │ routes to                                  │
                        │   ┌─────┴──────────────────────────────────────┐   │
                        │   │                                             │   │
                        │   ▼               ▼            ▼       ▼       ▼   │
                        │ frontend  analysis-svc  chat-svc  payment  report  │
                        │  :3001      :4001         :4003    -svc      -svc  │
                        │                │            │      :4004    :4005  │
                        │                │            │                       │
                        │         ┌──────┴──────┐     │    admin-svc :4006   │
                        │         │job queue    │     │                       │
                        │         │(Redis/SQS)  │     │                       │
                        │         └──────┬──────┘     │                       │
                        │                │             │                       │
                        │     ┌──────────┼─────────┐  │                       │
                        │     ▼          ▼         ▼  │                       │
                        │  vision-svc inference  visual│                       │
                        │   :4007      -svc      -gen  │                       │
                        │            :4008      :4009  │                       │
                        │                              │                       │
                        │  ──────────── Shared Infrastructure ─────────────   │
                        │   Supabase (DB + Auth + Storage)   Redis Cache       │
                        │   AWS Rekognition    OpenAI API    Replicate API     │
                        └──────────────────────────────────────────────────────┘
```

---

## Service-by-Service Breakdown

---

### 1. `frontend` Service

**Purpose:** Serve the Next.js React UI. No business logic — only renders pages,
calls the `api-gateway`, and handles Supabase Auth SSR cookie management.

**Pages kept:**
- `/` home, `/upload`, `/auth`, `/report/[id]`, `/r/[token]` (public share)
- `/dashboard/*`, `/success`

**Removed from this service:**
- All `src/app/api/` routes (moved to dedicated services)

**Dockerfile:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
```

**Kubernetes:** `Deployment` with 2 replicas, `HorizontalPodAutoscaler` (2-10
replicas based on CPU).

---

### 2. `api-gateway` Service

**Purpose:** Single entry-point for all API traffic. Responsibilities:
- Validate Supabase JWTs on every request (`Authorization: Bearer <token>`)
- Rate-limiting per user and per IP (using Redis)
- Route to downstream services based on URL prefix
- Strip/add internal headers (`x-user-id`, `x-internal-secret`)
- Block oversized payloads before they reach analysis-service

**Routing table:**

| Incoming path prefix       | Upstream service        |
|----------------------------|-------------------------|
| `/api/analyze`             | `analysis-service`      |
| `/api/chat`                | `chat-service`          |
| `/api/payments`            | `payment-service`       |
| `/api/webhooks`            | `payment-service`       |
| `/api/reports`             | `report-service`        |
| `/api/admin`               | `admin-service`         |
| `/api/internal`            | `visual-gen-service`    |
| `/api/og`                  | `report-service`        |
| `/*` (everything else)     | `frontend`              |

**Tech:** Node.js with `http-proxy-middleware`, or a lightweight Nginx
`upstream` config, or Kong/Traefik if more features are needed.

**Dockerfile:** Nginx-based reverse proxy config or lightweight Express proxy.

**Kubernetes:** `Deployment` 2 replicas + `Service` (ClusterIP) + `Ingress`
resource pointing at this service.

---

### 3. `analysis-service`

**Purpose:** Orchestrate the full analysis pipeline for a single selfie. This is
the most CPU/memory-intensive step.

**Responsibilities (from current `src/app/api/analyze/route.ts` and
`src/lib/ai/pipeline.ts`):**
- Accept multipart image upload
- Magic-byte validation + `sharp` dimension checks
- Deduplicate by image hash (Supabase `image_hash` column)
- Create a `reports` row with `status = processing`
- Publish a job to the **job queue** (Redis Streams or AWS SQS):
  - job payload: `{ reportId, imageBase64, userId }`
- A worker loop inside this service (or a separate worker pod) consumes the
  queue and:
  1. Calls `vision-service` (Rekognition) — gRPC or HTTP
  2. Calls `inference-service` (all GPT stages) — HTTP with streaming JSON
  3. Writes partial results back to Supabase as each stage completes
  4. On completion publishes a `visuals.requested` event for `visual-gen-service`
  5. Updates `reports.status = ready`
- Daily quota enforcement (10 analyses / user / day via Supabase RPC)

**Why a queue?** The current fire-and-forget HTTP call from analyze → trigger-visuals
is fragile. A durable queue ensures no job is lost if a pod restarts.

**Environment variables needed:**
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
VISION_SERVICE_URL
INFERENCE_SERVICE_URL
VISUAL_GEN_SERVICE_URL
REDIS_URL
INTERNAL_API_SECRET
```

**Kubernetes:**
- `Deployment` (HTTP handler) — 2 replicas
- `Deployment` (queue worker) — 1-3 replicas, `KEDA ScaledObject` on queue depth

---

### 4. `vision-service`

**Purpose:** Thin wrapper around AWS Rekognition `DetectFaces`.

**Responsibilities:**
- Receive `{ imageBase64 }` via POST
- Call AWS Rekognition `DetectFaces`
- Return normalised landmark JSON
- Cache results by image hash in Redis (TTL 24 h) to avoid redundant AWS calls

**Why separate?** AWS SDK is ~20 MB of dependencies; isolating it means only
this pod needs AWS credentials.

**Environment variables needed:**
```
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
REDIS_URL
```

**Kubernetes:** `Deployment` 1-2 replicas (Rekognition calls are fast and
stateless).

---

### 5. `inference-service`

**Purpose:** Execute all OpenAI GPT-4o/4o-mini vision calls from the pipeline
(stages 2-8 in `pipeline.ts`).

**Pipeline stages handled:**
1. Face shape (GPT-4o-mini Vision)
2. Color analysis (GPT-4o Vision)
3. Skin analysis (GPT-4o Vision)
4. Eye/nose/lips/cheeks features (GPT-4o-mini)
5. Glasses recommendations (GPT-4o-mini, uses face shape from stage 1)
6. Hairstyle recommendations (GPT-4o-mini, uses face shape)
7. Compile final summary (GPT-4o-mini)

**API design:**
- `POST /stage/:stageName` → runs one stage, returns JSON
- `analysis-service` calls stages sequentially (respecting data dependencies)
  or in parallel where safe (stages 3-4-5 can run in parallel after stage 1)
- Includes canary variant logic (`lib/ai/canary.ts`) and resilience retries
  (`lib/ai/resilience.ts`)

**Environment variables needed:**
```
OPENAI_API_KEY
REDIS_URL  (for canary metric writes)
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (canary stats write)
```

**Kubernetes:** `Deployment` 2-4 replicas. OpenAI calls are I/O-bound so
horizontal scaling is highly effective here. `HPA` on RPS or custom queue-depth
metric.

---

### 6. `visual-gen-service`

**Purpose:** Generate all visual assets for a completed report.
Currently handled by `src/app/api/internal/trigger-visuals` and
`src/lib/ai/visuals.ts`.

**Responsibilities:**
- Consume `visuals.requested` events from the job queue
- Generate:
  - Landmark face overlay (SVG → PNG, `sharp`)
  - Seasonal colour palette board (SVG → PNG)
  - Colour season swatch previews (`lib/ai/color-swatch-v2.ts`)
  - Hair style image previews (Replicate `replicate-hair.ts`)
  - Glasses try-on previews (Replicate `replicate-glasses.ts`)
- Upload all generated assets to Supabase Storage
- Write asset URLs to `visual_assets` table
- Expose `POST /generate/:reportId` for on-demand regeneration (admin use)

**Why separate?** This service:
- Has the longest runtime (up to 300 s for Replicate jobs)
- Needs `sharp` native binary (platform-specific, complicates shared image)
- Can be scaled independently (Replicate jobs are rate-limited)
- Is completely async — no user is waiting on HTTP

**Environment variables needed:**
```
REPLICATE_API_TOKEN
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
REDIS_URL
INTERNAL_API_SECRET
```

**Kubernetes:**
- `Deployment` 1-2 replicas
- `KEDA ScaledObject` — scale to 0 when queue is empty, scale up when
  `visuals.requested` events accumulate

---

### 7. `chat-service`

**Purpose:** Streaming style-consultant chat using OpenAI.
Currently `src/app/api/chat/route.ts`.

**Responsibilities:**
- Validate session (forwarded user-id from api-gateway)
- Load report context from Supabase
- Persist and retrieve chat history (`chat_history` table)
- Stream Server-Sent Events (SSE) or chunked HTTP back to the client
- Enforce message size and payload sanity limits

**Environment variables needed:**
```
OPENAI_API_KEY
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

**Kubernetes:** `Deployment` 2 replicas. Chat is stateless per request;
horizontal scaling is straightforward. WebSocket upgrade path optional for
future.

---

### 8. `payment-service`

**Purpose:** Razorpay payment lifecycle.
Currently `src/app/api/payments/*` and `src/app/api/webhooks/razorpay/`.

**Responsibilities:**
- `POST /payments/create` — create Razorpay order, insert `payments` row
- `POST /payments/verify` — verify HMAC signature, mark report as paid
- `POST /webhooks/razorpay` — handle async Razorpay webhooks (idempotent)
- `POST /webhooks/replicate-clothing` — handle Replicate clothing webhook

**Security requirements:**
- Razorpay webhook signature verification must happen in this service only
- No Razorpay key must leak to any other service
- HTTPS-only (enforced by Ingress TLS)

**Environment variables needed:**
```
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

**Kubernetes:** `Deployment` 2 replicas. Stateless; scale on RPS.

---

### 9. `report-service`

**Purpose:** Report CRUD, PDF export, public share tokens, Open Graph images,
and hair-color sub-analysis.
Currently `src/app/api/reports/[id]/*` and `src/app/api/og/`.

**Responsibilities:**
- `GET /reports/:id` — fetch compiled report (owned or paid)
- `DELETE /reports/:id` — soft/hard delete
- `POST /reports/:id/share` — create/revoke public share token
- `GET /r/:token` — resolve public share token
- `POST /reports/:id/pdf` — generate PDF via Puppeteer/Chromium
- `POST /reports/:id/hair-color` — run incremental hair-color analysis
- `GET /reports/:id/visuals` — proxy visual asset URLs
- `GET /og` — generate OG image

**Note on PDF:** Puppeteer + `@sparticuz/chromium-min` is heavy (~400 MB). This
pod should have higher memory limits (1 Gi+) or PDF generation could be split
into its own `pdf-service`.

**Environment variables needed:**
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY  (hair-color sub-analysis)
APP_URL  (for PDF puppeteer target URL)
```

**Kubernetes:** `Deployment` 2 replicas. `resources.limits.memory: 1Gi` due to
Chromium.

---

### 10. `admin-service`

**Purpose:** Internal admin operations.
Currently `src/app/api/admin/*`.

**Responsibilities:**
- `GET /admin/canary-stats` — aggregate canary A/B metrics from Supabase
- `POST /admin/cleanup` — delete expired/orphaned reports and storage objects
- Protected by `x-admin-secret` header (or Supabase admin role check)

**Environment variables needed:**
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
ADMIN_SECRET
```

**Kubernetes:** `Deployment` 1 replica. Not user-facing; low traffic.

---

## Shared Infrastructure

### Supabase
No changes. All services connect to the same Supabase project using the
service-role key for server-side operations. Row-Level Security remains in place
for client-facing reads.

### Redis
Used for:
- Rate limiting (api-gateway)
- Job queue (analysis-service → visual-gen-service)
- Cache (vision-service image hash → Rekognition result)
- Canary metric counters (inference-service)

Deploy as a Redis `StatefulSet` inside Kubernetes or use a managed service
(Redis Cloud, AWS ElastiCache, Upstash).

### Secrets Management
All environment variables stored as Kubernetes `Secret` objects.
Mount them as env vars in pod specs. Never commit to Git.
Use `ExternalSecrets Operator` to sync from AWS Secrets Manager or Vault in
production.

---

## Inter-Service Communication

| Pattern              | Used for                                               |
|----------------------|--------------------------------------------------------|
| HTTP/REST (internal) | api-gateway → all services; analysis → vision/inference |
| Redis Streams        | analysis-service → visual-gen-service (async events)   |
| Kubernetes Service   | ClusterIP DNS names (`http://inference-service:4008`)  |
| No direct DB sharing | Each service uses Supabase; no service calls another's DB |

All internal HTTP calls use the `x-internal-secret` header (already present in
the codebase) to prevent unauthenticated pod-to-pod calls.

---

## Kubernetes Resource Manifests (Outline)

For each service, you need these K8s objects:

```
services/<service-name>/
  Deployment.yaml          # pod spec, image, env, resources, probes
  Service.yaml             # ClusterIP (internal) or NodePort
  HPA.yaml                 # HorizontalPodAutoscaler (if applicable)
  ScaledObject.yaml        # KEDA ScaledObject for queue workers
  ConfigMap.yaml           # non-secret config (feature flags, etc.)
  ServiceAccount.yaml      # least-privilege RBAC
```

**Top-level:**
```
k8s/
  namespace.yaml
  ingress.yaml             # nginx-ingress or AWS ALB Ingress
  redis/
    StatefulSet.yaml
    Service.yaml
    PersistentVolumeClaim.yaml
  secrets/
    external-secrets.yaml  # ExternalSecrets Operator CRDs
```

---

## Docker Image Strategy

All Node.js services share a common multi-stage Dockerfile pattern:

```dockerfile
# Stage 1 — deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2 — build (TypeScript compile)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx tsc --outDir dist

# Stage 3 — runner (minimal image)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 4001  # adjust per service
USER node
CMD ["node", "dist/index.js"]
```

Each service lives in its own directory within a `services/` monorepo root, or
as a separate Git repository, sharing a common `packages/` workspace for:
- `packages/types` — TypeScript types from `src/types/report.ts`
- `packages/contracts` — Zod schemas from `src/lib/ai/contracts.ts`
- `packages/supabase-client` — Supabase client factory

Use `npm workspaces` or `pnpm workspaces` to manage the monorepo.

---

## CI/CD Pipeline

```
Git push → GitHub Actions
  └─ Per-service change detection (path filters)
  └─ For changed service:
       1. npm test (vitest)
       2. docker build --tag registry/service-name:sha
       3. docker push
       4. kubectl set image deployment/service-name ...
       OR
       4. helm upgrade service-name ./charts/service-name
```

Tools: GitHub Actions + AWS ECR (image registry) + `kubectl` or Helm.

---

## Migration Phases

### Phase 1 — Containerise the Monolith (Week 1-2)
- Write a single `Dockerfile` for the current Next.js monolith
- Deploy it as one pod in Kubernetes behind an Ingress
- Verify all existing functionality works in containers
- Set up Redis and external secrets

### Phase 2 — Extract `payment-service` (Week 2-3)
- Payment and webhook logic has the clearest boundary
- Move `src/app/api/payments/*` and `src/app/api/webhooks/razorpay/` to a new
  Express app
- Update api-gateway routing rules
- Smoke-test Razorpay sandbox end-to-end

### Phase 3 — Extract `visual-gen-service` (Week 3-4)
- Move `src/app/api/internal/trigger-visuals` logic to standalone worker
- Replace fire-and-forget HTTP call with Redis Streams job publish
- Deploy `visual-gen-service` with KEDA autoscaler

### Phase 4 — Extract `inference-service` + `vision-service` (Week 4-5)
- These are pure functions with no frontend dependency
- Add Redis caching layer in `vision-service`
- Parallelise GPT stages 3-4-5 in `inference-service`

### Phase 5 — Extract `chat-service` + `report-service` (Week 5-6)
- Straightforward REST + streaming extraction
- Report PDF pod needs higher memory limits

### Phase 6 — Extract `admin-service` + slim `frontend` (Week 6-7)
- Remove all `/api/` routes from the Next.js frontend
- Frontend becomes a pure SSR/RSC app calling the api-gateway
- Add `admin-service`

### Phase 7 — Observability + Hardening (Week 7-8)
- Add `Prometheus` + `Grafana` for metrics scraping
- Add distributed tracing (`OpenTelemetry` + Jaeger or AWS X-Ray)
- Liveness and readiness probes on all pods
- `PodDisruptionBudget` for each Deployment
- Network Policies to restrict pod-to-pod communication to only what is needed

---

## Key Benefits After Migration

| Concern             | Monolith today                   | Microservices target               |
|---------------------|----------------------------------|------------------------------------|
| AI pipeline timeout | 60 s Next.js limit               | Unlimited (async queue worker)     |
| Visual gen timeout  | 300 s, blocks a single Next.js pod | Async KEDA worker, scales to 0   |
| OpenAI rate limits  | Shared across all requests       | Dedicated inference pods, throttle per pod |
| Deployment risk     | Full redeploy on any change      | Deploy only changed service        |
| Scaling             | Entire monolith scales together  | Each service scales independently  |
| Secret exposure     | All secrets in one process       | Least-privilege secrets per pod    |
| Chromium/Puppeteer  | Loaded in same process as UI     | Isolated in report-service pod     |
| Replicate timeouts  | Block the HTTP response          | Non-blocking queue consumer        |

---

## Risks and Mitigations

| Risk                                      | Mitigation                                              |
|-------------------------------------------|---------------------------------------------------------|
| Distributed transactions across services  | Use Supabase as the source of truth; use idempotency keys on all writes |
| Network latency between services          | Co-locate pods in same K8s node group; use ClusterIP (not external DNS) |
| Secrets proliferation                     | ExternalSecrets Operator syncing from one secret store  |
| Monorepo shared types drifting            | `packages/types` and `packages/contracts` as versioned workspace packages |
| Cold-start latency for visual-gen         | KEDA min replica = 1 during business hours using a cron schedule |
| Supabase connection pool exhaustion       | Use Supabase connection pooler (pgBouncer) — each service gets its own pool slot |
| Auth token forwarding security            | api-gateway validates JWT and forwards only `x-user-id`; downstream services never re-validate raw tokens |
