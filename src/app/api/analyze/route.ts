import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { runAnalysisPipeline } from "@/lib/ai/pipeline";
import { PipelineStageError } from "@/lib/ai/resilience";
import { persistStylePrefs } from "@/lib/ai/memory";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Accepted MIME types for uploaded selfies. */
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIN_IMAGE_DIMENSION = 256;
const MAX_IMAGE_DIMENSION = 4096;
const DAILY_ANALYSIS_QUOTA = 10;

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
  try {
    env.assertServer();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
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

    // ── Per-minute burst guard (max 2 submissions per 60 s per user) ────────
    const burstSince = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: burstCount } = await admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", burstSince);
    if ((burstCount ?? 0) >= 2) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before trying again." },
        { status: 429 },
      );
    }

    // ── Daily quota (max 10 per 24 h per user) ────────────────────────────────
    // Basic per-user quota to reduce abuse and runaway costs.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyCount, error: dailyCountErr } = await admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if (dailyCountErr) throw dailyCountErr;
    if ((dailyCount ?? 0) >= DAILY_ANALYSIS_QUOTA) {
      return NextResponse.json(
        { error: "Daily analysis limit reached. Please try again later." },
        { status: 429 },
      );
    }

    // 1) Insert pending report to get an id.
    // Atomic in-flight control is enforced by DB unique partial index.
    const { data: report, error: insertErr } = await admin
      .from("reports")
      .insert({ user_id: user.id, image_path: "pending", status: "processing" })
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
      const result = await runAnalysisPipeline(buffer, user.id);

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
      const internalError = pipelineErr instanceof PipelineStageError
        ? `${pipelineErr.stage}:${pipelineErr.kind}:${pipelineErr.message}`
        : (pipelineErr as Error).message;
      await admin.from("reports").update({
        status: "failed",
        error: internalError?.slice(0, 500),
      }).eq("id", report.id);
      return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
    }

    // visualsPending tells the client to immediately fire POST /api/reports/[id]/visuals
    return NextResponse.json({ reportId: report.id, visualsPending: true });
  } catch (err) {
    console.error("[POST /api/analyze]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
