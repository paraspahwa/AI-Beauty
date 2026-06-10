import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { compressForAI } from "@/lib/ai/image";
import { chatJSON } from "@/lib/ai/openai";
import { detectFaceDetails } from "@/lib/ai/rekognition";
import { assertCanvasStudioAccess, studioAccessToResponse } from "@/lib/studio-access";
import {
  MAKEUP_INTENSITIES,
  MAKEUP_STYLES,
  type MakeupIntensityValue,
  type MakeupStyleValue,
} from "@/lib/makeup-options";
import { isHairStyleAllowedForGender, normalizeRekognitionGender } from "@/lib/hair-options";
import { insertGeneratedAsset, normalizeSourceAssetId, resolveSourceImagePath } from "@/lib/generated-assets";
import { fetchRemoteImageBuffer } from "@/lib/security/remote-image";
import { extractFalImageUrl, errorMessageFromUnknown } from "@/lib/api-errors";
import type { FalTargetHairstyle } from "@/lib/guest-hair-presets";
import type { StudioOutfitResult } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_MODES = new Set(["makeup", "hair", "outfit"]);
type FalHairColor =
  | "blonde" | "black" | "auburn" | "red" | "silver"
  | "blue" | "purple" | "pink" | "green"
  | "dark_brown" | "light_brown" | "platinum_blonde"
  | "gray" | "rainbow" | "natural" | "highlights" | "ombre" | "balayage";

function parseMakeupStyle(value: unknown): MakeupStyleValue {
  if (typeof value === "string") {
    const v = value.trim() as MakeupStyleValue;
    if ((MAKEUP_STYLES as readonly string[]).includes(v)) return v;
  }
  return "natural";
}

function parseMakeupIntensity(value: unknown): MakeupIntensityValue {
  if (typeof value === "string") {
    const v = value.trim() as MakeupIntensityValue;
    if ((MAKEUP_INTENSITIES as readonly string[]).includes(v)) return v;
  }
  return "medium";
}

function parseHairColor(value: unknown): FalHairColor {
  if (typeof value === "string") {
    const key = value.trim().toLowerCase();
    const mapped: Record<string, FalHairColor> = {
      blonde: "blonde",
      black: "black",
      auburn: "auburn",
      red: "red",
      silver: "silver",
      blue: "blue",
      purple: "purple",
      pink: "pink",
      green: "green",
      dark_brown: "dark_brown",
      "dark brown": "dark_brown",
      brunette: "dark_brown",
      light_brown: "light_brown",
      "light brown": "light_brown",
      caramel: "light_brown",
      platinum_blonde: "platinum_blonde",
      "platinum blonde": "platinum_blonde",
      gray: "gray",
      grey: "gray",
      rainbow: "rainbow",
      natural: "natural",
      highlights: "highlights",
      ombre: "ombre",
      balayage: "balayage",
      "rose gold": "balayage",
    };

    const direct = mapped[key];
    if (direct) return direct;
  }

  return "natural";
}

const FAL_TARGET_HAIRSTYLES = new Set<FalTargetHairstyle>([
  "short_hair",
  "medium_long_hair",
  "long_hair",
  "curly_hair",
  "wavy_hair",
  "high_ponytail",
  "bun",
  "bob_cut",
  "pixie_cut",
  "braids",
  "straight_hair",
  "afro",
  "dreadlocks",
  "buzz_cut",
  "mohawk",
  "bangs",
  "side_part",
  "middle_part",
]);

