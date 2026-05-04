/**
 * Replicate-based glasses inpainting — v1
 *
 * Mirrors replicate-hair.ts / replicate-clothing.ts exactly but targets the
 * eye/brow region so SDXL paints photorealistic glasses frames onto the face.
 *
 * Model: lucataco/sdxl-inpainting (same pinned version as rest of pipeline)
 *   https://replicate.com/lucataco/sdxl-inpainting
 *
 * Mask convention (SDXL inpainting standard):
 *   WHITE = repaint  → eye-zone strip (brow → nose bridge)
 *   BLACK = preserve → entire face above/below the eye strip, hair, body, bg
 *
 * The face oval is blacked-out everywhere EXCEPT the eye strip so SD never
 * changes the person's skin, lips, nose, or forehead.
 */

import Replicate from "replicate";
import sharp from "sharp";
import type { FaceBox } from "./replicate-hair";

// ── Constants ─────────────────────────────────────────────────────────────────
const SDXL_INPAINT_MODEL =
  "lucataco/sdxl-inpainting:a5b13068cc81a89a4fbeefecf6d6fc5e529a5ecc6bde3f97867ef36429a56a69" as const;
const INPAINT_SIZE   = 1024;
const MAX_CONCURRENCY = 3; // glasses are cheaper to generate than hair/clothing

// ── Replicate client (lazy singleton) ────────────────────────────────────────
let _client: Replicate | null = null;
function getReplicateClient(token: string): Replicate {
  if (!_client) {
    _client = new Replicate({ auth: token });
  }
  return _client;
}

// ── Eye-zone mask ─────────────────────────────────────────────────────────────
/**
 * Build INPAINT_SIZE × INPAINT_SIZE mask for the glasses region.
 *
 * Layout (all coords in the CROPPED, then scaled coordinate space):
 *   - Entire canvas = BLACK  (preserve everything)
 *   - Eye-zone rectangle = WHITE  (repaint glasses here)
 *     from: 8% above face top (brow line)
 *     to:   45% down the face height (nose bridge level)
 *     horizontally: full face width + 12% padding for temple arms
 *
 * This means SD only changes the brow-to-nose-bridge strip, leaving
 * skin, hair, chin, and background untouched.
 */
