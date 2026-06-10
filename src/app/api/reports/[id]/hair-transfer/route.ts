/**
 * POST /api/reports/[id]/hair-transfer
 *
 * Inspiration-based hairstyle transfer.
 * The user uploads a reference photo and vision infers target hair style/color,
 * then generation runs through the existing hair stack (FAL primary, Replicate fallback).
 *
 * Multipart form data:
 *   referenceImage  - File  (required)
 *   sourceAssetId?  - string (optional; use a prior generated image as base)
 */

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { chatJSON } from "@/lib/ai/openai";
import { insertGeneratedAsset, normalizeSourceAssetId, resolveSourceImagePath } from "@/lib/generated-assets";
import { normalizeRekognitionGender } from "@/lib/hair-options";
import {
  mapToReplicateHairColorEnum,
  mapToReplicateHairStyle,
  mapVisionToHairTransferControls,
  type HairTransferVisionResult,
} from "@/lib/ai/hair-transfer";
import { fetchRemoteImageBuffer } from "@/lib/security/remote-image";
import { assertReportStudioAccess, studioAccessToResponse } from "@/lib/studio-access";
import Replicate from "replicate";

export const runtime = "nodejs";
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
const CHANGE_HAIRCUT_MODEL = "flux-kontext-apps/change-haircut" as const;
const FAL_HAIR_MODEL = "fal-ai/image-apps-v2/hair-change" as const;

const SYSTEM_PROMPT = `You are a professional hairstylist analyzing hairstyle references.
Return strict JSON only, no markdown.

Schema:
{
  "styleName": one of ["No change","short_hair","medium_long_hair","long_hair","curly_hair","wavy_hair","high_ponytail","bun","bob_cut","pixie_cut","braids","straight_hair"],
  "colorName": one of ["natural","black","dark_brown","light_brown","blonde","platinum_blonde","auburn","red","silver","gray","blue","green","purple","pink","rainbow","highlights","ombre","balayage"],
  "detectedLook": "short description of the reference hairstyle in 8-12 words"
}

Rules:
- Use the nearest allowed enum values.
- If style is unclear, use "No change".
- If color is unclear, use "natural".
- Always include all keys.`;

function validateMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    env.assertServer();

    const { id } = await params;
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();

    const { data: row, error: rowErr } = await admin
      .from("reports")
      .select("id, user_id, status, image_path, visual_assets, rekognition, is_paid")
      .eq("id", id)
      .single();
    if (rowErr || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (row.status !== "ready") return NextResponse.json({ error: "Report not ready" }, { status: 409 });

    const access = await assertReportStudioAccess(admin, user.id, !!row.is_paid, { reportId: id });
    if (!access.allowed) {
      return NextResponse.json(studioAccessToResponse(access), { status: access.status });
    }

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

    if (!env.fal?.isConfigured && !env.replicate.isConfigured) {
      return NextResponse.json({ error: "No AI service configured" }, { status: 503 });
    }

    const referenceBuf = Buffer.from(await referenceFile.arrayBuffer());
    if (!validateMagicBytes(referenceBuf)) {
      return NextResponse.json({ error: "File content does not match a valid image format" }, { status: 415 });
    }

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

    let vision: HairTransferVisionResult | undefined;
    try {
      vision = await chatJSON<HairTransferVisionResult>({
        model: env.openai.visionModel,
        system: SYSTEM_PROMPT,
        user: "Analyze this hairstyle reference and return JSON with styleName, colorName, detectedLook.",
        imageBase64: referenceBuf.toString("base64"),
        temperature: 0.2,
      });
    } catch (err) {
      console.warn("[hair-transfer] Vision analysis failed, using defaults:", (err as Error).message);
    }

    const detectedGender = normalizeRekognitionGender(row.rekognition);
    const controls = mapVisionToHairTransferControls(vision, detectedGender);

    const sourceKey = sourceResolved.sourceAssetId ? sourceResolved.sourceAssetId.slice(0, 8) : "orig";
    const slug = `${controls.styleName}-${controls.colorName}-${sourceKey}`
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "")
      .slice(0, 80);

    const hdResPath = `users/${user.id}/reports/${id}/hair-transfer-${slug}-hd.jpg`;
    const lowResPath = `users/${user.id}/reports/${id}/hair-transfer-${slug}-low.jpg`;

    const { data: existingFile } = await admin.storage.from(env.supabase.bucket).download(hdResPath);
    if (existingFile) {
      const { data: signedLow } = await admin.storage.from(env.supabase.bucket).createSignedUrl(lowResPath, 3600);
      const { data: signedHd } = await admin.storage.from(env.supabase.bucket).createSignedUrl(hdResPath, 3600);
      const { data: existingAsset } = await admin
        .from("generated_assets")
        .select("id, created_at")
        .eq("user_id", user.id)
        .eq("result_image_path", hdResPath)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        lowResUrl: signedLow?.signedUrl ?? signedHd?.signedUrl ?? null,
        hdUrl: signedHd?.signedUrl ?? null,
        detectedLook: controls.detectedLook,
        controls,
        asset: existingAsset
          ? { id: existingAsset.id as string, createdAt: existingAsset.created_at as string }
          : null,
        cached: true,
      });
    }

    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(sourceResolved.sourceImagePath);
    if (imgErr || !imgData) return NextResponse.json({ error: "Image unavailable" }, { status: 422 });

    const rawBuf = Buffer.from(await imgData.arrayBuffer());
    const { default: sharp } = await import("sharp");
    const smallBuf = await sharp(rawBuf)
      .rotate()
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;
    const hairColorEnum = mapToReplicateHairColorEnum(controls.colorName);

    let url: string | null = null;

    if (env.fal?.isConfigured) {
      try {
        const { createFalClient } = await import("@fal-ai/client");
        const fal = createFalClient({ credentials: env.fal.apiKey });
        const falInput: Record<string, unknown> = { image_url: imageDataUri };
        if (controls.styleName !== "No change") falInput.hair_style = controls.styleName;
        if (controls.colorName !== "natural") falInput.hair_color = controls.colorName;
        // @ts-expect-error dynamic payload for strict fal type
        const result = await fal.run(FAL_HAIR_MODEL, { input: falInput }) as {
          data?: { images?: { url?: string }[] };
          image?: { url?: string };
          images?: { url?: string }[];
          url?: string;
        };
        const raw = result?.data?.images?.[0]?.url ?? result?.image?.url ?? result?.images?.[0]?.url ?? result?.url;
        if (raw?.startsWith("https://")) {
          url = raw;
        }
      } catch (err) {
        console.warn("[hair-transfer] FAL failed, falling back to Replicate:", (err as Error).message);
      }
    }

    if (!url) {
      if (!env.replicate.isConfigured) {
        return NextResponse.json({ error: "No AI service configured" }, { status: 503 });
      }
      const replicate = new Replicate({ auth: env.replicate.apiToken, useFileOutput: false });
      const replicateStyle = mapToReplicateHairStyle(controls.styleName);
      const output = await replicate.run(CHANGE_HAIRCUT_MODEL, {
        input: {
          input_image: imageDataUri,
          haircut: replicateStyle,
          hair_color: hairColorEnum,
          gender: detectedGender,
          aspect_ratio: "match_input_image",
          output_format: "jpg",
          safety_tolerance: 2,
        },
      });
      const raw: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
      if (raw?.startsWith("https://")) url = raw;
    }

    if (!url) return NextResponse.json({ error: "Generation failed" }, { status: 502 });

    let resultBuf: Buffer;
    try {
      resultBuf = await fetchRemoteImageBuffer(url, { timeoutMs: 30_000, maxBytes: 20 * 1024 * 1024 });
    } catch {
      return NextResponse.json({ error: "Failed to download generated image" }, { status: 502 });
    }

    const lowRes = await sharp(resultBuf)
      .resize(400, 530, { fit: "cover", position: "top" })
      .jpeg({ quality: 90 })
      .toBuffer();
    const hdRes = await sharp(resultBuf)
      .resize(1024, 1356, { fit: "cover", position: "top" })
      .jpeg({ quality: 98 })
      .toBuffer();

    await admin.storage.from(env.supabase.bucket).upload(lowResPath, lowRes, { contentType: "image/jpeg", upsert: true });
    await admin.storage.from(env.supabase.bucket).upload(hdResPath, hdRes, { contentType: "image/jpeg", upsert: true });

    const { data: signedLow } = await admin.storage.from(env.supabase.bucket).createSignedUrl(lowResPath, 3600);
    const { data: signedHd } = await admin.storage.from(env.supabase.bucket).createSignedUrl(hdResPath, 3600);

    let asset: { id: string; createdAt: string } | null = null;
    try {
      asset = await insertGeneratedAsset({
        admin,
        userId: user.id,
        reportId: id,
        sourceAssetId: sourceResolved.sourceAssetId,
        sourceImagePath: sourceResolved.sourceImagePath,
        resultImagePath: hdResPath,
        tool: "hair",
        variant: `transfer-${slug}`,
        meta: {
          transfer: true,
          detectedLook: controls.detectedLook,
          styleName: controls.styleName,
          colorName: controls.colorName,
          lowResPath,
          hdResPath,
        },
      });
    } catch (insertErr) {
      console.warn("[hair-transfer] failed to persist generated_assets row:", (insertErr as Error).message);
    }

    return NextResponse.json({
      lowResUrl: signedLow?.signedUrl ?? null,
      hdUrl: signedHd?.signedUrl ?? null,
      detectedLook: controls.detectedLook,
      controls,
      asset,
    });
  } catch (err) {
    console.error("[hair-transfer] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
