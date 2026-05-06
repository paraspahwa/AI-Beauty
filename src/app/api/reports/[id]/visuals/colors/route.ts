import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { runSingleColorSwatch } from "@/lib/ai/color-swatch-v2";
import { SEASON_COLOR_PALETTES, normalizeSeasonKey } from "@/lib/season-colors";
import type { ColorAnalysisResult, ReportVisualAsset, ReportVisualAssets } from "@/types/report";

export const runtime = "nodejs";
// Per-slot mode: exactly ONE Replicate call per invocation (~15-30 s).
// The client fires 6 parallel browser requests so all slots run concurrently
// across 6 separate Vercel function instances — none can time out.
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/reports/[id]/visuals/colors?slot=N
 *
 * Generates exactly ONE color swatch (slot N, 0-5) per invocation using
 * Flux Kontext Fast. The client fires 6 parallel requests — each becomes a
 * separate Vercel function invocation so no single call can exceed the 60 s
 * function limit.
 *
 * The slot result is immediately uploaded to Supabase Storage and saved
 * to visual_assets in the DB before the function returns, so a crash/timeout
 * on another slot cannot lose this slot's work.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // ?slot=N (0-5) — required
    const slotParam = req.nextUrl.searchParams.get("slot");
    const slotNum = slotParam !== null && /^[0-5]$/.test(slotParam) ? parseInt(slotParam, 10) : null;
    if (slotNum === null) {
      return NextResponse.json({ error: "slot parameter (0-5) is required" }, { status: 400 });
    }

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

    // Idempotency: skip if this specific slot is already ready
    const existing = row.visual_assets as { assets?: { colorSwatchPreviews?: { status: string }[] } } | null;
    const existingSlot = existing?.assets?.colorSwatchPreviews?.[slotNum];
    if (existingSlot?.status === "ready") {
      return NextResponse.json({ ok: true, skipped: true, slot: slotNum });
    }

    if (!env.replicate.isConfigured) {
      return NextResponse.json({ error: "Replicate not configured" }, { status: 503 });
    }

    const colorResult = row.color_analysis as ColorAnalysisResult;
    const seasonKey = normalizeSeasonKey(colorResult?.season ?? "");
    const palette   = SEASON_COLOR_PALETTES[seasonKey] ?? SEASON_COLOR_PALETTES["Soft Autumn"]!;
    const bestSix   = palette.best.slice(0, 6);
    const color     = bestSix[slotNum];

    if (!color) return NextResponse.json({ error: "Slot out of range for this season" }, { status: 400 });

    // Fetch original image
    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(row.image_path as string);
    if (imgErr || !imgData) return NextResponse.json({ error: "Image unavailable" }, { status: 422 });
    const buffer = Buffer.from(await imgData.arrayBuffer());

    // Run Flux Kontext for this single slot — the sole Replicate call in this invocation
    let imgBuf: Buffer;
    try {
      imgBuf = await runSingleColorSwatch(buffer, color.name, color.hex, env.replicate.apiToken);
    } catch (err) {
      console.warn(`[visuals/colors] slot ${slotNum} Replicate failed:`, (err as Error).message);
      return NextResponse.json({ error: "Generation failed", slot: slotNum }, { status: 502 });
    }

    const basePath = `users/${user.id}/reports/${id}/`;
    const storagePath = `${basePath}color-swatch-${slotNum}.jpg`;

    // Upload to storage
    const { error: upErr } = await admin.storage
      .from(env.supabase.bucket)
      .upload(storagePath, imgBuf, { contentType: "image/jpeg", upsert: true });

    const slotStatus = upErr ? "failed" : "ready";
    const slotError  = upErr ? upErr.message : null;

    // Atomic-safe DB update: re-read current visual_assets right before writing
    // to minimise the race window between the 6 concurrent slot invocations.
    const { data: freshRow } = await admin
      .from("reports")
      .select("visual_assets")
      .eq("id", id)
      .single();

    const freshVA = (freshRow?.visual_assets as ReportVisualAssets | null) ?? {
      version: 1,
      bucket: env.supabase.bucket,
      basePath,
      assets: {},
    };

    const freshSwatches: ReportVisualAsset[] = [
      ...((freshVA.assets?.colorSwatchPreviews ?? []) as ReportVisualAsset[]),
    ];
    freshSwatches[slotNum] = { path: storagePath, status: slotStatus, mime: "image/jpeg", error: slotError };

    await admin
      .from("reports")
      .update({
        visual_assets: {
          ...freshVA,
          assets: { ...freshVA.assets, colorSwatchPreviews: freshSwatches },
        },
      })
      .eq("id", id);

    return NextResponse.json({ ok: true, slot: slotNum, status: slotStatus });
  } catch (err) {
    console.error("[POST /api/reports/[id]/visuals/colors]", err);
    return NextResponse.json({ error: "Color swatch generation failed" }, { status: 500 });
  }
}
