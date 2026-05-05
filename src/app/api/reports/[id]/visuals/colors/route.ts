import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { replicateClothingBatchAsync } from "@/lib/ai/replicate-clothing";
import { getFaceBox } from "@/lib/ai/visuals";
import type { ColorAnalysisResult, ReportVisualAssets } from "@/types/report";
import sharp from "sharp";

export const runtime = "nodejs";
// Webhook mode: only fires async predictions — should complete in <10s
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/reports/[id]/visuals/colors
 *
 * Queues 6 Replicate SDXL inpainting predictions asynchronously.
 * Each prediction calls back to /api/webhooks/replicate-clothing when done.
 * This route returns in <10s — no Vercel timeout risk.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();

    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, image_path, rekognition, color_analysis, visual_assets")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.status !== "ready") return NextResponse.json({ error: "Report not ready" }, { status: 409 });

    // Idempotency: skip if all 6 slots are already "ready" or "pending"
    const existing = row.visual_assets as { assets?: { colorSwatchPreviews?: { status: string }[] } } | null;
    const swatches = existing?.assets?.colorSwatchPreviews ?? [];
    const allDone = swatches.length >= 6 && swatches.every((s) => s.status === "ready" || s.status === "pending");
    if (allDone) return NextResponse.json({ ok: true, skipped: true });

    if (!env.replicate.isConfigured) {
      return NextResponse.json({ error: "Replicate not configured" }, { status: 503 });
    }

    // Fetch original image
    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(row.image_path as string);
    if (imgErr || !imgData) return NextResponse.json({ error: "Image unavailable" }, { status: 422 });
    const buffer = Buffer.from(await imgData.arrayBuffer());

    const colorResult = row.color_analysis as ColorAnalysisResult;
    const bestSix = (colorResult?.palette ?? []).slice(0, 6);
    const basePath = `users/${user.id}/reports/${id}/`;

    // Build the "pending" skeleton entries in visual_assets so the UI shows the spinner
    const pendingSwatches = bestSix.map((_, i) => ({
      path: `${basePath}color-swatch-${i}.jpg`,
      status: "pending" as const,
      mime: "image/jpeg",
      error: null,
    }));

    // Merge pending swatches into existing visual_assets
    const currentAssets = (row.visual_assets as ReportVisualAssets | null) ?? {
      version: 1,
      bucket: env.supabase.bucket,
      basePath,
      assets: {},
    };
    const merged: ReportVisualAssets = {
      ...currentAssets,
      assets: { ...currentAssets.assets, colorSwatchPreviews: pendingSwatches },
    };
    await admin.from("reports").update({ visual_assets: merged }).eq("id", id);

    // Get faceBox for mask generation
    const imgMeta = await sharp(buffer).rotate().metadata();
    const W = imgMeta.width ?? 512;
    const H = imgMeta.height ?? 768;
    const faceBox = getFaceBox(row.rekognition, W, H);
    if (!faceBox) {
      console.warn("[visuals/colors] no face box — cannot inpaint");
      return NextResponse.json({ error: "No face detected" }, { status: 422 });
    }

    // Fire all 6 predictions asynchronously — returns immediately
    const appUrl = env.app.url;
    await replicateClothingBatchAsync(
      buffer,
      faceBox,
      bestSix.map((c, i) => ({ index: i, name: c.name, hex: c.hex })),
      env.replicate.apiToken,
      (i) =>
        `${appUrl}/api/webhooks/replicate-clothing?reportId=${id}&userId=${user.id}&slot=${i}&bucket=${env.supabase.bucket}`,
    );

    return NextResponse.json({ ok: true, queued: bestSix.length });
  } catch (err) {
    console.error("[POST /api/reports/[id]/visuals/colors]", err);
    return NextResponse.json({ error: "Color swatch generation failed" }, { status: 500 });
  }
}
