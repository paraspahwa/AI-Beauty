/**
 * Hairstyle try-on generation — v4 (dual-model strategy)
 *
 * Primary:  black-forest-labs/flux-kontext-pro
 *   - Instruction-based image editing, no mask required
 *   - Best face preservation + photorealism
 *   - Correct input param: input_image (not img_cond_path)
 *
 * Fallback: fofr/become-image (SDXL + IP-Adapter)
 *   - Purpose-built for style-preserving face transfer
 *   - Kicks in automatically if Pro fails or times out
 */

import Replicate from "replicate";
import sharp from "sharp";

// ── Constants ──────────────────────────────────────────────────────────────────
/** Primary: BFL's full-quality instruction-based editor */
const FLUX_KONTEXT_PRO   = "black-forest-labs/flux-kontext-pro" as const;
/** Fallback: SDXL + IP-Adapter face-preserving style transfer */
const BECOME_IMAGE_MODEL = "fofr/become-image:4af11083a4e2c9dd1b1f18ce37ade3f4d38d21e8d3a62a9c3b7fcf1d8b53db8" as const;
const SELFIE_SEND_SIZE = 768;
const OUTPUT_W = 400;
const OUTPUT_H = 530;
const MAX_CONCURRENCY = 2;

// ── Types ──────────────────────────────────────────────────────────────────────
export interface FaceBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  cx: number;
  crownY: number;
  faceW: number;
  faceH: number;
}

// ── Replicate client (lazy singleton) ─────────────────────────────────────────
let _client: Replicate | null = null;
function getClient(token: string): Replicate {
  // useFileOutput: false → SDK returns plain string URLs instead of FileOutput
  // objects (ReadableStream subclasses). FileOutput objects lack .startsWith()
  // so URL validation and fetch both fail silently without this flag.
  if (!_client) _client = new Replicate({ auth: token, useFileOutput: false });
  return _client;
}

// ── Hair colour word helper ────────────────────────────────────────────────────
function hexToColourWord(hex: string): string {
  const h = hex.replace("#", "").toLowerCase();
  if (!h || h.length < 6) return "natural brown";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const isReddish = r > g + 25 && r > b + 20;
  if (brightness > 200) return "golden blonde";
  if (brightness > 165) return "light honey brown";
  if (brightness > 130) return "medium chestnut brown";
  if (brightness > 90)  return isReddish ? "warm auburn" : "dark brown";
  if (brightness > 50)  return "very dark brown";
  return "black";
}

// ── Prompt builders ─────────────────────────────────────────────────────────────
function buildPromptPro(styleName: string, hairHex: string): string {
  const colour = hexToColourWord(hairHex);
  return (
    `Restyle the person's hair to ${styleName} with ${colour} hair color. ` +
    `Apply realistic hair texture, natural volume, strand definition, and lifelike sheen for the ${styleName} style. ` +
    `The hairline, part, and overall shape should match a professional ${styleName} cut. ` +
    `The face, skin tone, eyes, nose, lips, beard, eyebrows, expression, clothing, accessories, and background must remain COMPLETELY UNCHANGED — pixel-perfect identity preservation. ` +
    `Photorealistic beauty portrait, natural studio lighting, no cartoon or illustration style.`
  );
}

function buildPromptFallback(styleName: string, hairHex: string): string {
  const colour = hexToColourWord(hairHex);
  return (
    `A photorealistic portrait with ${styleName} hairstyle in ${colour} color. ` +
    `Studio lighting, natural skin, sharp facial features.`
  );
}

// ── Single preview generator ───────────────────────────────────────────────────
/**
 * Generate one photorealistic hairstyle try-on.
 *
 * Strategy:
 *  1. Try flux-kontext-pro (best quality, instruction-based)
 *  2. On failure → fallback to fofr/become-image (IP-Adapter style transfer)
 *
 * _faceBox param kept for API compatibility with callers; it is unused here.
 */
export async function replicateHairPreview(
  selfieBuf: Buffer,
  _faceBox: FaceBox | null,
  styleName: string,
  hairHex: string,
  replicateToken: string,
): Promise<Buffer> {
  const smallBuf = await sharp(selfieBuf)
    .rotate()
    .resize(SELFIE_SEND_SIZE, SELFIE_SEND_SIZE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;
  const client = getClient(replicateToken);

  // ── Option 1: flux-kontext-pro ───────────────────────────────────────────
  let url: string | null = null;
  try {
    const output = await client.run(FLUX_KONTEXT_PRO, {
      input: {
        input_image:      imageDataUri,
        prompt:           buildPromptPro(styleName, hairHex),
        output_format:    "jpg",
        output_quality:   92,
        aspect_ratio:     "3:4",
        safety_tolerance: 2,
      },
    });
    const raw: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
    if (raw?.startsWith("https://")) url = raw;
    else console.warn(`[replicate-hair] flux-kontext-pro unexpected URL, falling back`);
  } catch (err) {
    console.warn(`[replicate-hair] flux-kontext-pro failed (${(err as Error).message}), trying fallback`);
  }

  // ── Option 2: fofr/become-image (IP-Adapter fallback) ───────────────────
  if (!url) {
    try {
      const output = await client.run(BECOME_IMAGE_MODEL, {
        input: {
          image:            imageDataUri,
          prompt:           buildPromptFallback(styleName, hairHex),
          image_strength:   0.55,       // preserve face identity
          denoising_start:  0.45,
          output_format:    "jpg",
          output_quality:   90,
          negative_prompt:  "deformed face, disfigured, cartoon, painting, low quality, blurry",
        },
      });
      const raw: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
      if (raw?.startsWith("https://")) {
        url = raw;
        console.info(`[replicate-hair] used fallback model for "${styleName}"`);
      }
    } catch (err) {
      console.warn(`[replicate-hair] fallback also failed: ${(err as Error).message}`);
    }
  }

  if (!url) throw new Error(`Both models failed for style "${styleName}"`);

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const resultBuf = Buffer.from(await resp.arrayBuffer());

  return sharp(resultBuf)
    .resize(OUTPUT_W, OUTPUT_H, { fit: "cover", position: "top" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ── Batch generator with concurrency cap ───────────────────────────────────────
/**
 * Generate up to 5 hairstyle previews (dual-model: pro + fallback per slot).
 * Concurrency capped at MAX_CONCURRENCY to stay within Replicate rate limits.
 * Returns array of { index, buffer, style } for successful generations.
 */
export async function replicateHairPreviewBatch(
  selfieBuf: Buffer,
  faceBox: FaceBox | null,
  styles: { index: number; name: string }[],
  hairHex: string,
  replicateToken: string,
): Promise<{ index: number; buffer: Buffer; style: string }[]> {
  const results: { index: number; buffer: Buffer; style: string }[] = [];
  const queue = [...styles];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        const buf = await replicateHairPreview(selfieBuf, faceBox, item.name, hairHex, replicateToken);
        results.push({ index: item.index, buffer: buf, style: item.name });
        console.info(`[replicate-hair] ✓ slot ${item.index} "${item.name}"`);
      } catch (err) {
        console.warn(`[replicate-hair] ✗ slot ${item.index} "${item.name}":`, (err as Error).message);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, styles.length) }, () => worker()));
  return results;
}

