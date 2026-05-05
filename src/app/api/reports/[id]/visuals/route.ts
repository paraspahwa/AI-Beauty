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
import { generateAllColorSwatchPreviews } from "@/lib/ai/color-swatch-v2";
import { SEASON_COLOR_PALETTES, normalizeSeasonKey } from "@/lib/season-colors";
import type { GlassesResult, HairstyleResult, ColorAnalysisResult } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 300;

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
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const force = req.nextUrl.searchParams.get("force") === "1";

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

    // Idempotency: skip if already generated, unless ?force=1.
    // BUT always re-run if color swatch slots are incomplete. Older builds could
    // persist "failed"/"missing"/"pending" swatches and then never retry them.
    if (!force) {
      const existingAssets = row.visual_assets as Record<string, unknown> | null;
      const assets = existingAssets?.assets as Record<string, unknown> | undefined;
      const alreadyDone = !!assets?.paletteBoard;
      if (alreadyDone) {
        // Check for incomplete color swatch slots.
        const swatches = (assets?.colorSwatchPreviews as { status: string }[] | undefined) ?? [];
        const hasIncompleteColorSlots = swatches.length < 12 || swatches.some(
          (s) => s.status !== "ready",
        );
        if (!hasIncompleteColorSlots) {
          return NextResponse.json({ ok: true, skipped: true });
        }
        // Fall through and regenerate visuals; color swatches now have a local
        // photo fallback so retrying should resolve failed slots.
      }
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
    const glassesResult   = row.glasses   as GlassesResult;
    const hairstyleResult = row.hairstyle as HairstyleResult;

    visualAssets.assets.glassesPreviews = (glassesResult?.recommended ?? [])
      .slice(0, 5)
      .map((s, i) => ({
        path: `${visualAssets.basePath}glasses-${i}.jpg`,
        status: "missing" as const,
        mime: "image/jpeg",
        error: null,
        ...(typeof s.style === "string" ? { styleName: s.style } : {}),
      }));

    // Up to 9 hairstyle previews: 5 flattering + 4 avoid
    const allHairStyles = [
      ...(hairstyleResult?.styles ?? []).slice(0, 5),
      ...(hairstyleResult?.avoid  ?? []).slice(0, 4).map((a) => ({ name: a, description: a })),
    ];
    visualAssets.assets.hairstylePreviews = allHairStyles.map((s, i) => ({
      path: `${visualAssets.basePath}hairstyle-${i}.jpg`,
      status: "missing" as const,
      mime: "image/jpeg",
      error: null,
      // Store style name in a meta field so the card component can match index → style
      ...(typeof s.name === "string" ? { styleName: s.name } : {}),
    }));

    // Up to 12 colour swatch preview slots (6 best + 6 avoid) from the canonical preset.
    const colorResult = row.color_analysis as ColorAnalysisResult;
    const seasonKey   = normalizeSeasonKey(colorResult?.season ?? "");
    const palette     = SEASON_COLOR_PALETTES[seasonKey] ?? SEASON_COLOR_PALETTES["Soft Autumn"]!;
    const bestSix     = palette.best;
    const avoidSix    = palette.avoid;

    visualAssets.assets.colorSwatchPreviews = [
      ...bestSix.map((_c, i) => ({
        path:   `${visualAssets.basePath}color-swatch-${i}.jpg`,
        status: "missing" as const,
        mime:   "image/jpeg",
        error:  null,
      })),
      ...avoidSix.map((_c, i) => ({
        path:   `${visualAssets.basePath}color-swatch-${i + 6}.jpg`,
        status: "missing" as const,
        mime:   "image/jpeg",
        error:  null,
      })),
    ];

    const [glassesPrevResults, hairstylePrevResults, colorSwatchResults] = await Promise.all([
      generateGlassesPreviews(buffer, glassesResult, row.rekognition).catch((err) => {
        console.warn("[visuals/route] glasses previews failed:", (err as Error).message);
        return [] as { index: number; buffer: Buffer }[];
      }),
      generateHairstylePreviews(buffer, hairstyleResult, row.rekognition).catch((err) => {
        console.warn("[visuals/route] hairstyle previews failed:", (err as Error).message);
        return [] as { index: number; buffer: Buffer; style: string }[];
      }),
      generateAllColorSwatchPreviews(
        buffer,
        bestSix,
        avoidSix,
        row.rekognition,
        env.replicate.apiToken,
      ).catch((err) => {
        console.warn("[visuals/route] color swatch previews failed:", (err as Error).message);
        return [] as { index: number; buffer: Buffer; colorName: string; isBest: boolean }[];
      }),
    ]);

    for (const { index, buffer: imgBuf } of glassesPrevResults) {
      const asset = visualAssets.assets.glassesPreviews[index];
      if (!asset) continue;
      const { error: upErr } = await admin.storage
        .from(env.supabase.bucket)
        .upload(asset.path, imgBuf, { contentType: "image/jpeg", upsert: true });
      asset.status = upErr ? "failed" : "ready";
      if (upErr) asset.error = upErr.message;
    }

    for (const { index, buffer: imgBuf } of hairstylePrevResults) {
      const asset = visualAssets.assets.hairstylePreviews[index];
      if (!asset) continue;
      const { error: upErr } = await admin.storage
        .from(env.supabase.bucket)
        .upload(asset.path, imgBuf, { contentType: "image/jpeg", upsert: true });
      asset.status = upErr ? "failed" : "ready";
      if (upErr) asset.error = upErr.message;
    }

    for (const { index, buffer: imgBuf } of colorSwatchResults) {
      const asset = visualAssets.assets.colorSwatchPreviews?.[index];
      if (!asset) continue;
      const { error: upErr } = await admin.storage
        .from(env.supabase.bucket)
        .upload(asset.path, imgBuf, { contentType: "image/jpeg", upsert: true });
      asset.status = upErr ? "failed" : "ready";
      if (upErr) asset.error = upErr.message;
    }

    // Mark any color swatch slots that didn't produce a result as "failed"
    // so the UI stops spinning instead of waiting forever.
    if (visualAssets.assets.colorSwatchPreviews) {
      for (const asset of visualAssets.assets.colorSwatchPreviews) {
        if (asset.status === "missing") {
          asset.status = "failed";
          asset.error = "No AI preview generated (all providers failed)";
        }
      }
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    const { error: updateErr } = await admin
      .from("reports")
      .update({ visual_assets: visualAssets })
      .eq("id", id);

    if (updateErr) {
      // Fallback when visual_assets column doesn't exist yet on this DB instance.
      // PostgREST surfaces this as either:
      //   42703 — column does not exist
      //   42P01 — relation/column alias not found (some PostgREST versions)
      //   PGRST204 — PostgREST "no rows" on column reference
      const isMissingColumn =
        updateErr.code === "42703" ||
        updateErr.code === "42P01" ||
        updateErr.code === "PGRST204" ||
        (updateErr.message ?? "").toLowerCase().includes("visual_assets");

      if (isMissingColumn) {
        console.warn(
          "[visuals/route] visual_assets column missing — using recommendations fallback. " +
          "Run migration 0011_ensure_visual_assets.sql to fix permanently.",
        );
        const { error: recErr } = await admin.from("recommendations").upsert(
          {
            report_id: id,
            category: "visual_assets",
            title: "Generated visual assets",
            data: visualAssets,
          },
          { onConflict: "report_id,category" },
        );
        if (recErr) {
          // If recommendations table also missing, log and continue — don't crash
          console.error("[visuals/route] recommendations fallback also failed:", recErr.message);
        }
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
