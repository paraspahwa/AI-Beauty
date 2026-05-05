import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { ReportVisualAssets } from "@/types/report";
import sharp from "sharp";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPLICATE_CDN_RE = /^https:\/\/(replicate\.delivery|pbxt\.replicate\.delivery)/;

/**
 * POST /api/webhooks/replicate-clothing
 *
 * Called by Replicate when a clothing colour-swap prediction completes.
 * Downloads the result, resizes it, uploads to Supabase storage, and
 * marks the corresponding colorSwatchPreviews slot as "ready".
 *
 * Query params: reportId, userId, slot (0-5), bucket
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const reportId = searchParams.get("reportId") ?? "";
    const userId   = searchParams.get("userId")   ?? "";
    const slot     = parseInt(searchParams.get("slot") ?? "", 10);
    const bucket   = searchParams.get("bucket")   ?? "selfies";

    if (!UUID_RE.test(reportId) || !UUID_RE.test(userId) || isNaN(slot) || slot < 0 || slot > 5) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const body = await req.json() as {
      status: string;
      output?: string | string[];
      error?: string;
    };

    // Only act on succeeded predictions
    if (body.status !== "succeeded") {
      if (body.status === "failed") {
        console.warn(`[webhook/replicate-clothing] prediction failed for slot ${slot}:`, body.error);
        await markSlot(reportId, slot, "failed", body.error ?? "Replicate prediction failed");
      }
      return NextResponse.json({ ok: true });
    }

    const outputUrl: string = Array.isArray(body.output) ? (body.output[0] ?? "") : (body.output ?? "");
    if (!outputUrl) {
      await markSlot(reportId, slot, "failed", "No output URL");
      return NextResponse.json({ error: "No output URL" }, { status: 400 });
    }

    // Validate the URL comes from Replicate CDN (security check)
    if (!REPLICATE_CDN_RE.test(outputUrl)) {
      console.error("[webhook/replicate-clothing] unexpected output URL domain:", outputUrl);
      return NextResponse.json({ error: "Untrusted output URL" }, { status: 400 });
    }

    // Download the image from Replicate
    const resp = await fetch(outputUrl);
    if (!resp.ok) throw new Error(`Failed to download output: ${resp.status}`);
    const rawBuf = Buffer.from(await resp.arrayBuffer());

    // Resize to card thumbnail dimensions
    const resized = await sharp(rawBuf)
      .resize(400, 530, { fit: "cover", position: "top" })
      .jpeg({ quality: 92 })
      .toBuffer();

    // Upload to Supabase storage
    const storagePath = `users/${userId}/reports/${reportId}/color-swatch-${slot}.jpg`;
    const admin = createSupabaseAdminClient();
    const { error: upErr } = await admin.storage
      .from(bucket)
      .upload(storagePath, resized, { contentType: "image/jpeg", upsert: true });

    if (upErr) {
      console.error(`[webhook/replicate-clothing] upload failed slot ${slot}:`, upErr.message);
      await markSlot(reportId, slot, "failed", upErr.message);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Update visual_assets slot status to "ready"
    await markSlot(reportId, slot, "ready", null, storagePath);
    console.info(`[webhook/replicate-clothing] slot ${slot} ready for report ${reportId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/replicate-clothing]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function markSlot(
  reportId: string,
  slot: number,
  status: "ready" | "failed",
  error: string | null,
  path?: string,
) {
  try {
    const admin = createSupabaseAdminClient();
    const { data: row } = await admin
      .from("reports")
      .select("visual_assets")
      .eq("id", reportId)
      .single();

    const va = row?.visual_assets as ReportVisualAssets | null;
    if (!va?.assets?.colorSwatchPreviews?.[slot]) return;

    va.assets.colorSwatchPreviews[slot].status = status;
    va.assets.colorSwatchPreviews[slot].error  = error;
    if (status === "ready") {
      va.assets.colorSwatchPreviews[slot].width  = 400;
      va.assets.colorSwatchPreviews[slot].height = 530;
      if (path) va.assets.colorSwatchPreviews[slot].path = path;
    }
    await admin.from("reports").update({ visual_assets: va }).eq("id", reportId);
  } catch (err) {
    console.error(`[webhook/replicate-clothing] markSlot ${slot} failed:`, (err as Error).message);
  }
}
