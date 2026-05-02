import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  createVisualAssetsSkeleton,
  generateLandmarkOverlay,
  generatePaletteBoard,
  generateGlassesPreviews,
  generateHairstylePreviews,
} from "@/lib/ai/visuals";
import type { GlassesResult, HairstyleResult, ColorAnalysisResult } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/reports/[id]/visuals
 *
 * Generates all visual assets (landmark overlay, palette board, glasses + hairstyle
 * try-on previews) for an already-completed report.  This is called client-side
 * immediately after the text-analysis pipeline finishes, keeping the primary
 * /api/analyze response fast (~30–60 s) while the 60–120 s image generation
 * runs in a separate function invocation.
 *
 * Idempotent: if visual_assets already contains ready assets the route returns
 * immediately without re-generating.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const admin = createSupabaseAdminClient();

    // Load report — must belong to this user
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, image_path, rekognition, color_analysis, glasses, hairstyle, visual_assets")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (rowErr || !row) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (row.status !== "ready") {
      return NextResponse.json({ error: "Report is not ready yet" }, { status: 409 });
    }

    // Idempotency: if visuals already generated, skip
    const existingAssets = row.visual_assets as Record<string, unknown> | null;
    const alreadyDone =
      existingAssets &&
      typeof existingAssets === "object" &&
      existingAssets.assets &&
      typeof existingAssets.assets === "object" &&
      (existingAssets.assets as Record<string, unknown>).paletteBoard;
    if (alreadyDone) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Fetch the original image from storage
    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(row.image_path as string);
    if (imgErr || !imgData) {
      return NextResponse.json({ error: "Original image unavailable" }, { status: 422 });
    }
    const buffer = Buffer.from(await imgData.arrayBuffer());

    const visualAssets = createVisualAssetsSkeleton(user.id, id, env.supabase.bucket);

    // ── Landmark overlay ──────────────────────────────────────────────────────
    try {
      const overlay = await generateLandmarkOverlay(buffer, row.rekognition);
      if (overlay) {
        const { error: upErr } = await admin.storage
          .from(env.supabase.bucket)
          .upload(visualAssets.assets.landmarkOverlay!.path, overlay.buffer, {
            contentType: "image/png",
            upsert: true,
          });
        if (upErr) {
          visualAssets.assets.landmarkOverlay!.status = "failed";
          visualAssets.assets.landmarkOverlay!.error = upErr.message;
        } else {
          visualAssets.assets.landmarkOverlay!.status = "ready";
          visualAssets.assets.landmarkOverlay!.width = overlay.width;
          visualAssets.assets.landmarkOverlay!.height = overlay.height;
        }
      }
    } catch (err) {
      visualAssets.assets.landmarkOverlay!.status = "failed";
      visualAssets.assets.landmarkOverlay!.error = (err as Error).message;
    }

    // ── Palette board ─────────────────────────────────────────────────────────
    try {
      const paletteBoard = await generatePaletteBoard(row.color_analysis as ColorAnalysisResult);
      const { error: upErr } = await admin.storage
        .from(env.supabase.bucket)
        .upload(visualAssets.assets.paletteBoard!.path, paletteBoard.buffer, {
          contentType: "image/png",
          upsert: true,
        });
      if (upErr) {
        visualAssets.assets.paletteBoard!.status = "failed";
        visualAssets.assets.paletteBoard!.error = upErr.message;
      } else {
        visualAssets.assets.paletteBoard!.status = "ready";
        visualAssets.assets.paletteBoard!.width = paletteBoard.width;
        visualAssets.assets.paletteBoard!.height = paletteBoard.height;
      }
    } catch (err) {
      visualAssets.assets.paletteBoard!.status = "failed";
      visualAssets.assets.paletteBoard!.error = (err as Error).message;
    }

    // ── Try-on previews (glasses + hairstyle) ─────────────────────────────────
    const glassesResult = row.glasses as GlassesResult;
    const hairstyleResult = row.hairstyle as HairstyleResult;

    visualAssets.assets.glassesPreviews = (glassesResult?.recommended ?? [])
      .slice(0, 2)
      .map((_, i) => ({
        path: `${visualAssets.basePath}glasses-${i}.png`,
        status: "missing" as const,
        mime: "image/png",
        error: null,
      }));

    visualAssets.assets.hairstylePreviews = (hairstyleResult?.styles ?? [])
      .slice(0, 2)
      .map((_, i) => ({
        path: `${visualAssets.basePath}hairstyle-${i}.png`,
        status: "missing" as const,
        mime: "image/png",
        error: null,
      }));

    const [glassesPrevResults, hairstylePrevResults] = await Promise.all([
      generateGlassesPreviews(buffer, glassesResult).catch((err) => {
        console.warn("[visuals/route] glasses previews failed:", (err as Error).message);
        return [] as { index: number; buffer: Buffer }[];
      }),
      generateHairstylePreviews(buffer, hairstyleResult).catch((err) => {
        console.warn("[visuals/route] hairstyle previews failed:", (err as Error).message);
        return [] as { index: number; buffer: Buffer }[];
      }),
    ]);

    for (const { index, buffer: imgBuf } of glassesPrevResults) {
      const asset = visualAssets.assets.glassesPreviews[index];
      if (!asset) continue;
      const { error: upErr } = await admin.storage
        .from(env.supabase.bucket)
        .upload(asset.path, imgBuf, { contentType: "image/png", upsert: true });
      asset.status = upErr ? "failed" : "ready";
      if (upErr) asset.error = upErr.message;
    }

    for (const { index, buffer: imgBuf } of hairstylePrevResults) {
      const asset = visualAssets.assets.hairstylePreviews[index];
      if (!asset) continue;
      const { error: upErr } = await admin.storage
        .from(env.supabase.bucket)
        .upload(asset.path, imgBuf, { contentType: "image/png", upsert: true });
      asset.status = upErr ? "failed" : "ready";
      if (upErr) asset.error = upErr.message;
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    const { error: updateErr } = await admin
      .from("reports")
      .update({ visual_assets: visualAssets })
      .eq("id", id);

    if (updateErr) {
      // Fallback for environments without the visual_assets column
      if (updateErr.code === "42703") {
        await admin.from("recommendations").upsert(
          {
            report_id: id,
            category: "visual_assets",
            title: "Generated visual assets",
            data: visualAssets,
          },
          { onConflict: "report_id,category" },
        );
      } else {
        throw updateErr;
      }
    }

    return NextResponse.json({ ok: true, skipped: false });
  } catch (err) {
    console.error("[POST /api/reports/[id]/visuals]", err);
    return NextResponse.json({ error: "Visual generation failed" }, { status: 500 });
  }
}
