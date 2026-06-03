import { NextResponse, type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { createHash } from "crypto";
import type { PipelineStageEvent } from "@/lib/ai/pipeline";
import { persistStylePrefs } from "@/lib/ai/memory";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { consumeIdentityWindow } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Fire-and-forget: call the internal trigger-visuals endpoint so visual
 * generation starts immediately after the report is marked ready — before
 * the client even receives the response.
 */
async function kickOffVisualsInBackground(
  reportId: string,
  appUrl: string,
  internalSecret: string,
): Promise<void> {
  const url = `${appUrl}/api/internal/trigger-visuals`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify({ reportId }),
  });
}

/** Accepted MIME types for uploaded selfies. */
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIN_IMAGE_DIMENSION = 256;
const MAX_IMAGE_DIMENSION = 4096;
const DAILY_ANALYSIS_QUOTA = 10;
const ANALYZE_BURST_WINDOW_SECONDS = 10 * 60;
const ANALYZE_DAILY_WINDOW_SECONDS = 24 * 60 * 60;
const ANALYZE_BURST_POLICY = {
  action: "analyze_burst_10m",
  windowSeconds: ANALYZE_BURST_WINDOW_SECONDS,
  caps: {
    free: 2,
    report: 4,
    studio_pro: 8,
  },
} as const;
const ANALYZE_DAILY_POLICY = {
  action: "analyze_daily_24h",
  windowSeconds: ANALYZE_DAILY_WINDOW_SECONDS,
  caps: {
    free: DAILY_ANALYSIS_QUOTA,
    report: DAILY_ANALYSIS_QUOTA,
    studio_pro: 60,
  },
} as const;
const ETA_FALLBACK_MS = 45000;
const ETA_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const ETA_SAMPLE_SIZE = 100;

type PipelineMetaLike = {
  totalDurationMs?: unknown;
  stages?: unknown;
};

type StageDurationMap = Record<string, number>;

type AnalyzeStreamEvent =
  | { type: "accepted"; reportId: string }
  | { type: "cached"; reportId: string }
  | { type: "stage_started"; stage: string; variantId?: string }
  | { type: "stage_completed"; stage: string; durationMs?: number; degraded?: boolean; variantId?: string }
  | { type: "completed"; reportId: string; visualsPending: boolean }
  | { type: "failed"; message: string };

function parsePositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function toStageMap(value: unknown): StageDurationMap {
  if (!Array.isArray(value)) return {};
  const map: StageDurationMap = {};
  const counts: Record<string, number> = {};
  for (const item of value) {
    const stage = typeof item === "object" && item !== null ? (item as { stage?: unknown }).stage : undefined;
    const duration = typeof item === "object" && item !== null ? (item as { durationMs?: unknown }).durationMs : undefined;
    if (typeof stage !== "string") continue;
    const ms = parsePositiveNumber(duration);
    if (!ms) continue;
    map[stage] = (map[stage] ?? 0) + ms;
    counts[stage] = (counts[stage] ?? 0) + 1;
  }
  for (const key of Object.keys(map)) {
    map[key] = Math.round(map[key] / Math.max(1, counts[key] ?? 1));
  }
  return map;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return ETA_FALLBACK_MS;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

type StagePercentileMap = Record<string, { p50: number; p75: number; p90: number }>;

async function computeRecentEta(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const since = new Date(Date.now() - ETA_LOOKBACK_MS).toISOString();
  const { data, error } = await admin
    .from("reports")
    .select("pipeline_meta, created_at")
    .eq("status", "ready")
    .not("pipeline_meta", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(ETA_SAMPLE_SIZE);
  if (error) throw error;

  const totals: number[] = [];
  const stageAllMs: Record<string, number[]> = {};

  for (const row of data ?? []) {
    const meta = (row.pipeline_meta ?? {}) as PipelineMetaLike;
    const total = parsePositiveNumber(meta.totalDurationMs);
    if (total) totals.push(total);
    const stageMap = toStageMap(meta.stages);
    for (const [stage, ms] of Object.entries(stageMap)) {
      (stageAllMs[stage] ??= []).push(ms);
    }
  }

  const sortedTotals = [...totals].sort((a, b) => a - b);

  const stagePercentiles: StagePercentileMap = {};
  const stageAvgMs: StageDurationMap = {};
  for (const [stage, samples] of Object.entries(stageAllMs)) {
    const sorted = [...samples].sort((a, b) => a - b);
    stagePercentiles[stage] = {
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p90: percentile(sorted, 90),
    };
    stageAvgMs[stage] = Math.round(samples.reduce((s, v) => s + v, 0) / samples.length);
  }

  const fallbackUsed = sortedTotals.length === 0;
  const p50Ms = fallbackUsed ? ETA_FALLBACK_MS : percentile(sortedTotals, 50);
  const p75Ms = fallbackUsed ? Math.round(ETA_FALLBACK_MS * 1.25) : percentile(sortedTotals, 75);
  const p90Ms = fallbackUsed ? Math.round(ETA_FALLBACK_MS * 1.5) : percentile(sortedTotals, 90);
  const totalAvgMs = fallbackUsed
    ? ETA_FALLBACK_MS
    : Math.round(sortedTotals.reduce((acc, ms) => acc + ms, 0) / sortedTotals.length);

  return {
    totalAvgMs,
    p50Ms,
    p75Ms,
    p90Ms,
    stageAvgMs,
    stagePercentiles,
    sampleSize: totals.length,
    fallbackUsed,
    generatedAt: new Date().toISOString(),
  };
}

// Caches ETA result for 60 s across all concurrent pollers on this instance.
// Prevents thundering-herd on the reports aggregation query during active analyses.
const getCachedEta = unstable_cache(
  async () => {
    const admin = createSupabaseAdminClient();
    return computeRecentEta(admin);
  },
  ["analyze-eta"],
  { revalidate: 60 },
);

function toStreamLine(event: AnalyzeStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

function buildAnalyzeRateLimitErrorMessage(kind: "burst" | "daily", retryAfterSeconds: number): string {
  if (kind === "daily") {
    const retryHours = Math.max(1, Math.ceil(retryAfterSeconds / 3600));
    return `Daily analysis limit reached. Please try again in about ${retryHours} hour${retryHours === 1 ? "" : "s"}.`;
  }
  const retryMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many requests. Please wait about ${retryMinutes} minute${retryMinutes === 1 ? "" : "s"} before trying again.`;
}

function isTrustedAnalyzeRequestOrigin(req: NextRequest): boolean {
  const authorization = req.headers.get("authorization") ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    // Mobile/native callers use bearer auth and may not send browser origin headers.
    return true;
  }

  const allowedOrigins = new Set<string>();
  try {
    allowedOrigins.add(new URL(env.app.url).origin);
  } catch {
    // Ignore malformed env in this check; request will fail later during assertServer.
  }
  allowedOrigins.add(req.nextUrl.origin);

  const origin = req.headers.get("origin");
  if (origin) {
    return allowedOrigins.has(origin);
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return allowedOrigins.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Non-browser clients may legitimately omit both headers.
  return true;
}

export async function GET() {
  try {
    env.assertServer();
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eta = await getCachedEta();
    return NextResponse.json(eta);
  } catch (err) {
    console.error("[GET /api/analyze]", err);
    return NextResponse.json({ error: "Failed to compute ETA" }, { status: 500 });
  }
}

/**
 * Check the first 12 bytes of a buffer to confirm it is a real JPEG, PNG, or WEBP.
 * This prevents an attacker from spoofing Content-Type by renaming a file.
 */
function validateMagicBytes(buf: Buffer): boolean {
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return true;
  // WEBP: RIFF????WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true;
  return false;
}

/**
 * POST /api/analyze
 * Body: multipart/form-data with field `image`
 * Returns: { reportId, visualsPending: true }
 *
 * Flow:
 *  1. Authenticate user via Supabase session.
 *  2. Validate file MIME type and magic bytes.
 *  3. Enforce max-1-in-flight per user (anti-abuse).
 *  4. Persist the original image to private storage.
 *  5. Run the text analysis pipeline (~30-50 s).
 *  6. Persist style prefs for the memory loop (fire-and-forget).
 *  7. Mark report ready and return.
 *
 * Visual asset generation (landmark overlay, palette board, try-on previews)
 * is intentionally omitted here. The client calls POST /api/reports/[id]/visuals
 * immediately after receiving reportId, which runs in its own 120 s function.
 * This keeps this route under 60 s and well within Vercel hobby limits.
 */
export async function POST(req: NextRequest) {
  env.assertServer();
  if (!isTrustedAnalyzeRequestOrigin(req)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const streamRequested = req.nextUrl.searchParams.get("stream") === "1";

  if (streamRequested) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const emit = (event: AnalyzeStreamEvent) => {
          controller.enqueue(encoder.encode(toStreamLine(event)));
        };

        void (async () => {
          try {
            env.assertRekognition();

            const supabase = await createSupabaseServerClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              emit({ type: "failed", message: "Unauthorized" });
              controller.close();
              return;
            }

            const form = await req.formData();
            const file = form.get("image");
            if (!(file instanceof Blob)) {
              emit({ type: "failed", message: "Missing image" });
              controller.close();
              return;
            }

            let skinUserContext: { ageRange?: string; selfReportedFeeling?: string; primaryConcern?: string } | undefined;
            const skinContextRaw = form.get("skinContext");
            if (typeof skinContextRaw === "string" && skinContextRaw.length > 0) {
              try {
                const raw = JSON.parse(skinContextRaw) as Record<string, unknown>;
                // Sanitize: cap each field to 100 chars, strip characters outside
                // printable ASCII to prevent prompt injection via skinContext.
                const sanitize = (v: unknown): string | undefined => {
                  if (typeof v !== "string") return undefined;
                  // eslint-disable-next-line no-control-regex
                  return v.replace(/[\x00-\x1F\x7F]/g, " ").slice(0, 100).trim() || undefined;
                };
                skinUserContext = {
                  ageRange:            sanitize(raw.ageRange),
                  selfReportedFeeling: sanitize(raw.selfReportedFeeling),
                  primaryConcern:      sanitize(raw.primaryConcern),
                };
              } catch { /* ignore malformed */ }
            }

            if (!ALLOWED_TYPES.has(file.type)) {
              emit({ type: "failed", message: "Only JPEG, PNG, and WEBP images are accepted" });
              controller.close();
              return;
            }
            if (file.size > 8 * 1024 * 1024) {
              emit({ type: "failed", message: "Image too large (max 8 MB)" });
              controller.close();
              return;
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            if (!validateMagicBytes(buffer)) {
              emit({ type: "failed", message: "File content does not match a valid image format" });
              controller.close();
              return;
            }

            const { default: sharp } = await import("sharp");
            const metadata = await sharp(buffer).metadata();
            const width = metadata.width ?? 0;
            const height = metadata.height ?? 0;
            if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
              emit({ type: "failed", message: `Image too small (minimum ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION})` });
              controller.close();
              return;
            }
            if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
              emit({ type: "failed", message: `Image too large in dimensions (maximum ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION})` });
              controller.close();
              return;
            }

            const admin = createSupabaseAdminClient();
            const imageHash = createHash("sha256").update(buffer).digest("hex");

            const { data: existingReport } = await admin
              .from("reports")
              .select("id")
              .eq("user_id", user.id)
              .eq("image_hash", imageHash)
              .eq("status", "ready")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (existingReport?.id) {
              emit({ type: "cached", reportId: existingReport.id });
              emit({ type: "completed", reportId: existingReport.id, visualsPending: false });
              controller.close();
              return;
            }

            const isAdmin = env.auth.adminEmailAllowlist.includes((user.email ?? "").toLowerCase());

            if (!isAdmin) {
              const burstDecision = await consumeIdentityWindow(admin, user.id, ANALYZE_BURST_POLICY);
              if (!burstDecision.allowed) {
                emit({
                  type: "failed",
                  message: buildAnalyzeRateLimitErrorMessage("burst", burstDecision.retryAfterSeconds),
                });
                controller.close();
                return;
              }
            }

            if (!isAdmin) {
              const dailyDecision = await consumeIdentityWindow(admin, user.id, ANALYZE_DAILY_POLICY);
              if (!dailyDecision.allowed) {
                emit({
                  type: "failed",
                  message: buildAnalyzeRateLimitErrorMessage("daily", dailyDecision.retryAfterSeconds),
                });
                controller.close();
                return;
              }
            }

            const { data: report, error: insertErr } = await admin
              .from("reports")
              .insert({ user_id: user.id, image_path: "pending", status: "processing", image_hash: imageHash })
              .select("id")
              .single();
            if (insertErr) {
              if (insertErr.code === "23505" && insertErr.message.includes("reports_one_processing_per_user_idx")) {
                emit({ type: "failed", message: "An analysis is already in progress. Please wait for it to complete." });
                controller.close();
                return;
              }
              throw insertErr;
            }
            if (!report) throw new Error("Failed to create report");

            emit({ type: "accepted", reportId: report.id });

            const imagePath = `${user.id}/${report.id}.jpg`;
            const { error: upErr } = await admin.storage
              .from(env.supabase.bucket)
              .upload(imagePath, buffer, { contentType: "image/jpeg", upsert: true });
            if (upErr) {
              await admin.from("reports")
                .update({ status: "failed", error: upErr.message })
                .eq("id", report.id);
              throw upErr;
            }

            await admin.from("reports").update({ image_path: imagePath }).eq("id", report.id);

            const onStage = (event: PipelineStageEvent) => {
              if (event.status === "started") {
                emit({ type: "stage_started", stage: event.stage, variantId: event.variantId });
                return;
              }
              emit({
                type: "stage_completed",
                stage: event.stage,
                durationMs: event.durationMs,
                degraded: event.degraded,
                variantId: event.variantId,
              });
            };

            try {
              const { runAnalysisPipeline } = await import("@/lib/ai/pipeline");
              const result = await runAnalysisPipeline(buffer, user.id, skinUserContext, onStage);

              const reportUpdatePayload = {
                status: "ready",
                rekognition: result.rekognition as object,
                face_shape: result.faceShape,
                color_analysis: result.colorAnalysis,
                skin_analysis: result.skinAnalysis,
                features: result.features,
                glasses: result.glasses,
                hairstyle: result.hairstyle,
                summary: result.summary,
                pipeline_meta: result.meta,
              };

              const { error: reportUpdateErr } = await admin
                .from("reports")
                .update(reportUpdatePayload)
                .eq("id", report.id);

              if (reportUpdateErr) {
                if (reportUpdateErr.code === "42703") {
                  const { error: legacyUpdateErr } = await admin
                    .from("reports")
                    .update({
                      status: "ready",
                      rekognition: result.rekognition as object,
                      face_shape: result.faceShape,
                      color_analysis: result.colorAnalysis,
                      skin_analysis: result.skinAnalysis,
                      features: result.features,
                      glasses: result.glasses,
                      hairstyle: result.hairstyle,
                      summary: result.summary,
                    })
                    .eq("id", report.id);
                  if (legacyUpdateErr) throw legacyUpdateErr;

                  await admin.from("recommendations").insert({
                    report_id: report.id,
                    category: "pipeline_meta",
                    title: "Pipeline diagnostics",
                    data: result.meta,
                  });
                } else {
                  throw reportUpdateErr;
                }
              }

              await admin.from("recommendations").insert([
                { report_id: report.id, category: "color", title: result.colorAnalysis.season, description: result.colorAnalysis.description, data: result.colorAnalysis },
                { report_id: report.id, category: "glasses", title: "Spectacles guide", data: result.glasses },
                { report_id: report.id, category: "hair", title: "Hairstyle guide", data: result.hairstyle },
              ]);

              persistStylePrefs(user.id, result.faceShape, result.colorAnalysis, result.skinAnalysis).catch(() => {
                // Already logged inside persistStylePrefs
              });
            } catch (pipelineErr) {
              console.error("[analyze] pipeline failed:", pipelineErr);
              const pe = pipelineErr as { name?: string; stage?: string; kind?: string; message?: string };
              const isValidationError = pe.name === "PipelineStageError" && pe.kind === "validation";
              const internalError = pe.name === "PipelineStageError"
                ? `${pe.stage}:${pe.kind}:${pe.message}`
                : (pipelineErr as Error).message;
              await admin.from("reports").update({
                status: "failed",
                error: internalError?.slice(0, 500),
              }).eq("id", report.id);
              // Surface photo quality / validation errors directly to the user.
              // All other failures show a generic message to avoid leaking internals.
              const userMessage = isValidationError && pe.message
                ? pe.message
                : "Analysis failed. Please try again.";
              emit({ type: "failed", message: userMessage });
              controller.close();
              return;
            }

            kickOffVisualsInBackground(report.id, env.app.url, env.internal.secret).catch(() => {
              // Failure is non-fatal — client will retrigger via polling
            });

            emit({ type: "completed", reportId: report.id, visualsPending: true });
            controller.close();
          } catch (err) {
            console.error("[POST /api/analyze?stream=1]", err);
            emit({ type: "failed", message: "An unexpected error occurred" });
            controller.close();
          }
        })();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    // Optional skin questionnaire context (from pre-analysis form in the UI)
    let skinUserContext: { ageRange?: string; selfReportedFeeling?: string; primaryConcern?: string } | undefined;
    const skinContextRaw = form.get("skinContext");
    if (typeof skinContextRaw === "string" && skinContextRaw.length > 0) {
      try {
        const raw = JSON.parse(skinContextRaw) as Record<string, unknown>;
        const sanitize = (v: unknown): string | undefined => {
          if (typeof v !== "string") return undefined;
          // eslint-disable-next-line no-control-regex
          return v.replace(/[\x00-\x1F\x7F]/g, " ").slice(0, 100).trim() || undefined;
        };
        skinUserContext = {
          ageRange:            sanitize(raw.ageRange),
          selfReportedFeeling: sanitize(raw.selfReportedFeeling),
          primaryConcern:      sanitize(raw.primaryConcern),
        };
      } catch { /* ignore malformed */ }
    }

    // ── MIME type allowlist check ─────────────────────────────────────────────
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WEBP images are accepted" },
        { status: 415 },
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 8 MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Magic-bytes validation ────────────────────────────────────────────────
    if (!validateMagicBytes(buffer)) {
      return NextResponse.json(
        { error: "File content does not match a valid image format" },
        { status: 415 },
      );
    }

    const { default: sharp } = await import("sharp");
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
      return NextResponse.json(
        { error: `Image too small (minimum ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION})` },
        { status: 400 },
      );
    }
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      return NextResponse.json(
        { error: `Image too large in dimensions (maximum ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION})` },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();

    // ── SHA-256 deduplication (Phase 5.2) ─────────────────────────────────────
    // If this user already has a ready report with the same image bytes, return
    // it immediately — skipping the entire AI pipeline and image generation cost.
    const imageHash = createHash("sha256").update(buffer).digest("hex");

    const { data: existingReport } = await admin
      .from("reports")
      .select("id")
      .eq("user_id", user.id)
      .eq("image_hash", imageHash)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingReport?.id) {
      // Return the cached report — no pipeline, no generation cost.
      return NextResponse.json({ reportId: existingReport.id, visualsPending: false, cached: true });
    }

    // ── Admin bypass: no rate or quota limits for allowlisted emails ──────────
    const isAdmin = env.auth.adminEmailAllowlist.includes(
      (user.email ?? "").toLowerCase(),
    );

    // ── Identity burst guard (tier-aware rolling 10 minute window) ───────────
    if (!isAdmin) {
      const burstDecision = await consumeIdentityWindow(admin, user.id, ANALYZE_BURST_POLICY);
      if (!burstDecision.allowed) {
        return NextResponse.json(
          {
            error: buildAnalyzeRateLimitErrorMessage("burst", burstDecision.retryAfterSeconds),
            code: "RATE_LIMITED",
            action: burstDecision.action,
            tier: burstDecision.tier,
            limit: burstDecision.cap,
            windowSeconds: burstDecision.windowSeconds,
            retryAfterSeconds: burstDecision.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(burstDecision.retryAfterSeconds),
              "X-RateLimit-Limit": String(burstDecision.cap),
              "X-RateLimit-Window": `${burstDecision.windowSeconds}s`,
            },
          },
        );
      }
    }

    // ── Identity daily quota (tier-aware rolling 24 hour window) ─────────────
    if (!isAdmin) {
      const dailyDecision = await consumeIdentityWindow(admin, user.id, ANALYZE_DAILY_POLICY);
      if (!dailyDecision.allowed) {
        return NextResponse.json(
          {
            error: buildAnalyzeRateLimitErrorMessage("daily", dailyDecision.retryAfterSeconds),
            code: "RATE_LIMITED",
            action: dailyDecision.action,
            tier: dailyDecision.tier,
            limit: dailyDecision.cap,
            windowSeconds: dailyDecision.windowSeconds,
            retryAfterSeconds: dailyDecision.retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(dailyDecision.retryAfterSeconds),
              "X-RateLimit-Limit": String(dailyDecision.cap),
              "X-RateLimit-Window": `${dailyDecision.windowSeconds}s`,
            },
          },
        );
      }
    }

    // 1) Insert pending report to get an id.
    // Atomic in-flight control is enforced by DB unique partial index.
    const { data: report, error: insertErr } = await admin
      .from("reports")
      .insert({ user_id: user.id, image_path: "pending", status: "processing", image_hash: imageHash })
      .select("id")
      .single();
    if (insertErr) {
      if (insertErr.code === "23505" && insertErr.message.includes("reports_one_processing_per_user_idx")) {
        return NextResponse.json(
          { error: "An analysis is already in progress. Please wait for it to complete." },
          { status: 429 },
        );
      }
      throw insertErr;
    }
    if (!report) throw new Error("Failed to create report");

    const imagePath = `${user.id}/${report.id}.jpg`;

    // 2) Upload original image to private bucket
    const { error: upErr } = await admin.storage
      .from(env.supabase.bucket)
      .upload(imagePath, buffer, { contentType: "image/jpeg", upsert: true });
    if (upErr) {
      await admin.from("reports")
        .update({ status: "failed", error: upErr.message })
        .eq("id", report.id);
      throw upErr;
    }

    await admin.from("reports").update({ image_path: imagePath }).eq("id", report.id);

    // 3) Run text analysis pipeline (Rekognition + all GPT stages)
    //    Pass user.id so the pipeline can inject personalized style context.
    try {
      const { runAnalysisPipeline } = await import("@/lib/ai/pipeline");
      const result = await runAnalysisPipeline(buffer, user.id, skinUserContext);

      const reportUpdatePayload = {
        status: "ready",
        rekognition: result.rekognition as object,
        face_shape: result.faceShape,
        color_analysis: result.colorAnalysis,
        skin_analysis: result.skinAnalysis,
        features: result.features,
        glasses: result.glasses,
        hairstyle: result.hairstyle,
        summary: result.summary,
        pipeline_meta: result.meta,
      };

      const { error: reportUpdateErr } = await admin
        .from("reports")
        .update(reportUpdatePayload)
        .eq("id", report.id);

      if (reportUpdateErr) {
        // Backward compatibility for environments without pipeline_meta column
        if (reportUpdateErr.code === "42703") {
          const { error: legacyUpdateErr } = await admin
            .from("reports")
            .update({
              status: "ready",
              rekognition: result.rekognition as object,
              face_shape: result.faceShape,
              color_analysis: result.colorAnalysis,
              skin_analysis: result.skinAnalysis,
              features: result.features,
              glasses: result.glasses,
              hairstyle: result.hairstyle,
              summary: result.summary,
            })
            .eq("id", report.id);
          if (legacyUpdateErr) throw legacyUpdateErr;

          await admin.from("recommendations").insert({
            report_id: report.id,
            category: "pipeline_meta",
            title: "Pipeline diagnostics",
            data: result.meta,
          });
        } else {
          throw reportUpdateErr;
        }
      }

      await admin.from("recommendations").insert([
        { report_id: report.id, category: "color", title: result.colorAnalysis.season, description: result.colorAnalysis.description, data: result.colorAnalysis },
        { report_id: report.id, category: "glasses", title: "Spectacles guide", data: result.glasses },
        { report_id: report.id, category: "hair", title: "Hairstyle guide", data: result.hairstyle },
      ]);

      // 4) Persist style prefs for memory loop (fire-and-forget — never blocks response)
      persistStylePrefs(user.id, result.faceShape, result.colorAnalysis, result.skinAnalysis).catch(() => {
        // Already logged inside persistStylePrefs
      });
    } catch (pipelineErr) {
      console.error("[analyze] pipeline failed:", pipelineErr);
      const pe = pipelineErr as { name?: string; stage?: string; kind?: string; message?: string };
      const internalError = pe.name === "PipelineStageError"
        ? `${pe.stage}:${pe.kind}:${pe.message}`
        : (pipelineErr as Error).message;
      await admin.from("reports").update({
        status: "failed",
        error: internalError?.slice(0, 500),
      }).eq("id", report.id);
      return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
    }

    // Fire visual generation in the background — non-blocking.
    // The client still polls, but images will be ready sooner because generation
    // started ~60s earlier (during the text-analysis wait time).
    kickOffVisualsInBackground(report.id, env.app.url, env.internal.secret).catch(() => {
      // Failure is non-fatal — client will retrigger via polling
    });

    // visualsPending tells the client to immediately fire POST /api/reports/[id]/visuals
    return NextResponse.json({ reportId: report.id, visualsPending: true });
  } catch (err) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
