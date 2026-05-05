/**
 * Replicate-based clothing colour inpainting — v1
 *
 * Mirrors the replicate-hair.ts pattern exactly but targets the torso/clothing
 * region instead of the hair zone.
 *
 * Model: lucataco/sdxl-inpainting (same model as hair pipeline)
 *   https://replicate.com/lucataco/sdxl-inpainting
 *
 * Mask convention (identical to SDXL inpainting standard):
 *   WHITE = repaint (clothing zone — below chin, above waist)
 *   BLACK = preserve (face, hair, background, arms below elbow)
 *
 * The face oval is explicitly blacked-out so SD never touches it.
 */

import Replicate from "replicate";
import sharp from "sharp";
import type { FaceBox } from "./replicate-hair";

// ── Constants ─────────────────────────────────────────────────────────────────
// Same pinned SDXL inpainting model as hair pipeline
const SDXL_INPAINT_MODEL =
  "lucataco/sdxl-inpainting:a5b13068cc81a89a4fbeefecf6d6fc5e529a5ecc6bde3f97867ef36429a56a69" as const;
const INPAINT_SIZE  = 1024;
const MAX_CONCURRENCY = 2;

// ── Replicate client (lazy singleton) ────────────────────────────────────────
let _client: Replicate | null = null;
function getReplicateClient(token: string): Replicate {
  if (!_client) {
    _client = new Replicate({ auth: token });
  }
  return _client;
}

// ── Clothing mask ─────────────────────────────────────────────────────────────
/**
 * Build the inpaint mask at INPAINT_SIZE × INPAINT_SIZE.
 *
 * Layout (in the CROPPED coordinate space, scaled to INPAINT_SIZE):
 *   - Entire canvas starts BLACK (preserve everything)
 *   - Torso trapezoid is painted WHITE (repaint clothing)
 *   - Face oval is painted BLACK again on top (never touch the face)
 *
 * Torso region: from chin (faceBox.bottom) down to 90% of crop height,
 * spanning full width minus 5% inset on each side.
 */