function toTargetHairstyle(style: string): FalTargetHairstyle | null {
  if (!style || style === "No change") return null;
  return FAL_TARGET_HAIRSTYLES.has(style as FalTargetHairstyle)
    ? (style as FalTargetHairstyle)
    : null;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOutfitPrompt(occasion: string, vibe: string, colorPalette?: { name: string; hex: string }[]) {
  const paletteBlock = colorPalette?.length
    ? `\nSuggested palette: ${colorPalette.map((item) => `${item.name} (${item.hex})`).join(", ")}`
    : "";

  return `Create 3 capsule wardrobe outfit ideas for a ${occasion} occasion with a ${vibe} vibe.${paletteBlock}
Return strict JSON:
{
  "occasion": string,
  "vibe": string,
  "looks": [
    {
      "title": string,
      "pieces": string[],
      "notes": string,
      "palette": [{ "name": string, "hex": "#RRGGBB" }]
    }
  ],
  "summary": string
}`;
}

async function callWebhookCompletion(payload: Record<string, unknown>) {
  if (!env.internal.secret) return;
  try {
    await fetch(`${env.app.url}/api/webhooks/studio`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": env.internal.secret,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Best effort only.
  }
}

async function persistImageResult(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  canvasId: string;
  tool: "makeup" | "hair" | "outfit";
  variant: string;
  sourceAssetId: string | null;
  sourceImagePath: string;
  resultBuffer: Buffer;
  meta?: Record<string, unknown>;
}) {
  const { default: sharp } = await import("sharp");
  const lowRes = await sharp(input.resultBuffer)
    .resize(400, 530, { fit: "cover", position: "top" })
    .jpeg({ quality: 90 })
    .toBuffer();
  const hdRes = await sharp(input.resultBuffer)
    .resize(1024, 1356, { fit: "cover", position: "top" })
    .jpeg({ quality: 98 })
    .toBuffer();

  const ts = Date.now();
  const basePath = `studio-canvases/${input.userId}/${input.canvasId}/${input.tool}-${ts}-${input.variant}`;
  const lowResPath = `${basePath}-low.jpg`;
  const hdResPath = `${basePath}-hd.jpg`;

  await input.admin.storage.from(env.supabase.bucket).upload(lowResPath, lowRes, { contentType: "image/jpeg", upsert: true });
  await input.admin.storage.from(env.supabase.bucket).upload(hdResPath, hdRes, { contentType: "image/jpeg", upsert: true });

  const { data: signedLow } = await input.admin.storage.from(env.supabase.bucket).createSignedUrl(lowResPath, 3600);
  const { data: signedHd } = await input.admin.storage.from(env.supabase.bucket).createSignedUrl(hdResPath, 3600);

  const asset = await insertGeneratedAsset({
    admin: input.admin,
    userId: input.userId,
    reportId: null,
    studioCanvasId: input.canvasId,
    sourceAssetId: input.sourceAssetId,
    sourceImagePath: input.sourceImagePath,
    resultImagePath: hdResPath,
    tool: input.tool,
    variant: input.variant,
    meta: { lowResPath, hdResPath, ...(input.meta ?? {}) },
  });

  await callWebhookCompletion({
    eventId: asset.id,
    eventType: `canvas.${input.tool}.completed`,
    payload: {
      canvasId: input.canvasId,
      assetId: asset.id,
      tool: input.tool,
      variant: input.variant,
      lowResPath,
      hdResPath,
    },
  });

  return {
    lowResUrl: signedLow?.signedUrl ?? "",
    hdUrl: signedHd?.signedUrl ?? "",
    asset,
  };
}

export async function POST(request: NextRequest) {
  try {
    env.assertServer();

    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null) as
      | {
          contextType?: "canvas";
          contextId?: string;
          mode?: "makeup" | "hair" | "outfit";
          options?: Record<string, unknown>;
        }
      | null;

    if (!body?.contextType || body.contextType !== "canvas") {
      return NextResponse.json({ error: "Only canvas context is supported here" }, { status: 400 });
    }
    if (!body.contextId || !UUID_RE.test(body.contextId)) {
      return NextResponse.json({ error: "Invalid canvasId" }, { status: 400 });
    }
    if (!body.mode || !ALLOWED_MODES.has(body.mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const access = await assertCanvasStudioAccess(admin, user.id);
    if (!access.allowed) {
      return NextResponse.json(studioAccessToResponse(access), { status: access.status });
    }

    const { data: canvas } = await admin
      .from("studio_canvases")
      .select("id, user_id, selfie_path, color_palette")
      .eq("id", body.contextId)
      .single();

    if (!canvas) return NextResponse.json({ error: "Canvas not found" }, { status: 404 });
    if (canvas.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const options = body.options ?? {};
    const sourceAssetId = normalizeSourceAssetId(options.sourceAssetId);

    let sourceResolved: { sourceImagePath: string; sourceAssetId: string | null };
    try {
      sourceResolved = await resolveSourceImagePath({
        admin,
        userId: user.id,
        defaultImagePath: canvas.selfie_path as string,
        sourceAssetId,
      });
    } catch {
      return NextResponse.json({ error: "Invalid source image selection" }, { status: 400 });
    }

    if (options.colorScan && typeof options.colorScan === "object") {
      await admin
        .from("studio_canvases")
        .update({ color_palette: options.colorScan })
        .eq("id", canvas.id)
        .eq("user_id", user.id);
    } else if (Array.isArray(options.colorPalette) && options.colorPalette.length > 0) {
      await admin
        .from("studio_canvases")
        .update({ color_palette: { palette: options.colorPalette } })
        .eq("id", canvas.id)
        .eq("user_id", user.id);
    }

    if (body.mode === "outfit") {
      const occasion = typeof options.occasion === "string" && options.occasion.trim().length > 0 ? options.occasion.trim() : "casual";
      const vibe = typeof options.vibe === "string" && options.vibe.trim().length > 0 ? options.vibe.trim() : "minimal";
      const palette = Array.isArray(options.colorPalette)
        ? options.colorPalette.filter((item): item is { name: string; hex: string } => !!item && typeof item === "object")
        : [];

      const outfit = await chatJSON<StudioOutfitResult>({
        model: env.openai.miniModel,
        system: "You are Renovaara. Return strict JSON only.",
        user: buildOutfitPrompt(occasion, vibe, palette),
        temperature: 0.45,
      });

      const outfitSummary = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1356" viewBox="0 0 1024 1356">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fffafc"/>
            <stop offset="100%" stop-color="#fffafc"/>
          </linearGradient>
        </defs>
        <rect width="1024" height="1356" fill="url(#bg)"/>
        <text x="64" y="100" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#3D2B1F">${escapeXml(outfit.occasion)}</text>
        <text x="64" y="150" font-family="Arial, sans-serif" font-size="24" fill="#9C7D5B">${escapeXml(outfit.vibe)}</text>
        ${outfit.looks.slice(0, 3).map((look, index) => {
          const y = 230 + index * 320;
          const colors = (look.palette ?? palette).slice(0, 5);
          return `
            <rect x="64" y="${y}" rx="28" ry="28" width="896" height="260" fill="#FFFFFF" stroke="#E8DDD0"/>
            <text x="104" y="${y + 56}" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#3D2B1F">${escapeXml(look.title)}</text>
            <text x="104" y="${y + 100}" font-family="Arial, sans-serif" font-size="21" fill="#7C5A3A">${escapeXml(look.notes)}</text>
            ${colors.map((color, colorIndex) => `<rect x="104" y="${y + 150 + colorIndex * 18}" width="360" height="12" rx="6" fill="${escapeXml(color.hex)}"/>`).join("")}
          `;
        }).join("")}
      </svg>`;

      const outfitResult = await persistImageResult({
        admin,
        userId: user.id,
        canvasId: canvas.id,
        tool: "outfit",
        variant: `${occasion}-${vibe}`.replace(/\s+/g, "-").toLowerCase(),
        sourceAssetId: sourceResolved.sourceAssetId,
        sourceImagePath: sourceResolved.sourceImagePath,
        resultBuffer: Buffer.from(outfitSummary),
        meta: { outfit },
      });

      return NextResponse.json({ ...outfitResult, outfit });
    }

    if (!env.fal?.isConfigured) {
      return NextResponse.json({ error: "FAL not configured" }, { status: 503 });
    }

    const { data: imgData, error: imgErr } = await admin.storage
      .from(env.supabase.bucket)
      .download(sourceResolved.sourceImagePath);
    if (imgErr || !imgData) return NextResponse.json({ error: "Source image unavailable" }, { status: 422 });

    const sourceBuffer = Buffer.from(await imgData.arrayBuffer());
    const compressed = await compressForAI(sourceBuffer);

    if (body.mode === "makeup") {
      const makeupStyle: MakeupStyleValue = parseMakeupStyle(options.makeupStyle);
      const makeupIntensity: MakeupIntensityValue = parseMakeupIntensity(options.makeupIntensity);
      const { createFalClient } = await import("@fal-ai/client");
      const fal = createFalClient({ credentials: env.fal.apiKey });

      let resultUrl = "";
      try {
        const result = await fal.run("fal-ai/image-apps-v2/makeup-application", {
          input: {
            image_url: `data:image/jpeg;base64,${compressed.toString("base64")}`,
            makeup_style: makeupStyle,
            intensity: makeupIntensity,
          },
        });
        resultUrl = extractFalImageUrl(result);
      } catch (falErr) {
        console.error("[studio/generate] FAL makeup error:", falErr);
        return NextResponse.json(
          { error: errorMessageFromUnknown(falErr, "Makeup generation failed. Please try again.") },
          { status: 502 },
        );
      }

      if (!resultUrl) {
        return NextResponse.json({ error: "No output from makeup model" }, { status: 502 });
      }

      let resultBuffer: Buffer;
      try {
        resultBuffer = await fetchRemoteImageBuffer(resultUrl, { timeoutMs: 30_000, maxBytes: 20 * 1024 * 1024 });
      } catch {
        return NextResponse.json({ error: "Download failed" }, { status: 502 });
      }

      let persisted;
      try {
        persisted = await persistImageResult({
          admin,
          userId: user.id,
          canvasId: canvas.id,
          tool: "makeup",
          variant: `${makeupStyle}-${makeupIntensity}`.replace(/\s+/g, "-").toLowerCase(),
          sourceAssetId: sourceResolved.sourceAssetId,
          sourceImagePath: sourceResolved.sourceImagePath,
          resultBuffer,
        });
      } catch (persistErr) {
        console.error("[studio/generate] persist makeup failed:", persistErr);
        return NextResponse.json(
          { error: errorMessageFromUnknown(persistErr, "Could not save generated look.") },
          { status: 500 },
        );
      }

      return NextResponse.json(persisted);
    }

    const hairStyle = typeof options.hairStyle === "string" && options.hairStyle.trim() ? options.hairStyle.trim() : "No change";
    const hairColor: FalHairColor = parseHairColor(options.hairColor);

    let detectedGender: "none" | "male" | "female" = "none";
    try {
      const face = await detectFaceDetails(sourceBuffer);
      detectedGender = normalizeRekognitionGender(face);
    } catch (err) {
      console.warn("[studio/generate] Rekognition gender detection skipped:", (err as Error).message);
      return NextResponse.json(
        { error: "Gender detection is currently unavailable. Please try again in a moment." },
        { status: 503 },
      );
    }

    if (detectedGender === "none") {
      return NextResponse.json(
        { error: "Could not detect male/female from this photo. Please upload a clear, front-facing selfie for hair try-on." },
        { status: 422 },
      );
    }

    if (hairStyle !== "No change" && !isHairStyleAllowedForGender(hairStyle, detectedGender)) {
      return NextResponse.json(
        { error: `Selected hairstyle is not available for detected gender (${detectedGender}).` },
        { status: 400 },
      );
    }

    const { createFalClient } = await import("@fal-ai/client");
    const fal = createFalClient({ credentials: env.fal.apiKey });
    const falInput: {
      image_url: string;
      target_hairstyle?: FalTargetHairstyle;
      hair_color?: FalHairColor;
    } = {
      image_url: `data:image/jpeg;base64,${compressed.toString("base64")}`,
    };

    const targetHairstyle = toTargetHairstyle(hairStyle);
    if (targetHairstyle) falInput.target_hairstyle = targetHairstyle;
    if (hairColor !== "natural") falInput.hair_color = hairColor;

    let resultUrl = "";
    try {
      const result = await fal.run("fal-ai/image-apps-v2/hair-change", { input: falInput });
      resultUrl = extractFalImageUrl(result);
    } catch (falErr) {
      console.error("[studio/generate] FAL hair error:", falErr);
      return NextResponse.json(
        { error: errorMessageFromUnknown(falErr, "Hair generation failed. Please try again.") },
        { status: 502 },
      );
    }

    if (!resultUrl) {
      return NextResponse.json({ error: "No output from hair model" }, { status: 502 });
    }

    let resultBuffer: Buffer;
    try {
      resultBuffer = await fetchRemoteImageBuffer(resultUrl, { timeoutMs: 30_000, maxBytes: 20 * 1024 * 1024 });
    } catch {
      return NextResponse.json({ error: "Download failed" }, { status: 502 });
    }

    let persisted;
    try {
      persisted = await persistImageResult({
        admin,
        userId: user.id,
        canvasId: canvas.id,
        tool: "hair",
        variant: `${hairStyle}-${hairColor}`.replace(/\s+/g, "-").toLowerCase(),
        sourceAssetId: sourceResolved.sourceAssetId,
        sourceImagePath: sourceResolved.sourceImagePath,
        resultBuffer,
      });
    } catch (persistErr) {
      console.error("[studio/generate] persist hair failed:", persistErr);
      return NextResponse.json(
        { error: errorMessageFromUnknown(persistErr, "Could not save generated look.") },
        { status: 500 },
      );
    }

    return NextResponse.json(persisted);
  } catch (err) {
    console.error("[studio/generate]", err);
    return NextResponse.json({ error: errorMessageFromUnknown(err) }, { status: 500 });
  }
}