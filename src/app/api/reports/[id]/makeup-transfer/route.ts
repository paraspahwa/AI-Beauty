/**
 * POST /api/reports/[id]/makeup-transfer
 *
 * Inspiration-based makeup transfer. The user uploads a reference photo (a look
 * they love), GPT-4o vision analyses the makeup in it and maps it to
 * MakeupGranularControls, then FAL applies those controls to the user's selfie.
 *
 * Multipart form data:
 *   referenceImage  – File  (the inspiration photo)
 *   sourceAssetId?  – string (optional; use a prior generated image as base)
 *
 * Returns: { hdUrl, lowResUrl, asset, detectedLook }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  type MakeupGranularControls,
  deriveStyle,
  makeupCacheKey,
  type LipColorValue,
  type EyeshadowValue,
  type BlushColorValue,
  type BlushIntensityValue,
  type FoundationShadeValue,
  type EyelinerStyleValue,
} from "@/lib/makeup-options";
import { insertGeneratedAsset, normalizeSourceAssetId, resolveSourceImagePath } from "@/lib/generated-assets";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_RESULT_IMAGE_BYTES = 20 * 1024 * 1024;

function validateMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;

  // PNG
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return true;

  // WEBP (RIFF....WEBP)
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  return isWebp;
}

function isSafeRemoteImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "::1") return false;
    if (/^127\./.test(host)) return false;
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;

    return true;
  } catch {
    return false;
  }
}

// ── Valid option sets for coercion ────────────────────────────────────────────
const VALID_LIP: LipColorValue[] = [
  "nude_beige","soft_pink","classic_red","deep_red","coral","berry",
  "mauve","plum","terracotta","rose","cherry","peachy_nude",
];
const VALID_EYE: EyeshadowValue[] = [
  "neutral","smoky","bronze","pink_rose","earth","purple","blue","green","no_eyeshadow",
];
const VALID_BLUSH: BlushColorValue[] = ["peach","rose","coral","berry","bronze","natural","no_blush"];
const VALID_BLUSH_INT: BlushIntensityValue[] = ["sheer","soft","medium","flushed"];
const VALID_FOUNDATION: FoundationShadeValue[] = [
  "fair","light","light_medium","medium","medium_tan","tan","deep","rich_deep",
];
const VALID_EYELINER: EyelinerStyleValue[] = ["none","subtle","classic","cat_eye","winged","smoky_liner"];

function coerce<T extends string>(val: string | undefined, valid: T[], fallback: T): T {
  return valid.includes(val as T) ? (val as T) : fallback;
}

// ── GPT-4o system prompt ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a professional makeup analyst. Analyze the makeup in the reference photo and respond with a JSON object mapping the look to these exact enum values. Respond ONLY with valid JSON, no markdown fences.

Schema:
{
  "lipColor": one of ["nude_beige","soft_pink","classic_red","deep_red","coral","berry","mauve","plum","terracotta","rose","cherry","peachy_nude"],
  "eyeshadow": one of ["neutral","smoky","bronze","pink_rose","earth","purple","blue","green","no_eyeshadow"],
  "blushColor": one of ["peach","rose","coral","berry","bronze","natural","no_blush"],
  "blushIntensity": one of ["sheer","soft","medium","flushed"],
  "foundation": one of ["fair","light","light_medium","medium","medium_tan","tan","deep","rich_deep"],
  "contour": boolean,
  "eyeliner": one of ["none","subtle","classic","cat_eye","winged","smoky_liner"],
  "detectedLook": "short human-readable description of the overall look in 8-12 words"
}

Rules:
- Match as closely as possible to the visible makeup in the photo.
- If a feature is not clearly visible, pick the most neutral default.
- detectedLook should sound like "Smoky bronze eyes with soft coral lip and defined brows".
- Always output every key.`;

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
    if (row.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // ── Entitlement check ─────────────────────────────────────────────────────
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

    // ── Parse multipart form ──────────────────────────────────────────────────
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

    const referenceFile = form.get("referenceImage");
    const sourceAssetId = normalizeSourceAssetId(form.get("sourceAssetId") as string | null);

    if (!referenceFile || !(referenceFile instanceof File)) {
      return NextResponse.json({ error: "referenceImage is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(referenceFile.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WEBP images are accepted" }, { status: 415 });
    }
    if (referenceFile.size > MAX_REFERENCE_IMAGE_BYTES) {
      return NextResponse.json({ error: "Reference image must be under 8 MB" }, { status: 413 });
    }

    // ── Resolve source selfie ─────────────────────────────────────────────────
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

    // ── Step 1: GPT-4o vision analysis of reference photo ─────────────────────
    const refBuf = Buffer.from(await referenceFile.arrayBuffer());
    if (!validateMagicBytes(refBuf)) {
      return NextResponse.json(
        { error: "File content does not match a valid image format" },
        { status: 415 },
      );
    }
    const refBase64 = refBuf.toString("base64");
    const { chatJSON } = await import("@/lib/ai/openai");

    type GptMakeupResult = {
      lipColor?: string;
      eyeshadow?: string;
      blushColor?: string;
      blushIntensity?: string;
      foundation?: string;
      contour?: unknown;
      eyeliner?: string;
      detectedLook?: string;
    };

    let gptResult: GptMakeupResult = {};
    let detectedLook = "AI-matched makeup look";

    try {
      gptResult = await chatJSON<GptMakeupResult>({
        model: env.openai.visionModel,
        system: SYSTEM_PROMPT,
        user: "Analyze the makeup in this photo and return the JSON schema described in your system prompt.",
        imageBase64: refBase64,
        temperature: 0.2,
      });
      detectedLook = typeof gptResult.detectedLook === "string" && gptResult.detectedLook.length > 0
        ? gptResult.detectedLook
        : "AI-matched makeup look";
    } catch (gptErr) {
      console.warn("[makeup-transfer] GPT analysis failed, using defaults:", (gptErr as Error).message);
      // Proceed with fallback neutral controls
    }

    // ── Map GPT output → MakeupGranularControls ───────────────────────────────
    const controls: MakeupGranularControls = {
      lipColor:       coerce(gptResult.lipColor, VALID_LIP, "nude_beige"),
      eyeshadow:      coerce(gptResult.eyeshadow, VALID_EYE, "neutral"),
      blushColor:     coerce(gptResult.blushColor, VALID_BLUSH, "peach"),
      blushIntensity: coerce(gptResult.blushIntensity, VALID_BLUSH_INT, "soft"),
      foundation:     coerce(gptResult.foundation, VALID_FOUNDATION, "medium"),
      contour:        gptResult.contour === true,
      eyeliner:       coerce(gptResult.eyeliner, VALID_EYELINER, "classic"),
    };

    const style    = deriveStyle(controls);
    const intensity: MakeupGranularControls["intensity"] = "medium";
    const cacheSlug = `transfer-${makeupCacheKey(controls)}-${sourceResolved.sourceAssetId?.slice(0, 8) ?? "orig"}`;

    // ── Cache check ───────────────────────────────────────────────────────────
    const existingAssets = row.visual_assets as Record<string, unknown> | null;
    const makeupCache = (existingAssets?.makeupCache ?? {}) as Record<string, { path: string; status: string; lowResPath?: string; hdResPath?: string }>;
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
          hdUrl: signedData.signedUrl,
          lowResUrl: signedData.signedUrl,
          cached: true,
          detectedLook,
          controls,
          asset: existingAsset
            ? { id: existingAsset.id as string, createdAt: existingAsset.created_at as string }
            : null,
        });
      }
    }

    // ── Step 2: Download selfie and encode ────────────────────────────────────
    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(sourceResolved.sourceImagePath);
    if (imgErr || !imgData) return NextResponse.json({ error: "Image unavailable" }, { status: 422 });

    const imgBuf    = Buffer.from(await imgData.arrayBuffer());
    const imgBase64 = imgBuf.toString("base64");
    const imageUrl  = `data:image/jpeg;base64,${imgBase64}`;

    // ── Step 3: FAL makeup-application ───────────────────────────────────────
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
    }) as { data?: { images?: { url: string }[] }; image?: { url: string }; images?: { url: string }[] };

    const resultUrl: string =
      falResult?.data?.images?.[0]?.url ??
      falResult?.image?.url ??
      (falResult?.images as { url: string }[] | undefined)?.[0]?.url ?? "";

    if (!resultUrl) return NextResponse.json({ error: "No output from FAL" }, { status: 500 });

    // ── Download result and persist ───────────────────────────────────────────
    if (!isSafeRemoteImageUrl(resultUrl)) {
      return NextResponse.json({ error: "Invalid output URL from generation provider" }, { status: 502 });
    }

    const dlRes = await fetch(resultUrl);
    if (!dlRes.ok) return NextResponse.json({ error: "Download failed" }, { status: 500 });
    const contentType = (dlRes.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Generation provider returned non-image content" }, { status: 502 });
    }
    const contentLength = Number(dlRes.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_RESULT_IMAGE_BYTES) {
      return NextResponse.json({ error: "Generated image too large" }, { status: 502 });
    }

    const resultBuf = Buffer.from(await dlRes.arrayBuffer());
    if (resultBuf.length > MAX_RESULT_IMAGE_BYTES) {
      return NextResponse.json({ error: "Generated image too large" }, { status: 502 });
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

    const lowResPath = `makeup-results/${user.id}/${id}/${cacheSlug}-low.jpg`;
    const hdResPath  = `makeup-results/${user.id}/${id}/${cacheSlug}-hd.jpg`;

    await admin.storage.from(env.supabase.bucket).upload(lowResPath, lowRes, { contentType: "image/jpeg", upsert: true });
    await admin.storage.from(env.supabase.bucket).upload(hdResPath,  hdRes,  { contentType: "image/jpeg", upsert: true });

    // ── Update cache ──────────────────────────────────────────────────────────
    const updatedCache = {
      ...makeupCache,
      [cacheSlug]: { path: hdResPath, status: "ready", lowResPath, hdResPath },
    };
    await admin.from("reports").update({
      visual_assets: { ...(existingAssets ?? {}), makeupCache: updatedCache },
    }).eq("id", id);

    // ── Insert generated_assets row ───────────────────────────────────────────
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
        meta: { style, intensity, lowResPath, hdResPath, detectedLook, transfer: true },
      });
    } catch (insertErr) {
      console.warn("[makeup-transfer] failed to persist generated_assets row:", (insertErr as Error).message);
    }

    // ── Return signed URLs ────────────────────────────────────────────────────
    const { data: signedLow } = await admin.storage.from(env.supabase.bucket).createSignedUrl(lowResPath, 3600);
    const { data: signedHd  } = await admin.storage.from(env.supabase.bucket).createSignedUrl(hdResPath,  3600);

    return NextResponse.json({
      lowResUrl: signedLow?.signedUrl ?? resultUrl,
      hdUrl:     signedHd?.signedUrl  ?? resultUrl,
      detectedLook,
      controls,
      asset,
    });
  } catch (err) {
    console.error("[makeup-transfer]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
