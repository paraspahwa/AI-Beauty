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
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  type MakeupGranularControls,
  deriveStyle,
  buildMakeupPrompt,
  makeupCacheKey,
} from "@/lib/makeup-options";
import { insertGeneratedAsset, normalizeSourceAssetId, resolveSourceImagePath } from "@/lib/generated-assets";

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

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
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

  // ── Entitlement check ────────────────────────────────────────────────────────
  // studio_pro: active subscription + monthly quota enforced
  // report:     report must be paid (existing behaviour)
  const { data: tierData } = await admin.rpc("get_user_plan_tier", { p_user: user.id });
  const planTier = (tierData as string | null) ?? "free";

  if (planTier === "studio_pro") {
    const allowed = await admin.rpc("try_consume_generation", { p_user: user.id, p_cap: 150 });
    if (!allowed.data) {
      return NextResponse.json(
        { error: "Monthly generation limit reached (150). Resets at the start of next billing period.", code: "QUOTA_EXCEEDED" },
        { status: 429 },
      );
    }
  } else if (!row.is_paid) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
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
  }) as { image?: { url: string }; images?: { url: string }[] };
  console.info("[makeup route] prompt:", prompt);
  const resultUrl: string =
    falResult?.image?.url ??
    (falResult?.images as { url: string }[] | undefined)?.[0]?.url ?? "";
  if (!resultUrl) {
    return NextResponse.json({ error: "No output from FAL" }, { status: 500 });
  }

  // ── Download result and persist to storage ──────────────────────────────────
  const dlRes = await fetch(resultUrl);
  if (!dlRes.ok) {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
  const resultBuf = Buffer.from(await dlRes.arrayBuffer());

  const storagePath = `makeup-results/${user.id}/${id}/${cacheSlug}.jpg`;
  await admin.storage
    .from(env.supabase.bucket)
    .upload(storagePath, resultBuf, { contentType: "image/jpeg", upsert: true });

  // ── Update cache in visual_assets ───────────────────────────────────────────
  const updatedCache = {
    ...makeupCache,
    [cacheSlug]: { path: storagePath, status: "ready" },
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
      resultImagePath: storagePath,
      tool: "makeup",
      variant: cacheSlug,
      meta: {
        style,
        intensity,
      },
    });
  } catch (insertErr) {
    console.warn("[makeup route] failed to persist generated_assets row:", (insertErr as Error).message);
  }

      // ── Return signed URL ──────────────────────────────────────────────────────
      const { data: signed } = await admin.storage
        .from(env.supabase.bucket)
        .createSignedUrl(storagePath, 3600);

      return NextResponse.json({ url: signed?.signedUrl ?? resultUrl, asset });
    } catch (err) {
      console.error("[makeup route]", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
