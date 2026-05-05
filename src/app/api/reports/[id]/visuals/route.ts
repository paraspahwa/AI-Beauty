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
import type { GlassesResult, HairstyleResult, ColorAnalysisResult, ReportVisualAsset } from "@/types/report";

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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const force = req.nextUrl.searchParams.get("force") === "1";
    // ?type=glasses|hairstyle triggers lazy on-demand generation for a single section.
    // ?index=N (0-2) restricts generation to that single slot within the section (Phase 5.4).
    const sectionType = req.nextUrl.searchParams.get("type") as "glasses" | "hairstyle" | null;
    const slotIndexParam = req.nextUrl.searchParams.get("index");
    const slotIndex = slotIndexParam !== null && /^[0-9]$/.test(slotIndexParam)
      ? parseInt(slotIndexParam, 10)
      : null; // null = generate all slots in section

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

    // ── Lazy partial generation for a single section (glasses | hairstyle) ───
    // ?type=glasses             → generate all 3 glasses previews
    // ?type=glasses&index=0     → generate only slot 0 (Phase 5.4: per-click)
    // ?type=hairstyle           → generate all 3 hairstyle previews
    // ?type=hairstyle&index=1   → generate only slot 1
    if (sectionType === "glasses" || sectionType === "hairstyle") {
      const existingAssets = row.visual_assets as Record<string, unknown> | null;
      const existingAssetsInner = (existingAssets?.assets ?? {}) as Record<string, unknown>;

      const previewsKey = sectionType === "glasses" ? "glassesPreviews" : "hairstylePreviews";
      const existingPreviews = (existingAssetsInner[previewsKey] ?? []) as ReportVisualAsset[];

      // Skip if the specific slot (or all slots) are already settled
      if (!force) {
        if (slotIndex !== null) {
          const slot = existingPreviews[slotIndex];
          if (slot?.status === "ready" || slot?.status === "failed") {
            return NextResponse.json({ ok: true, skipped: true });
          }
        } else {
          const allSettled = existingPreviews.length > 0 &&
            existingPreviews.every((p) => p.status === "ready" || p.status === "failed");
          if (allSettled) return NextResponse.json({ ok: true, skipped: true });
        }
      }

      const { data: imgData2, error: imgErr2 } = await admin.storage
        .from(env.supabase.bucket).download(row.image_path as string);
      if (imgErr2 || !imgData2) return NextResponse.json({ error: "Image unavailable" }, { status: 422 });
      const sectionBuffer = Buffer.from(await imgData2.arrayBuffer());

      const skeleton = createVisualAssetsSkeleton(user.id, id, env.supabase.bucket);

      // Build the full slots array (preserving existing ready/failed slots)
      if (sectionType === "glasses") {
        const glassesResult = row.glasses as GlassesResult;
        const allSlots = (glassesResult?.recommended ?? []).slice(0, 3).map(
          (s, i) => {
            const ex = existingPreviews[i];
            // Preserve already-settled slots; only mark target slot(s) as missing
            if (ex?.status === "ready" || ex?.status === "failed") return ex;
            return { path: `${skeleton.basePath}glasses-${i}.jpg`, status: "missing" as const, mime: "image/jpeg", error: null,
              ...(typeof s.style === "string" ? { styleName: s.style } : {}) };
          }
        );
        skeleton.assets.glassesPreviews = allSlots;

        // Generate only the target slot(s)
        const indicesToGenerate = slotIndex !== null
          ? [slotIndex].filter((i) => i < allSlots.length && allSlots[i]?.status === "missing")
          : allSlots.map((s, i) => s.status === "missing" ? i : -1).filter((i) => i >= 0);

        if (indicesToGenerate.length > 0) {
          const results = await generateGlassesPreviews(
            sectionBuffer, glassesResult, row.rekognition, indicesToGenerate,
          ).catch(() => [] as { index: number; buffer: Buffer }[]);
          for (const { index, buffer: imgBuf } of results) {
            const asset = skeleton.assets.glassesPreviews[index];
            if (!asset) continue;
            const { error: upErr } = await admin.storage.from(env.supabase.bucket)
              .upload(asset.path, imgBuf, { contentType: "image/jpeg", upsert: true });
            asset.status = upErr ? "failed" : "ready";
            if (upErr) asset.error = upErr.message;
          }
          // Mark any still-missing generated slots as failed
          for (const idx of indicesToGenerate) {
            if (skeleton.assets.glassesPreviews[idx]?.status === "missing") {
              skeleton.assets.glassesPreviews[idx]!.status = "failed";
              skeleton.assets.glassesPreviews[idx]!.error = "No preview generated";
            }
          }
        }
      } else {
        const hairstyleResult = row.hairstyle as HairstyleResult;
        const allSlots = (hairstyleResult?.styles ?? []).slice(0, 3).map(
          (s, i) => {
            const ex = existingPreviews[i];
            if (ex?.status === "ready" || ex?.status === "failed") return ex;
            return { path: `${skeleton.basePath}hairstyle-${i}.jpg`, status: "missing" as const, mime: "image/jpeg", error: null,
              ...(typeof s.name === "string" ? { styleName: s.name } : {}) };
          }
        );
        skeleton.assets.hairstylePreviews = allSlots;

        const indicesToGenerate = slotIndex !== null
          ? [slotIndex].filter((i) => i < allSlots.length && allSlots[i]?.status === "missing")
          : allSlots.map((s, i) => s.status === "missing" ? i : -1).filter((i) => i >= 0);

        if (indicesToGenerate.length > 0) {
          const results = await generateHairstylePreviews(
            sectionBuffer, hairstyleResult, row.rekognition, indicesToGenerate,
          ).catch(() => [] as { index: number; buffer: Buffer; style: string }[]);
          for (const { index, buffer: imgBuf } of results) {
            const asset = skeleton.assets.hairstylePreviews[index];
            if (!asset) continue;
            const { error: upErr } = await admin.storage.from(env.supabase.bucket)
              .upload(asset.path, imgBuf, { contentType: "image/jpeg", upsert: true });
            asset.status = upErr ? "failed" : "ready";
            if (upErr) asset.error = upErr.message;
          }
          for (const idx of indicesToGenerate) {
            if (skeleton.assets.hairstylePreviews[idx]?.status === "missing") {
              skeleton.assets.hairstylePreviews[idx]!.status = "failed";
              skeleton.assets.hairstylePreviews[idx]!.error = "No preview generated";
            }
          }
        }
      }

      const newPreviews = sectionType === "glasses"
        ? skeleton.assets.glassesPreviews
        : skeleton.assets.hairstylePreviews;

      // Merge updated previews into existing visual_assets
      const merged = { ...(existingAssets ?? {}), assets: { ...existingAssetsInner, [previewsKey]: newPreviews } };
      await admin.from("reports").update({ visual_assets: merged }).eq("id", id);
      return NextResponse.json({ ok: true, skipped: false });
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
        const hasIncompleteColorSlots = swatches.length < 6 || swatches.some(
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

    // ── Try-on previews ───────────────────────────────────────────────────────
    // Glasses and hairstyle previews are now generated lazily via ?type=glasses
    // and ?type=hairstyle when the user first opens those tabs (Phase 5.1).
    // Pre-populate skeleton slots from existing visual_assets so they persist.
    const glassesResult   = row.glasses   as GlassesResult;
    const hairstyleResult = row.hairstyle as HairstyleResult;

    const existingVA = row.visual_assets as Record<string, unknown> | null;
    const existingVAInner = (existingVA?.assets ?? {}) as Record<string, unknown>;

    const existingGlassesPreviews = existingVAInner.glassesPreviews as typeof visualAssets.assets.glassesPreviews | undefined;
    const existingHairstylePreviews = existingVAInner.hairstylePreviews as typeof visualAssets.assets.hairstylePreviews | undefined;

    // Preserve any already-generated glasses previews; otherwise mark slots as "missing"
    visualAssets.assets.glassesPreviews = existingGlassesPreviews?.length
      ? existingGlassesPreviews
      : (glassesResult?.recommended ?? []).slice(0, 3).map((s, i) => ({
          path: `${visualAssets.basePath}glasses-${i}.jpg`,
          status: "missing" as const,
          mime: "image/jpeg",
          error: null,
          ...(typeof s.style === "string" ? { styleName: s.style } : {}),
        }));

    // Preserve any already-generated hairstyle previews; otherwise mark slots as "missing"
    visualAssets.assets.hairstylePreviews = existingHairstylePreviews?.length
      ? existingHairstylePreviews
      : (hairstyleResult?.styles ?? []).slice(0, 3).map((s, i) => ({
          path: `${visualAssets.basePath}hairstyle-${i}.jpg`,
          status: "missing" as const,
          mime: "image/jpeg",
          error: null,
          ...(typeof s.name === "string" ? { styleName: s.name } : {}),
        }));

    // 6 colour swatch preview slots (best colors only; avoid colors shown as CSS circles).
    const colorResult = row.color_analysis as ColorAnalysisResult;
    const seasonKey   = normalizeSeasonKey(colorResult?.season ?? "");
    const palette     = SEASON_COLOR_PALETTES[seasonKey] ?? SEASON_COLOR_PALETTES["Soft Autumn"]!;
    const bestSix     = palette.best;

    // Carry over already-ready slots from the existing visual_assets so they
    // are never overwritten with "missing" and disappear from the UI.
    const existingSwatches =
      ((row.visual_assets as Record<string, unknown> | null)
        ?.assets as Record<string, unknown> | undefined
      )?.colorSwatchPreviews as { path: string; status: "pending" | "ready" | "failed" | "missing"; mime: string; error: string | null }[] | undefined;

    visualAssets.assets.colorSwatchPreviews = [
      ...bestSix.map((_c, i) => {
        const existing = existingSwatches?.[i];
        if (existing?.status === "ready") return { path: existing.path, status: "ready" as const, mime: existing.mime, error: existing.error };
        return { path: `${visualAssets.basePath}color-swatch-${i}.jpg`, status: "missing" as const, mime: "image/jpeg", error: null };
      }),
    ];

    // Only generate color swatch slots that are not already ready
    const readySlotIndices = new Set(
      (visualAssets.assets.colorSwatchPreviews ?? [])
        .map((s, i) => (s.status === "ready" ? i : -1))
        .filter((i) => i >= 0)
    );

    const colorSwatchResults = await generateAllColorSwatchPreviews(
      buffer,
      bestSix,
      [],
      row.rekognition,
      env.replicate.apiToken,
      readySlotIndices,
    ).catch((err) => {
      console.warn("[visuals/route] color swatch previews failed:", (err as Error).message);
      return [] as { index: number; buffer: Buffer; colorName: string; isBest: boolean }[];
    });

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