async function buildClothingMask(
  faceBox: FaceBox,
  cropL: number,
  cropT: number,
  cropW: number,
  cropH: number,
): Promise<Buffer> {
  const scaleX = INPAINT_SIZE / cropW;
  const scaleY = INPAINT_SIZE / cropH;

  // ── Face oval (scaled to crop-relative → INPAINT_SIZE) ───────────────────
  const faceLeft_s   = Math.max(0, Math.round((faceBox.left   - cropL) * scaleX));
  const faceTop_s    = Math.max(0, Math.round((faceBox.top    - cropT) * scaleY));
  const faceRight_s  = Math.min(INPAINT_SIZE, Math.round((faceBox.right  - cropL) * scaleX));
  const faceBottom_s = Math.min(INPAINT_SIZE, Math.round((faceBox.bottom - cropT) * scaleY));
  const faceCx_s     = Math.round((faceBox.cx - cropL) * scaleX);
  const faceCy_s     = Math.round(((faceBox.top + faceBox.bottom) / 2 - cropT) * scaleY);
  // Slightly wider oval so hairline / jaw are never repainted
  const faceRx_s     = Math.round(((faceRight_s - faceLeft_s) / 2) * 1.10);
  const faceRy_s     = Math.round(((faceBottom_s - faceTop_s) / 2) * 1.10);

  // ── Torso region ─────────────────────────────────────────────────────────
  // Start just below chin, end at 92% of scaled crop height
  const torsoTop    = Math.min(INPAINT_SIZE, faceBottom_s + Math.round(faceRy_s * 0.25));
  const torsoBottom = Math.round(INPAINT_SIZE * 0.92);
  // 6% inset from each side so we don't repaint background at edges
  const torsoLeft   = Math.round(INPAINT_SIZE * 0.06);
  const torsoRight  = Math.round(INPAINT_SIZE * 0.94);

  const svg = `<svg width="${INPAINT_SIZE}" height="${INPAINT_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <!-- Black = preserve everything by default -->
    <rect width="${INPAINT_SIZE}" height="${INPAINT_SIZE}" fill="black"/>
    <!-- White = repaint the clothing torso zone -->
    <rect
      x="${torsoLeft}" y="${torsoTop}"
      width="${torsoRight - torsoLeft}" height="${torsoBottom - torsoTop}"
      rx="18" fill="white"
    />
    <!-- Black = preserve face oval (on top of the white torso rect) -->
    <ellipse cx="${faceCx_s}" cy="${faceCy_s}" rx="${faceRx_s}" ry="${faceRy_s}" fill="black"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ── Prompts ───────────────────────────────────────────────────────────────────
function buildPrompt(colorName: string, colorHex: string): string {
  const word = hexToColorWord(colorHex);
  return (
    `close-up beauty portrait photograph, same person wearing a solid ${word} ${colorName} colored top, ` +
    `exact same face exact same skin tone exact same background, ` +
    `only the shirt clothing color is changed to ${colorName}, ` +
    `photorealistic DSLR photo, fashion editorial, natural studio lighting, sharp focus, high resolution`
  );
}

function buildNegativePrompt(): string {
  return (
    "different person, different face, changed face, different skin tone, " +
    "different background, color shift on face or hair, " +
    "cartoon, painting, anime, CGI, 3d render, illustration, digital art, " +
    "blurry, low quality, deformed, ugly, bad anatomy, watermark, " +
    "pattern, print, stripes, texture on clothing, logo, text on clothing"
  );
}

/** Map hex → approximate English color word for prompt clarity. */
function hexToColorWord(hex: string): string {
  const h = hex.replace("#", "").toLowerCase();
  if (!h || h.length < 6) return "neutral";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  if (chroma < 30) {
    if (brightness > 220) return "white";
    if (brightness > 160) return "light gray";
    if (brightness > 100) return "gray";
    if (brightness > 50)  return "dark gray";
    return "black";
  }
  if (r === max && r - b > 40 && r - g > 40) return brightness > 140 ? "red" : "dark red";
  if (g === max && g - r > 40 && g - b > 20) return brightness > 140 ? "green" : "dark green";
  if (b === max && b - r > 30 && b - g > 20) return brightness > 140 ? "blue" : "dark blue";
  if (r > 180 && g > 140 && b < 100) return brightness > 180 ? "yellow" : "gold";
  if (r > 160 && g < 120 && b > 140) return "purple";
  if (r > 180 && g > 100 && b < 100) return brightness > 160 ? "orange" : "rust";
  if (r > 150 && b > 130 && g < 120) return "pink";
  if (g > 140 && b > 140 && r < 120) return "teal";
  return "neutral";
}

// ── Single preview ────────────────────────────────────────────────────────────
/**
 * Generate one photorealistic clothing colour try-on using SDXL inpainting.
 * Face, hair, and background are preserved exactly; only the torso clothing is recoloured.
 */
export async function replicateClothingPreview(
  selfieBuf: Buffer,
  faceBox: FaceBox,
  colorName: string,
  colorHex: string,
  replicateToken: string,
): Promise<Buffer> {
  // ── Crop: portrait centred on face showing face + full torso ──────────────
  const padX   = faceBox.faceW * 0.55;  // horizontal room for shoulders
  const padTop = faceBox.faceH * 0.50;  // room above face for hair
  const padBot = faceBox.faceH * 1.20;  // generous bottom to include full torso
  const img    = sharp(selfieBuf).rotate();
  const meta   = await img.metadata();
  const W      = meta.width  ?? 512;
  const H      = meta.height ?? 768;

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

  // ── Clothing mask ─────────────────────────────────────────────────────────
  const maskPng = await buildClothingMask(faceBox, cropL, cropT, cropW, cropH);

  // ── Base64 data URIs ──────────────────────────────────────────────────────
  const imageDataUri = `data:image/png;base64,${croppedPng.toString("base64")}`;
  const maskDataUri  = `data:image/png;base64,${maskPng.toString("base64")}`;

  // ── Run Replicate SDXL inpainting ─────────────────────────────────────────
  const client = getReplicateClient(replicateToken);

  const output = await client.run(SDXL_INPAINT_MODEL, {
    input: {
      image:               imageDataUri,
      mask:                maskDataUri,
      prompt:              buildPrompt(colorName, colorHex),
      negative_prompt:     buildNegativePrompt(),
      num_inference_steps: 35,
      guidance_scale:      7.5,
      // Lower strength than hair (0.65) so fabric texture stays realistic
      // and the face region is barely touched even outside the mask ellipse
      strength:            0.65,
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

// ── Async (webhook) batch — fires predictions without waiting ─────────────────
const SDXL_VERSION =
  "a5b13068cc81a89a4fbeefecf6d6fc5e529a5ecc6bde3f97867ef36429a56a69" as const;

/**
 * Queue all 6 colour predictions on Replicate without waiting for completion.
 * Replicate calls `makeWebhookUrl(index)` when each prediction finishes.
 * Returns immediately — safe to call from a short-lived serverless function.
 */
export async function replicateClothingBatchAsync(
  selfieBuf: Buffer,
  faceBox: FaceBox,
  colors: { index: number; name: string; hex: string }[],
  replicateToken: string,
  makeWebhookUrl: (index: number) => string,
): Promise<void> {
  const client = getReplicateClient(replicateToken);

  const padX   = faceBox.faceW * 0.55;
  const padTop = faceBox.faceH * 0.50;
  const padBot = faceBox.faceH * 1.20;
  const img    = sharp(selfieBuf).rotate();
  const meta   = await img.metadata();
  const W      = meta.width  ?? 512;
  const H      = meta.height ?? 768;

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

  const maskPng = await buildClothingMask(faceBox, cropL, cropT, cropW, cropH);
  const imageDataUri = `data:image/png;base64,${croppedPng.toString("base64")}`;
  const maskDataUri  = `data:image/png;base64,${maskPng.toString("base64")}`;

  await Promise.all(
    colors.map(async ({ index, name, hex }) => {
      try {
        const prediction = await client.predictions.create({
          version: SDXL_VERSION,
          input: {
            image:               imageDataUri,
            mask:                maskDataUri,
            prompt:              buildPrompt(name, hex),
            negative_prompt:     buildNegativePrompt(),
            num_inference_steps: 30,
            guidance_scale:      7.5,
            strength:            0.65,
            scheduler:           "DPM++2MKarras",
            seed:                Math.floor(Math.random() * 9999999),
          },
          webhook:               makeWebhookUrl(index),
          webhook_events_filter: ["completed"],
        });
        console.info(`[replicate-clothing] queued prediction ${prediction.id} slot ${index} "${name}"`);
      } catch (err) {
        console.warn(`[replicate-clothing] failed to queue slot ${index}:`, (err as Error).message);
      }
    }),
  );
}

// ── Batch generator ───────────────────────────────────────────────────────────
/**
 * Generate all colour swatch previews in parallel (up to MAX_CONCURRENCY).
 * Returns array of { index, buffer, colorName, colorHex } for successful slots.
 */
export async function replicateClothingPreviewBatch(
  selfieBuf: Buffer,
  faceBox: FaceBox,
  colors: { index: number; name: string; hex: string }[],
  replicateToken: string,
): Promise<{ index: number; buffer: Buffer; colorName: string }[]> {
  const results: { index: number; buffer: Buffer; colorName: string }[] = [];
  const queue = [...colors];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        const buf = await replicateClothingPreview(
          selfieBuf,
          faceBox,
          item.name,
          item.hex,
          replicateToken,
        );
        results.push({ index: item.index, buffer: buf, colorName: item.name });
        console.info(`[replicate-clothing] ✓ slot ${item.index} "${item.name}" (${item.hex})`);
      } catch (err) {
        console.warn(
          `[replicate-clothing] ✗ slot ${item.index} "${item.name}":`,
          (err as Error).message,
        );
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENCY, colors.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
