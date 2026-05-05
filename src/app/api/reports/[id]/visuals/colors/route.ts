import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { generateAllColorSwatchPreviews } from "@/lib/ai/color-swatch-v2";
import type { ColorAnalysisResult, ReportVisualAssets } from "@/types/report";

export const runtime = "nodejs";
// Synchronous mode: all 6 Flux Kontext slots run concurrently — should finish in <30s
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/reports/[id]/visuals/colors
 *
 * Generates up to 6 color swatch previews synchronously using Flux Kontext Fast (v2).
 * Results are uploaded to storage and visual_assets is updated in a single pass.
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
      .select("id, user_id, status, image_path, color_analysis, visual_assets")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.status !== "ready") return NextResponse.json({ error: "Report not ready" }, { status: 409 });

    // Idempotency: skip if all 6 slots are already "ready"
    const existing = row.visual_assets as { assets?: { colorSwatchPreviews?: { status: string }[] } } | null;
    const swatches = existing?.assets?.colorSwatchPreviews ?? [];
    const allDone = swatches.length >= 6 && swatches.every((s) => s.status === "ready");
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

    // Determine which slots are already ready so we can skip regenerating them
    const skipSlots = new Set<number>(
      swatches
        .map((s, i) => (s.status === "ready" ? i : -1))
        .filter((i) => i >= 0),
    );

    // Generate all swatch previews synchronously (6 concurrent Flux Kontext requests)
    const results = await generateAllColorSwatchPreviews(
      buffer,
      bestSix,
      [],          // avoid colors are CSS-only in v2
      null,        // rekognition face data unused by v2
      env.replicate.apiToken,
      skipSlots,
    );

    // Upload each result buffer to storage and record the ready entry
    const currentAssets = (row.visual_assets as ReportVisualAssets | null) ?? {
      version: 1,
      bucket: env.supabase.bucket,
      basePath,
      assets: {},
    };

    const updatedSwatches = [...swatches];
    for (const r of results) {
      const path = `${basePath}color-swatch-${r.index}.jpg`;
      await admin.storage
        .from(env.supabase.bucket)
        .upload(path, r.buffer, { contentType: "image/jpeg", upsert: true });
      updatedSwatches[r.index] = { path, status: "ready", mime: "image/jpeg", error: null };
    }

    const merged: ReportVisualAssets = {
      ...currentAssets,
      assets: { ...currentAssets.assets, colorSwatchPreviews: updatedSwatches },
    };
    await admin.from("reports").update({ visual_assets: merged }).eq("id", id);

    return NextResponse.json({ ok: true, generated: results.length });
  } catch (err) {
    console.error("[POST /api/reports/[id]/visuals/colors]", err);
    return NextResponse.json({ error: "Color swatch generation failed" }, { status: 500 });
  }
}
