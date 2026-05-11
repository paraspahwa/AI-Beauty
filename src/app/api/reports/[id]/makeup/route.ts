/**
 * POST /api/reports/[id]/makeup
 *
 * Generate a makeup try-on preview for a specific style + intensity combination.
 * Uses fal-ai/image-apps-v2/makeup-application as the primary model.
 *
 * Body: { style: MakeupStyleValue; intensity: MakeupIntensityValue }
 *
 * Returns: { url: string } — signed URL of the generated image.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  MAKEUP_STYLES,
  MAKEUP_INTENSITIES,
  type MakeupStyleValue,
  type MakeupIntensityValue,
} from "@/lib/makeup-options";

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
  if (!row.is_paid) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  const body = (await req.json().catch(() => ({}))) as {
    style?: string;
    intensity?: string;
  };
  const style = (body.style ?? "natural") as MakeupStyleValue;
  const intensity = (body.intensity ?? "medium") as MakeupIntensityValue;

  if (!MAKEUP_STYLES.includes(style)) {
    return NextResponse.json({ error: "Invalid style" }, { status: 400 });
  }
  if (!MAKEUP_INTENSITIES.includes(intensity)) {
    return NextResponse.json({ error: "Invalid intensity" }, { status: 400 });
  }

  // ── Cache check: if already generated for this combo, return existing ───────
  const cacheSlug = `${style}__${intensity}`;
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
      return NextResponse.json({ url: signedData.signedUrl, cached: true });
    }
  }

  // ── Download original image ──────────────────────────────────────────────────
  const { data: imgData, error: imgErr } = await admin.storage
    .from(env.supabase.bucket)
    .download(row.image_path as string);
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
    },
  }) as { image?: { url: string }; images?: { url: string }[] };
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

      // ── Return signed URL ──────────────────────────────────────────────────────
      const { data: signed } = await admin.storage
        .from(env.supabase.bucket)
        .createSignedUrl(storagePath, 3600);

      return NextResponse.json({ url: signed?.signedUrl ?? resultUrl });
    } catch (err) {
      console.error("[makeup route]", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
