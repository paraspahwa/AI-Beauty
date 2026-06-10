/**
 * POST /api/reports/[id]/virtual-tryon
 *
 * Virtual clothing try-on using fal-ai/image-apps-v2/virtual-try-on.
 *
 * Body (multipart/form-data):
 *   - clothImage:  File  (required)  — garment photo (flat-lay or mannequin)
 *   - personImage: File  (optional)  — full-body photo; overrides the stored selfie
 *                                      for better draping accuracy
 *
 * Returns: { url: string } — signed URL (1 h) of the result stored in Supabase.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { insertGeneratedAsset, normalizeSourceAssetId, resolveSourceImagePath } from "@/lib/generated-assets";
import { fetchRemoteImageBuffer } from "@/lib/security/remote-image";
import { assertReportStudioAccess, studioAccessToResponse } from "@/lib/studio-access";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_CLOTH_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    env.assertServer();
    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();

    // ── Fetch the report row ────────────────────────────────────────────────
    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, image_path, visual_assets, is_paid")
      .eq("id", id)
      .single();
    if (rowErr || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const access = await assertReportStudioAccess(admin, user.id, !!row.is_paid, { paidOnly: true, reportId: id });
    if (!access.allowed) {
      return NextResponse.json(studioAccessToResponse(access), { status: access.status });
    }

    if (!env.fal?.isConfigured) {
      return NextResponse.json({ error: "FAL not configured" }, { status: 503 });
    }

    // ── Read form data ──────────────────────────────────────────────────────
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "multipart/form-data required" }, { status: 415 });
    }

    const form = await req.formData();
    const sourceAssetId = normalizeSourceAssetId(form.get("sourceAssetId"));

    // Required: garment image
    const clothFile = form.get("clothImage") as File | null;
    if (!clothFile) return NextResponse.json({ error: "clothImage is required" }, { status: 400 });
    if (!ALLOWED_MIME.has(clothFile.type)) {
      return NextResponse.json({ error: "Unsupported garment image type" }, { status: 415 });
    }
    if (clothFile.size > MAX_CLOTH_BYTES) {
      return NextResponse.json({ error: "Garment image too large (max 10 MB)" }, { status: 413 });
    }
    const clothBuf  = Buffer.from(await clothFile.arrayBuffer());
    const clothMime = clothFile.type;

    // Optional: full-body person photo (overrides stored selfie)
    const personFile = form.get("personImage") as File | null;
    let selfieBuf: Buffer;
    let sourceImagePath = row.image_path as string;
    let sourceAssetIdResolved: string | null = null;

    if (personFile) {
      if (!ALLOWED_MIME.has(personFile.type)) {
        return NextResponse.json({ error: "Unsupported person image type" }, { status: 415 });
      }
      if (personFile.size > MAX_CLOTH_BYTES) {
        return NextResponse.json({ error: "Person image too large (max 10 MB)" }, { status: 413 });
      }
      selfieBuf = Buffer.from(await personFile.arrayBuffer());
      // Preserve explicit user upload behavior for clothing draping.
      sourceImagePath = row.image_path as string;
      sourceAssetIdResolved = null;
    } else {
      let sourceResolved: { sourceImagePath: string; sourceAssetId: string | null };
      try {
        sourceResolved = await resolveSourceImagePath({
          admin,
          userId: user.id,
          defaultImagePath: row.image_path as string,
          sourceAssetId,
        });
      } catch {
        return NextResponse.json({ error: "Invalid source image selection" }, { status: 400 });
      }
      sourceImagePath = sourceResolved.sourceImagePath;
      sourceAssetIdResolved = sourceResolved.sourceAssetId;

      // ── Load the stored selfie from private storage ──────────────────────
      const { data: selfieData, error: selfieErr } = await admin.storage
        .from(env.supabase.bucket)
        .download(sourceImagePath);
      if (selfieErr || !selfieData) {
        return NextResponse.json({ error: "Selfie unavailable" }, { status: 422 });
      }
      selfieBuf = Buffer.from(await selfieData.arrayBuffer());
    }

    // ── Encode both images as base64 data URIs (private bucket safe) ───────
    const selfieUri = `data:image/jpeg;base64,${selfieBuf.toString("base64")}`;
    const clothUri  = `data:${clothMime};base64,${clothBuf.toString("base64")}`;

    // ── Run FAL virtual-try-on ──────────────────────────────────────────────
    const { createFalClient } = await import("@fal-ai/client");
    const falClient = createFalClient({ credentials: env.fal.apiKey });

    // fal-ai/image-apps-v2/virtual-try-on expects person_image_url + clothing_image_url
    // Cast through unknown to satisfy the union type without eslint-disable
    const tryonInput = {
      person_image_url: selfieUri,
      clothing_image_url: clothUri,
    } as unknown as Parameters<typeof falClient.run<"fal-ai/image-apps-v2/virtual-try-on">>[1]["input"];
    const falResult = await falClient.run("fal-ai/image-apps-v2/virtual-try-on", {
      input: tryonInput,
    }) as { data?: { images?: { url: string }[] }; image?: { url: string }; images?: { url: string }[] };

    const resultUrl: string =
      falResult?.data?.images?.[0]?.url ??
      falResult?.image?.url ??
      (falResult?.images as { url: string }[] | undefined)?.[0]?.url ?? "";

    if (!resultUrl) {
      return NextResponse.json({ error: "No output from FAL" }, { status: 500 });
    }


    // ── Download result and persist both low-res and HD ─────────────────────
    let resultBuf: Buffer;
    try {
      resultBuf = await fetchRemoteImageBuffer(resultUrl, { timeoutMs: 30_000, maxBytes: 20 * 1024 * 1024 });
    } catch {
      return NextResponse.json({ error: "Download failed" }, { status: 502 });
    }

    const { default: sharp } = await import("sharp");
    const lowRes = await sharp(resultBuf)
      .resize(400, 530, { fit: "cover", position: "top" })
      .jpeg({ quality: 90 })
      .toBuffer();
    const hdRes = await sharp(resultBuf)
      .resize(1024, 1356, { fit: "cover", position: "top" })
      .jpeg({ quality: 98 })
      .toBuffer();

    const ts = Date.now();
    const lowResPath = `tryon-results/${user.id}/${id}/${ts}-low.jpg`;
    const hdResPath = `tryon-results/${user.id}/${id}/${ts}-hd.jpg`;

    const { error: upErrLow } = await admin.storage
      .from(env.supabase.bucket)
      .upload(lowResPath, lowRes, { contentType: "image/jpeg", upsert: false });
    const { error: upErrHd } = await admin.storage
      .from(env.supabase.bucket)
      .upload(hdResPath, hdRes, { contentType: "image/jpeg", upsert: false });

    if (upErrLow || upErrHd) {
      // Fall back to returning the FAL URL directly (short-lived but usable)
      return NextResponse.json({ lowResUrl: resultUrl, hdUrl: resultUrl, stored: false, asset: null });
    }


    // ── Persist latest tryon path in visual_assets for history ─────────────
    const existingVa = (row.visual_assets ?? {}) as Record<string, unknown>;
    const history = ((existingVa.tryonHistory ?? []) as string[]).slice(-9); // keep last 10
    history.push(hdResPath);
    await admin
      .from("reports")
      .update({ visual_assets: { ...existingVa, tryonHistory: history, tryonLatest: hdResPath } })
      .eq("id", id);


    // ── Return signed URLs for both (1 hour) ───────────────────────────────
    const { data: signedLow } = await admin.storage
      .from(env.supabase.bucket)
      .createSignedUrl(lowResPath, 3600);
    const { data: signedHd } = await admin.storage
      .from(env.supabase.bucket)
      .createSignedUrl(hdResPath, 3600);

    let asset: { id: string; createdAt: string } | null = null;
    try {
      asset = await insertGeneratedAsset({
        admin,
        userId: user.id,
        reportId: id,
        sourceAssetId: sourceAssetIdResolved,
        sourceImagePath,
        resultImagePath: hdResPath,
        tool: "virtual_tryon",
        variant: null,
        meta: {
          usedPersonUpload: !!personFile,
          lowResPath,
          hdResPath,
        },
      });
    } catch (insertErr) {
      console.warn("[virtual-tryon] failed to persist generated_assets row:", (insertErr as Error).message);
    }

    return NextResponse.json({
      lowResUrl: signedLow?.signedUrl ?? resultUrl,
      hdUrl: signedHd?.signedUrl ?? resultUrl,
      stored: true,
      asset,
    });
  } catch (err) {
    console.error("[virtual-tryon route]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
