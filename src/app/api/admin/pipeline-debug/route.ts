/**
 * GET /api/admin/pipeline-debug/eta
 * Returns ETA stats including percentiles. Admin only.
 *
 * POST /api/admin/pipeline-debug
 * Accepts: multipart/form-data with field `image` (same as /api/analyze)
 * Returns: NDJSON stream of pipeline stage events with timing data.
 * Access: restricted to ADMIN_EMAIL_ALLOWLIST (paraspahwa5@gmail.com).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { isAdminUserEmail } from "@/lib/auth/access";
import type { PipelineStageEvent } from "@/lib/ai/pipeline";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIN_DIM = 256;
const MAX_DIM = 4096;

function validateMagicBytes(buf: Buffer): boolean {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  return false;
}

type DebugEvent =
  | { type: "auth_ok"; email: string }
  | { type: "image_accepted"; sizeKb: number; width: number; height: number; hash: string }
  | { type: "stage_started"; stage: string; variantId?: string; wallMs: number }
  | { type: "stage_completed"; stage: string; durationMs: number; degraded: boolean; variantId?: string; wallMs: number }
  | { type: "pipeline_completed"; totalDurationMs: number; wallMs: number }
  | { type: "pipeline_failed"; message: string; wallMs: number }
  | { type: "error"; message: string };

function line(event: DebugEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

async function assertAdmin(req: NextRequest) {
  env.assertServer();
  const user = await getRequestUser(req);
  if (!user || !isAdminUserEmail(user.email)) return null;
  return user;
}

// ── GET: ETA stats (admin only) ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await assertAdmin(req);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("reports")
    .select("pipeline_meta, created_at")
    .eq("status", "ready")
    .not("pipeline_meta", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type MetaLike = { totalDurationMs?: unknown; stages?: unknown[] };
  type StageSample = { durationMs?: unknown; stage?: unknown; degraded?: unknown };

  const totals: number[] = [];
  const stageAllMs: Record<string, number[]> = {};
  const stageAllDegraded: Record<string, number[]> = {};

  for (const row of data ?? []) {
    const meta = (row.pipeline_meta ?? {}) as MetaLike;
    if (typeof meta.totalDurationMs === "number" && meta.totalDurationMs > 0) {
      totals.push(meta.totalDurationMs);
    }
    if (Array.isArray(meta.stages)) {
      for (const s of meta.stages as StageSample[]) {
        const stage = typeof s.stage === "string" ? s.stage : null;
        const ms = typeof s.durationMs === "number" ? s.durationMs : null;
        if (!stage || !ms) continue;
        (stageAllMs[stage] ??= []).push(ms);
        (stageAllDegraded[stage] ??= []).push(s.degraded ? 1 : 0);
      }
    }
  }

  function pct(sorted: number[], p: number) {
    if (!sorted.length) return null;
    const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[idx];
  }

  const sortedTotals = [...totals].sort((a, b) => a - b);

  const stageStats: Record<string, { p50: number | null; p75: number | null; p90: number | null; avgMs: number; degradationPct: number; sampleCount: number }> = {};
  for (const [stage, samples] of Object.entries(stageAllMs)) {
    const sorted = [...samples].sort((a, b) => a - b);
    const degradedArr = stageAllDegraded[stage] ?? [];
    stageStats[stage] = {
      p50: pct(sorted, 50),
      p75: pct(sorted, 75),
      p90: pct(sorted, 90),
      avgMs: Math.round(samples.reduce((a, b) => a + b, 0) / samples.length),
      degradationPct: degradedArr.length > 0
        ? Math.round((degradedArr.reduce((a, b) => a + b, 0) / degradedArr.length) * 100)
        : 0,
      sampleCount: samples.length,
    };
  }

  return NextResponse.json({
    sampleSize: totals.length,
    total: {
      p50: pct(sortedTotals, 50),
      p75: pct(sortedTotals, 75),
      p90: pct(sortedTotals, 90),
      avg: sortedTotals.length ? Math.round(sortedTotals.reduce((a, b) => a + b, 0) / sortedTotals.length) : null,
    },
    stageStats,
    generatedAt: new Date().toISOString(),
  });
}

// ── POST: Live debug stream ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const startWall = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        try {
          const user = await assertAdmin(req);
          if (!user) {
            controller.enqueue(line({ type: "error", message: "Forbidden" }));
            controller.close();
            return;
          }

          controller.enqueue(line({ type: "auth_ok", email: user.email ?? "" }));

          const form = await req.formData();
          const file = form.get("image");
          if (!(file instanceof Blob)) {
            controller.enqueue(line({ type: "error", message: "Missing image field" }));
            controller.close();
            return;
          }
          if (!ALLOWED_TYPES.has(file.type)) {
            controller.enqueue(line({ type: "error", message: "Unsupported image type" }));
            controller.close();
            return;
          }
          if (file.size > 8 * 1024 * 1024) {
            controller.enqueue(line({ type: "error", message: "Image too large (max 8 MB)" }));
            controller.close();
            return;
          }

          const buffer = Buffer.from(await file.arrayBuffer());
          if (!validateMagicBytes(buffer)) {
            controller.enqueue(line({ type: "error", message: "File magic bytes invalid" }));
            controller.close();
            return;
          }

          const { default: sharp } = await import("sharp");
          const metadata = await sharp(buffer).metadata();
          const width = metadata.width ?? 0;
          const height = metadata.height ?? 0;
          if (width < MIN_DIM || height < MIN_DIM) {
            controller.enqueue(line({ type: "error", message: `Image too small (min ${MIN_DIM}px)` }));
            controller.close();
            return;
          }
          if (width > MAX_DIM || height > MAX_DIM) {
            controller.enqueue(line({ type: "error", message: `Image too large (max ${MAX_DIM}px)` }));
            controller.close();
            return;
          }

          const hash = createHash("sha256").update(buffer).digest("hex");
          controller.enqueue(line({
            type: "image_accepted",
            sizeKb: Math.round(buffer.byteLength / 1024),
            width,
            height,
            hash,
          }));

          const onStage = (event: PipelineStageEvent) => {
            const wallMs = Date.now() - startWall;
            if (event.status === "started") {
              controller.enqueue(line({
                type: "stage_started",
                stage: event.stage,
                variantId: event.variantId,
                wallMs,
              }));
            } else {
              controller.enqueue(line({
                type: "stage_completed",
                stage: event.stage,
                durationMs: event.durationMs ?? 0,
                degraded: event.degraded ?? false,
                variantId: event.variantId,
                wallMs,
              }));
            }
          };

          try {
            const { runAnalysisPipeline } = await import("@/lib/ai/pipeline");
            const result = await runAnalysisPipeline(buffer, user.id, undefined, onStage);
            controller.enqueue(line({
              type: "pipeline_completed",
              totalDurationMs: result.meta.totalDurationMs,
              wallMs: Date.now() - startWall,
            }));
          } catch (pipelineErr) {
            const pe = pipelineErr as { name?: string; stage?: string; kind?: string; message?: string };
            const msg = pe.name === "PipelineStageError"
              ? `${pe.stage}:${pe.kind}:${pe.message}`
              : (pipelineErr as Error).message;
            controller.enqueue(line({ type: "pipeline_failed", message: msg.slice(0, 400), wallMs: Date.now() - startWall }));
          }

          controller.close();
        } catch (err) {
          console.error("[pipeline-debug]", err);
          controller.enqueue(line({ type: "error", message: (err as Error).message }));
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