async function buildGlassesMask(
  faceBox: FaceBox,
  cropL: number,
  cropT: number,
  cropW: number,
  cropH: number,
): Promise<Buffer> {
  const scaleX = INPAINT_SIZE / cropW;
  const scaleY = INPAINT_SIZE / cropH;

  // Face bounding box in scaled coords
  const faceLeft_s   = Math.max(0, Math.round((faceBox.left   - cropL) * scaleX));
  const faceTop_s    = Math.max(0, Math.round((faceBox.top    - cropT) * scaleY));
  const faceRight_s  = Math.min(INPAINT_SIZE, Math.round((faceBox.right  - cropL) * scaleX));
  const faceBottom_s = Math.min(INPAINT_SIZE, Math.round((faceBox.bottom - cropT) * scaleY));
  const faceH_s      = faceBottom_s - faceTop_s;
  const faceW_s      = faceRight_s  - faceLeft_s;

  // Eye-zone strip
  //   top:    8% above face top  → catches the brow
  //   bottom: 48% down faceH    → catches nose bridge, bottom of lens
  //   left/right: 14% wider than face width → catches temple arms
  const eyeTop    = Math.max(0, Math.round(faceTop_s - faceH_s * 0.08));
  const eyeBottom = Math.min(INPAINT_SIZE, Math.round(faceTop_s + faceH_s * 0.48));
  const eyeLeft   = Math.max(0, Math.round(faceLeft_s  - faceW_s * 0.14));
  const eyeRight  = Math.min(INPAINT_SIZE, Math.round(faceRight_s + faceW_s * 0.14));
  const eyeH      = Math.max(1, eyeBottom - eyeTop);
  const eyeW      = Math.max(1, eyeRight  - eyeLeft);

  const svg = `<svg width="${INPAINT_SIZE}" height="${INPAINT_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <!-- Black = preserve everything -->
    <rect width="${INPAINT_SIZE}" height="${INPAINT_SIZE}" fill="black"/>
    <!-- White = repaint eye/glasses zone -->
    <rect x="${eyeLeft}" y="${eyeTop}" width="${eyeW}" height="${eyeH}" rx="12" fill="white"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ── Prompt builders ───────────────────────────────────────────────────────────
function buildPrompt(styleName: string): string {
  // Map common style names to explicit frame descriptions
  const styleMap: Record<string, string> = {
    "cat-eye":   "cat-eye glasses with upswept outer corners and thin metal frame",
    "cat eye":   "cat-eye glasses with upswept outer corners and thin metal frame",
    "aviator":   "aviator glasses with teardrop-shaped metal frame and thin bridge",
    "round":     "round circular glasses with thin wire frame",
    "rectangle": "rectangular glasses with straight edges and medium-width frame",
    "square":    "square glasses with bold angular frame",
    "oval":      "oval glasses with soft rounded frame",
    "wayf":      "wayfarer glasses with slightly trapezoidal plastic frame",
    "browline":  "browline glasses with thick upper frame and thin lower rim",
    "oversized": "oversized square glasses with wide bold frame",
    "geometric": "geometric hexagonal glasses with angular thin frame",
    "rimless":   "rimless glasses with barely visible frame",
  };
  const lower    = styleName.toLowerCase();
  const frameDesc = Object.entries(styleMap).find(([k]) => lower.includes(k))?.[1]
    ?? `${styleName} style glasses`;

  return (
    `close-up beauty portrait photograph, same person now wearing ${frameDesc}, ` +
    `exact same face exact same skin tone exact same background exact same hair, ` +
    `only eyeglasses frames are added, photorealistic DSLR photo, ` +
    `fashion editorial, natural studio lighting, sharp focus, high resolution`
  );
}

function buildNegativePrompt(): string {
  return (
    "no glasses, sunglasses, tinted lenses, mirrored lenses, " +
    "different person, different face, different skin tone, changed face, " +
    "different background, different hair, changed hair color, " +
    "cartoon, painting, anime, CGI, 3d render, illustration, digital art, " +
    "blurry, low quality, deformed, ugly, bad anatomy, watermark, " +
    "extra limbs, double face, floating glasses, glasses on forehead"
  );
}

// ── Single preview generator ──────────────────────────────────────────────────
/**
 * Generate one photorealistic glasses try-on using SDXL inpainting.
 * Only the eye-zone strip is repainted; face, hair, and background are preserved.
 */
export async function replicateGlassesPreview(
  selfieBuf: Buffer,
  faceBox: FaceBox,
  styleName: string,
  replicateToken: string,
): Promise<Buffer> {
  const img  = sharp(selfieBuf).rotate();
  const meta = await img.metadata();
  const W    = meta.width  ?? 512;
  const H    = meta.height ?? 768;

  // ── Crop: tight portrait showing full face, some hair, slight chin clearance
  const padX   = faceBox.faceW * 0.55;  // shoulder/hair breathing room
  const padTop = faceBox.faceH * 0.45;  // room above brows for hair
  const padBot = faceBox.faceH * 0.40;  // chin clearance
  const cropL = Math.max(0, Math.round(faceBox.left   - padX));
  const cropT = Math.max(0, Math.round(faceBox.top    - padTop));
  const cropR = Math.min(W, Math.round(faceBox.right  + padX));
  const cropB = Math.min(H, Math.round(faceBox.bottom + padBot));
  const cropW = Math.max(1, cropR - cropL);
  const cropH = Math.max(1, cropB - cropT);

  const croppedPng = await sharp(selfieBuf)
    .rotate()
    .extract({ left: cropL, top: cropT, width: cropW, height: cropH })
    .resize(INPAINT_SIZE, INPAINT_SIZE, { fit: "cover", position: "top" })
    .removeAlpha()
    .png()
    .toBuffer();

  // ── Build eye-zone mask ───────────────────────────────────────────────────
  const maskPng = await buildGlassesMask(faceBox, cropL, cropT, cropW, cropH);

  // ── Base64 data URIs ──────────────────────────────────────────────────────
  const imageDataUri = `data:image/png;base64,${croppedPng.toString("base64")}`;
  const maskDataUri  = `data:image/png;base64,${maskPng.toString("base64")}`;

  // ── Run Replicate SDXL inpainting ─────────────────────────────────────────
  const client = getReplicateClient(replicateToken);

  const output = await client.run(SDXL_INPAINT_MODEL, {
    input: {
      image:               imageDataUri,
      mask:                maskDataUri,
      prompt:              buildPrompt(styleName),
      negative_prompt:     buildNegativePrompt(),
      num_inference_steps: 35,
      guidance_scale:      7.5,
      // Low strength keeps the face pixel-perfect — only the glasses zone changes
      strength:            0.55,
      scheduler:           "DPM++2MKarras",
      seed:                Math.floor(Math.random() * 9999999),
    },
  });

  // ── Download result + resize to card dimensions ───────────────────────────
  const outputUrl: string = Array.isArray(output)
    ? (output[0] as string)
    : (output as unknown as string);
  if (!outputUrl) throw new Error("Replicate returned no output URL");

  const resp = await fetch(outputUrl);
  if (!resp.ok) throw new Error(`Replicate output download failed: ${resp.status}`);
  const resultBuf = Buffer.from(await resp.arrayBuffer());

  return sharp(resultBuf)
    .resize(400, 530, { fit: "cover", position: "top" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ── Batch generator ───────────────────────────────────────────────────────────
/**
 * Generate all 5 flattering + 0 avoid glasses previews in parallel.
 * Concurrency capped at MAX_CONCURRENCY to stay under Replicate rate limits.
 * Returns array of { index, buffer, style } for successful slots only.
 */
export async function replicateGlassesPreviewBatch(
  selfieBuf: Buffer,
  faceBox: FaceBox,
  styles: { index: number; name: string }[],
  replicateToken: string,
): Promise<{ index: number; buffer: Buffer; style: string }[]> {
  const results: { index: number; buffer: Buffer; style: string }[] = [];
  const queue = [...styles];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        const buf = await replicateGlassesPreview(
          selfieBuf,
          faceBox,
          item.name,
          replicateToken,
        );
        results.push({ index: item.index, buffer: buf, style: item.name });
        console.info(`[replicate-glasses] ✓ slot ${item.index} "${item.name}"`);
      } catch (err) {
        console.warn(
          `[replicate-glasses] ✗ slot ${item.index} "${item.name}":`,
          (err as Error).message,
        );
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENCY, styles.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
