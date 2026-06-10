/**
 * POST /api/reports/[id]/makeup
 *
 * Generate a makeup try-on preview. Accepts granular controls that are
 * composed into a prompt description + FAL preset.
 *
 * Body: MakeupGranularControls (see src/lib/makeup-options.ts)
 *
 * Returns: { url: string } — signed URL of the generated image.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import {
  type MakeupGranularControls,
  deriveStyle,
  buildMakeupPrompt,
  makeupCacheKey,
} from "@/lib/makeup-options";
import { insertGeneratedAsset, normalizeSourceAssetId, resolveSourceImagePath } from "@/lib/generated-assets";
import { fetchRemoteImageBuffer } from "@/lib/security/remote-image";
import { assertReportStudioAccess, studioAccessToResponse } from "@/lib/studio-access";
import { extractFalImageUrl } from "@/lib/api-errors";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const { data: row, error: rowErr } = await admin
    .from("reports")
    .select("id, user_id, image_path, visual_assets, is_paid")
    .eq("id", id)
    .single();
  if (rowErr || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const access = await assertReportStudioAccess(admin, user.id, !!row.is_paid, { reportId: id });
  if (!access.allowed) {
    return NextResponse.json(studioAccessToResponse(access), { status: access.status });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  const body = (await req.json().catch(() => ({}))) as MakeupGranularControls & { sourceAssetId?: string };
  const controls = body as MakeupGranularControls;
  const sourceAssetId = normalizeSourceAssetId(body.sourceAssetId);

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

  const style    = deriveStyle(controls);
  const intensity = controls.intensity ?? "medium";
  const prompt   = buildMakeupPrompt(controls);
  const sourceKey = sourceResolved.sourceAssetId ? sourceResolved.sourceAssetId.slice(0, 8) : "orig";
  const cacheSlug = `${makeupCacheKey(controls)}-${sourceKey}`;

  // ── Cache check: if already generated for this combo, return existing ───────
  const existingAssets = row.visual_assets as Record<string, unknown> | null;
  const makeupCache = (existingAssets?.makeupCache ?? {}) as Record<
    string,
    { path: string; status: string }
  >;
  const cached = makeupCache[cacheSlug];
  if (cached?.status === "ready" && cached.path) {
    const { data: signedData } = await admin.storage
      .from(env.supabase.bucket)
      .createSignedUrl(cached.path, 3600);
    if (signedData?.signedUrl) {
      const { data: existingAsset } = await admin
        .from("generated_assets")
        .select("id, created_at")
        .eq("user_id", user.id)
        .eq("result_image_path", cached.path)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        url: signedData.signedUrl,
        cached: true,
        asset: existingAsset
          ? { id: existingAsset.id as string, createdAt: existingAsset.created_at as string }
          : null,
      });
    }
  }

  // ── Download original image ──────────────────────────────────────────────────
  const { data: imgData, error: imgErr } = await admin.storage
    .from(env.supabase.bucket)
    .download(sourceResolved.sourceImagePath);
  if (imgErr || !imgData) {
    return NextResponse.json({ error: "Image unavailable" }, { status: 422 });
  }
  const imgBuf = Buffer.from(await imgData.arrayBuffer());

  // ── Pass the image to FAL as a base64 data URI ──────────────────────────────
  // The bucket is private; getPublicUrl() would return a URL FAL cannot fetch.
  // Encoding as data URI avoids any storage access policy issues entirely.
  const imgBase64 = imgBuf.toString("base64");
  const imageUrl  = `data:image/jpeg;base64,${imgBase64}`;

  // ── FAL makeup-application ───────────────────────────────────────────────
  if (!env.fal?.isConfigured) {
    return NextResponse.json({ error: "FAL not configured" }, { status: 503 });
  }
  const { createFalClient } = await import("@fal-ai/client");
  const falClient = createFalClient({ credentials: env.fal.apiKey });
  const falResult = await falClient.run("fal-ai/image-apps-v2/makeup-application", {
    input: {
      image_url: imageUrl,
      makeup_style: style,
      intensity,
      // style_description is not part of the typed input; log it for debugging.
    },
  }) as Parameters<typeof extractFalImageUrl>[0];
  const resultUrl = extractFalImageUrl(falResult);
  if (!resultUrl) {
    return NextResponse.json({ error: "No output from FAL" }, { status: 500 });
  }

  // ── Download result and persist to storage ──────────────────────────────────
  let resultBuf: Buffer;
  try {
    resultBuf = await fetchRemoteImageBuffer(resultUrl, { timeoutMs: 30_000, maxBytes: 20 * 1024 * 1024 });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 502 });
  }


  // Save both low-res (400px) and HD (1024px) versions
  const { default: sharp } = await import("sharp");
  const lowRes = await sharp(resultBuf)
    .resize(400, 530, { fit: "cover", position: "top" })
    .jpeg({ quality: 90 })
    .toBuffer();
  const hdRes = await sharp(resultBuf)
    .resize(1024, 1356, { fit: "cover", position: "top" })
    .jpeg({ quality: 98 })
    .toBuffer();

  const lowResPath = `makeup-results/${user.id}/${id}/${cacheSlug}-low.jpg`;
  const hdResPath = `makeup-results/${user.id}/${id}/${cacheSlug}-hd.jpg`;

  await admin.storage
    .from(env.supabase.bucket)
    .upload(lowResPath, lowRes, { contentType: "image/jpeg", upsert: true });
  await admin.storage
    .from(env.supabase.bucket)
    .upload(hdResPath, hdRes, { contentType: "image/jpeg", upsert: true });


  // ── Update cache in visual_assets ───────────────────────────────────────────
  const updatedCache = {
    ...makeupCache,
    [cacheSlug]: { path: hdResPath, status: "ready", lowResPath, hdResPath },
  };
  await admin
    .from("reports")
    .update({
      visual_assets: {
        ...(existingAssets ?? {}),
        makeupCache: updatedCache,
      },
    })
    .eq("id", id);


  let asset: { id: string; createdAt: string } | null = null;
  try {
    asset = await insertGeneratedAsset({
      admin,
      userId: user.id,
      reportId: id,
      sourceAssetId: sourceResolved.sourceAssetId,
      sourceImagePath: sourceResolved.sourceImagePath,
      resultImagePath: hdResPath,
      tool: "makeup",
      variant: cacheSlug,
      meta: {
        style,
        intensity,
        lowResPath,
        hdResPath,
      },
    });
  } catch (insertErr) {
    console.warn("[makeup route] failed to persist generated_assets row:", (insertErr as Error).message);
  }

      // ── Return signed URLs for both (1 hour) ───────────────────────────────────
      const { data: signedLow } = await admin.storage
        .from(env.supabase.bucket)
        .createSignedUrl(lowResPath, 3600);
      const { data: signedHd } = await admin.storage
        .from(env.supabase.bucket)
        .createSignedUrl(hdResPath, 3600);

      return NextResponse.json({
        lowResUrl: signedLow?.signedUrl ?? resultUrl,
        hdUrl: signedHd?.signedUrl ?? resultUrl,
        asset,
      });
    } catch (err) {
      const e = err as { status?: number; body?: unknown; message?: string };
      console.error("[makeup route]", err);
      if (e?.body) console.error("[makeup route] body:", JSON.stringify(e.body));
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
