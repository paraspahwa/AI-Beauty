import { toFile } from "openai";
import sharp from "sharp";
import { getOpenAI } from "./openai";

type ImageEditCompatRequest = {
  model: string;
  image: Awaited<ReturnType<typeof toFile>>;
  prompt: string;
  n: number;
  size: string;
};

type ImageEditCompatResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
};

/** Resize + orient to a square PNG suitable for image editing APIs. */
async function toSquarePng(buf: Buffer, size: number): Promise<Buffer> {
  return sharp(buf)
    .rotate()
    .resize(size, size, { fit: "cover", position: "top" })
    .removeAlpha()
    .png()
    .toBuffer();
}

/**
 * DALL-E 2 mask: fully opaque everywhere except the edit region, which is transparent (alpha=0).
 * DALL-E 2 fills transparent areas with AI-generated content.
 */
async function buildEditMask(size: number, type: "glasses" | "hairstyle"): Promise<Buffer> {
  const regionTop = type === "glasses" ? Math.floor(size * 0.32) : 0;
  const regionH = type === "glasses" ? Math.floor(size * 0.28) : Math.floor(size * 0.42);

  // Start with fully-opaque white background
  const base = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 255 } },
  })
    .png()
    .toBuffer();

  // Punch a transparent hole where edits should appear
  const hole = await sharp({
    create: { width: size, height: regionH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([{ input: hole, top: regionTop, left: 0 }])
    .png()
    .toBuffer();
}

/**
 * Generate a photoreal try-on image by editing the user's selfie.
 *
 * Strategy:
 *  Primary  — gpt-image-1 via images.edit (no mask required, highest quality)
 *  Fallback — DALL-E 2 via images.edit with a Sharp-generated region mask
 *
 * @param selfieBuf       Raw image buffer (JPEG / PNG / WEBP)
 * @param styleDescription Short description of the style to try on
 * @param type            "glasses" | "hairstyle"
 * @returns PNG buffer of the generated try-on image
 */
export async function generateTryOnImage(
  selfieBuf: Buffer,
  styleDescription: string,
  type: "glasses" | "hairstyle",
): Promise<Buffer> {
  const client = getOpenAI();

  const prompt =
    type === "glasses"
      ? `The same person now wearing ${styleDescription}. Photorealistic portrait, identical face, skin tone, and lighting. High-quality fashion photography.`
      : `The same person now with ${styleDescription}. Photorealistic portrait, identical face, skin tone, and lighting. High-quality fashion photography.`;

  // ── Primary: gpt-image-1 images.edit ─────────────────────────────────────
  try {
    const squarePng = await toSquarePng(selfieBuf, 1024);
    const imageFile = await toFile(squarePng, "selfie.png", { type: "image/png" });

    const editCompat = client.images.edit as unknown as (
      request: ImageEditCompatRequest,
    ) => Promise<ImageEditCompatResponse>;

    const response = await editCompat({
      model: "gpt-image-1",
      image: imageFile,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const b64 = response?.data?.[0]?.b64_json as string | undefined;
    if (!b64) throw new Error("Empty b64_json from gpt-image-1");
    return Buffer.from(b64, "base64");
  } catch (primaryErr) {
    console.warn(
      "[image-gen] gpt-image-1 edit failed, falling back to DALL-E 2:",
      (primaryErr as Error).message,
    );
  }

  // ── Fallback: DALL-E 2 images.edit with region mask ──────────────────────
  const small = await toSquarePng(selfieBuf, 512);
  const mask = await buildEditMask(512, type);
  const smallFile = await toFile(small, "selfie.png", { type: "image/png" });
  const maskFile = await toFile(mask, "mask.png", { type: "image/png" });

  const fallback = await client.images.edit({
    model: "dall-e-2",
    image: smallFile,
    mask: maskFile,
    prompt,
    n: 1,
    size: "512x512",
    response_format: "b64_json",
  });

  const b64 = fallback.data?.[0]?.b64_json;
  if (!b64) throw new Error("Empty b64_json from DALL-E 2 fallback");
  return Buffer.from(b64, "base64");
}
