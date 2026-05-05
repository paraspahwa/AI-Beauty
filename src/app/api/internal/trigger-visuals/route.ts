/**
 * POST /api/internal/trigger-visuals
 *
 * Internal server-to-server endpoint that kicks off visual generation for a
 * report without requiring a user session. Protected by a shared secret
 * (INTERNAL_API_SECRET env var) set in both the server and .env.local.
 *
 * Called as a fire-and-forget from /api/analyze immediately after the text
 * pipeline finishes — so visuals are already being generated while the client
 * is still receiving the analyze response and navigating to the report page.
 *
 * This means by the time the user opens the report, swatches are either ready
 * or close to ready — eliminating the visible "Generating…" wait.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
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

export async function POST(req: NextRequest) {
  try {
    // ── Auth: shared internal secret ────────────────────────────────────────
    const secret = req.headers.get("x-internal-secret");
    const configured = env.internal.secret;

    // If no secret is configured, reject all calls — prevents open access
    if (!configured || configured.length < 16) {
      console.warn("[trigger-visuals] INTERNAL_API_SECRET not configured or too short");
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }
    if (secret !== configured) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reportId } = (await req.json()) as { reportId?: string };
    if (!reportId) {
      return NextResponse.json({ error: "reportId required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Load report
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, image_path, rekognition, color_analysis, glasses, hairstyle, visual_assets")
      .eq("id", reportId)
      .single();

    if (rowErr || !row) {
      console.warn(`[trigger-visuals] report ${reportId} not found`);
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    if (row.status !== "ready") {
      // Report may not be marked ready yet (race condition) — log and skip.
      // The client-side retrigger will catch it.
      console.warn(`[trigger-visuals] report ${reportId} not ready (status=${row.status})`);
      return NextResponse.json({ skipped: true, reason: "not_ready" });
    }

    // Idempotency: skip if all 12 swatches are already ready
    const existingAssets = row.visual_assets as Record<string, unknown> | null;
    const assets = existingAssets?.assets as Record<string, unknown> | undefined;
    if (assets) {
      const swatches = (assets.colorSwatchPreviews as { status: string }[] | undefined) ?? [];
      const allReady = swatches.length >= 12 && swatches.every((s) => s.status === "ready");
      if (allReady) {
        return NextResponse.json({ skipped: true, reason: "already_complete" });
      }
    }

    // ── Fetch selfie ─────────────────────────────────────────────────────────
    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(row.image_path as string);
    if (imgErr || !imgData) {
      return NextResponse.json({ error: "Image unavailable" }, { status: 422 });
    }
    const buffer = Buffer.from(await imgData.arrayBuffer());

    const visualAssets = createVisualAssetsSkeleton(row.user_id as string, reportId, env.supabase.bucket);

    // ── Landmark overlay ─────────────────────────────────────────────────────
    try {
      const overlay = await generateLandmarkOverlay(buffer, row.rekognition);
      if (overlay) {
        const { error: upErr } = await admin.storage
          .from(env.supabase.bucket)
          .upload(visualAssets.assets.landmarkOverlay!.path, overlay.buffer, {
            contentType: "image/png", upsert: true,
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

    // ── Palette board ────────────────────────────────────────────────────────
    try {
      const paletteBoard = await generatePaletteBoard(row.color_analysis as ColorAnalysisResult);
      const { error: upErr } = await admin.storage
        .from(env.supabase.bucket)
        .upload(visualAssets.assets.paletteBoard!.path, paletteBoard.buffer, {
          contentType: "image/png", upsert: true,
        });
      visualAssets.assets.paletteBoard!.status = upErr ? "failed" : "ready";
      if (upErr) visualAssets.assets.paletteBoard!.error = upErr.message;
      else {
        visualAssets.assets.paletteBoard!.width = paletteBoard.width;
        visualAssets.assets.paletteBoard!.height = paletteBoard.height;
      }
    } catch (err) {
      visualAssets.assets.paletteBoard!.status = "failed";
      visualAssets.assets.paletteBoard!.error = (err as Error).message;
    }

    // ── Try-on previews (glasses + hairstyle) ────────────────────────────────
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

    const allHairStyles = [
      ...(hairstyleResult?.styles ?? []).slice(0, 5),
      ...(hairstyleResult?.avoid  ?? []).slice(0, 4).map((a) => ({ name: a, description: a })),
    ];
    visualAssets.assets.hairstylePreviews = allHairStyles.map((s, i) => ({
      path: `${visualAssets.basePath}hairstyle-${i}.jpg`,
      status: "missing" as const,
      mime: "image/jpeg",
      error: null,
      ...(typeof s.name === "string" ? { styleName: s.name } : {}),
    }));

    // ── Color swatches ───────────────────────────────────────────────────────
    const colorResult = row.color_analysis as ColorAnalysisResult;
    const seasonKey   = normalizeSeasonKey(colorResult?.season ?? "");
    const palette     = SEASON_COLOR_PALETTES[seasonKey] ?? SEASON_COLOR_PALETTES["Soft Autumn"]!;
    const bestSix     = palette.best;
    const avoidSix    = palette.avoid;

    const existingSwatches =
      (assets?.colorSwatchPreviews as
        { path: string; status: "pending" | "ready" | "failed" | "missing"; mime: string; error: string | null }[]
        | undefined);

    visualAssets.assets.colorSwatchPreviews = [
      ...bestSix.map((_c, i) => {
        const ex = existingSwatches?.[i];
        if (ex?.status === "ready") return { path: ex.path, status: "ready" as const, mime: ex.mime, error: ex.error };
        return { path: `${visualAssets.basePath}color-swatch-${i}.jpg`, status: "missing" as const, mime: "image/jpeg", error: null };
      }),
      ...avoidSix.map((_c, i) => {
        const ex = existingSwatches?.[i + 6];
        if (ex?.status === "ready") return { path: ex.path, status: "ready" as const, mime: ex.mime, error: ex.error };
        return { path: `${visualAssets.basePath}color-swatch-${i + 6}.jpg`, status: "missing" as const, mime: "image/jpeg", error: null };
      }),
    ];

    const readySlotIndices = new Set(
      (visualAssets.assets.colorSwatchPreviews ?? [])
        .map((s, i) => (s.status === "ready" ? i : -1))
        .filter((i) => i >= 0),
    );

    // Run all generation in parallel
    const [glassesPrevResults, hairstylePrevResults, colorSwatchResults] = await Promise.all([
      generateGlassesPreviews(buffer, glassesResult, row.rekognition).catch((err) => {
        console.warn("[trigger-visuals] glasses failed:", (err as Error).message);
        return [] as { index: number; buffer: Buffer }[];
      }),
      generateHairstylePreviews(buffer, hairstyleResult, row.rekognition).catch((err) => {
        console.warn("[trigger-visuals] hairstyle failed:", (err as Error).message);
        return [] as { index: number; buffer: Buffer; style: string }[];
      }),
      generateAllColorSwatchPreviews(
        buffer, bestSix, avoidSix, row.rekognition,
        env.replicate.apiToken, readySlotIndices,
      ).catch((err) => {
        console.warn("[trigger-visuals] swatches failed:", (err as Error).message);
        return [] as { index: number; buffer: Buffer; colorName: string; isBest: boolean }[];
      }),
    ]);

    for (const { index, buffer: imgBuf } of glassesPrevResults) {
      const asset = visualAssets.assets.glassesPreviews[index];
      if (!asset) continue;
      const { error: upErr } = await admin.storage.from(env.supabase.bucket)
        .upload(asset.path, imgBuf, { contentType: "image/jpeg", upsert: true });
      asset.status = upErr ? "failed" : "ready";
      if (upErr) asset.error = upErr.message;
    }

    for (const { index, buffer: imgBuf } of hairstylePrevResults) {
      const asset = visualAssets.assets.hairstylePreviews[index];
      if (!asset) continue;
      const { error: upErr } = await admin.storage.from(env.supabase.bucket)
        .upload(asset.path, imgBuf, { contentType: "image/jpeg", upsert: true });
      asset.status = upErr ? "failed" : "ready";
      if (upErr) asset.error = upErr.message;
    }

    for (const { index, buffer: imgBuf } of colorSwatchResults) {
      const asset = visualAssets.assets.colorSwatchPreviews?.[index];
      if (!asset) continue;
      const { error: upErr } = await admin.storage.from(env.supabase.bucket)
        .upload(asset.path, imgBuf, { contentType: "image/jpeg", upsert: true });
      asset.status = upErr ? "failed" : "ready";
      if (upErr) asset.error = upErr.message;
    }

    // Mark any still-missing swatch slots as failed so UI stops spinning
    for (const asset of visualAssets.assets.colorSwatchPreviews ?? []) {
      if (asset.status === "missing") {
        asset.status = "failed";
        asset.error = "No AI preview generated";
      }
    }

    // ── Persist ──────────────────────────────────────────────────────────────
    const { error: updateErr } = await admin
      .from("reports")
      .update({ visual_assets: visualAssets })
      .eq("id", reportId);

    if (updateErr) {
      const isMissingColumn =
        updateErr.code === "42703" || updateErr.code === "42P01" || updateErr.code === "PGRST204" ||
        (updateErr.message ?? "").toLowerCase().includes("visual_assets");
      if (isMissingColumn) {
        await admin.from("recommendations").upsert(
          { report_id: reportId, category: "visual_assets", title: "Generated visual assets", data: visualAssets },
          { onConflict: "report_id,category" },
        );
      } else {
        throw updateErr;
      }
    }

    console.info(`[trigger-visuals] ✓ report ${reportId} visuals complete`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[trigger-visuals]", err);
    return NextResponse.json({ error: "Visual generation failed" }, { status: 500 });
  }
}
