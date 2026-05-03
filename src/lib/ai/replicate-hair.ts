/**
 * Replicate-based hairstyle inpainting — v2
 *
 * Model: lucataco/sdxl-inpainting (SDXL-based — far better face preservation than SD 1.5)
 *   https://replicate.com/lucataco/sdxl-inpainting
 *
 * Key improvements over v1:
 *  1. SDXL model → higher resolution, much better face preservation
 *  2. Face-cutout mask: WHITE = hair-only zone (above forehead + sides),
 *     BLACK = face + body (SD must NOT touch the face)
 *  3. img2img + inpaint combination at strength 0.75 on hair zone only
 *  4. 768px crop for SDXL quality
 *  5. Parallel batch generation with concurrency limit
 */

import Replicate from "replicate";
import sharp from "sharp";

// ── Constants ─────────────────────────────────────────────────────────────────
// SDXL inpainting — significantly better than SD 1.5 for face-preserving edits
const SDXL_INPAINT_MODEL = "lucataco/sdxl-inpainting" as const;
// Output size for SDXL (must be multiple of 8, SDXL native = 1024)
const INPAINT_SIZE = 768;
// Max concurrent Replicate predictions (to stay under rate limit)
const MAX_CONCURRENCY = 3;

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Replicate client (lazy singleton) ────────────────────────────────────────
let _client: Replicate | null = null;
function getReplicateClient(token: string): Replicate {
  if (!_client) {
    _client = new Replicate({ auth: token });
  }
  return _client;
}

// ── Mask builder ─────────────────────────────────────────────────────────────
/**
 * Build the inpaint mask at INPAINT_SIZE × INPAINT_SIZE.
 *
 * Layout in the CROPPED coordinate space:
 *   - Entire image starts as WHITE (repaint everything)
 *   - Face oval is painted BLACK (preserve the face)
 *   - Body below chin is painted BLACK (preserve body)
 *
 * This means SD only changes the hair region around/above the face.
 */
async function buildHairMask(
  faceBox: FaceBox,
  cropL: number,
  cropT: number,
  cropW: number,
  cropH: number,
): Promise<Buffer> {
  const scaleX = INPAINT_SIZE / cropW;
  const scaleY = INPAINT_SIZE / cropH;

  // Face oval in crop-relative → scaled coords
  const faceLeft_scaled   = Math.max(0, Math.round((faceBox.left   - cropL) * scaleX));
  const faceTop_scaled    = Math.max(0, Math.round((faceBox.top    - cropT) * scaleY));
  const faceRight_scaled  = Math.min(INPAINT_SIZE, Math.round((faceBox.right  - cropL) * scaleX));
  const faceBottom_scaled = Math.min(INPAINT_SIZE, Math.round((faceBox.bottom - cropT) * scaleY));
  const faceCx_scaled     = Math.round((faceBox.cx    - cropL) * scaleX);
  const faceCy_scaled     = Math.round(((faceBox.top + faceBox.bottom) / 2 - cropT) * scaleY);
  const faceRx_scaled     = Math.round(((faceRight_scaled - faceLeft_scaled) / 2) * 1.05); // 5% wider for comfort
  const faceRy_scaled     = Math.round(((faceBottom_scaled - faceTop_scaled) / 2) * 1.05);

  // Body region below chin (preserve shirt/background)
  const belowChin_scaled  = Math.min(INPAINT_SIZE, faceBottom_scaled + Math.round(faceRy_scaled * 0.3));

  // SVG mask: white bg, black face oval + black body region
  const svg = `<svg width="${INPAINT_SIZE}" height="${INPAINT_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <!-- White = repaint (hair zone) -->
    <rect width="${INPAINT_SIZE}" height="${INPAINT_SIZE}" fill="white"/>
    <!-- Black = preserve face -->
    <ellipse cx="${faceCx_scaled}" cy="${faceCy_scaled}" rx="${faceRx_scaled}" ry="${faceRy_scaled}" fill="black"/>
    <!-- Black = preserve body below chin -->
    <rect x="0" y="${belowChin_scaled}" width="${INPAINT_SIZE}" height="${INPAINT_SIZE - belowChin_scaled}" fill="black"/>
  </svg>`;

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

// ── Style → inpainting prompt ─────────────────────────────────────────────────
function buildPrompt(styleName: string, hairHex: string): string {
  const colour = hexToColourWord(hairHex);
  return (
    `professional beauty portrait, ${styleName} hairstyle, ${colour} hair, ` +
    `photorealistic, high detail, sharp focus, studio lighting, ` +
    `same face same person same skin tone, hair only change, 8k resolution`
  );
}

function buildNegativePrompt(): string {
  return (
    "different person, different face, changed face, changed skin, " +
    "cartoon, painting, anime, CGI, 3d render, illustration, " +
    "blurry, low quality, deformed, ugly, bad anatomy, watermark, " +
    "extra limbs, missing face, bald, wig, plastic hair"
  );
}

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

// ── Single preview generator ──────────────────────────────────────────────────
/**
 * Generate one photorealistic hairstyle preview using SDXL inpainting.
 * Face is preserved exactly; only the hair region is changed.
 */
export async function replicateHairPreview(
  selfieBuf: Buffer,
  faceBox: FaceBox,
  styleName: string,
  hairHex: string,
  replicateToken: string,
): Promise<Buffer> {
  // ── Crop: tight portrait centred on face, with generous crown room ─────────
  const padX  = faceBox.faceW * 0.50;   // horizontal breathing room
  const padTop = faceBox.faceH * 0.70;  // generous top for hair above crown
  const padBot = faceBox.faceH * 0.35;  // small bottom padding for chin
  const cropL = Math.max(0, Math.round(faceBox.left   - padX));
  const cropT = Math.max(0, Math.round(faceBox.crownY - padTop));
  const cropR = Math.round(faceBox.right  + padX);
  const cropB = Math.round(faceBox.bottom + padBot);
  const cropW = Math.max(1, cropR - cropL);
  const cropH = Math.max(1, cropB - cropT);

  // Resize crop to INPAINT_SIZE keeping aspect (pad if needed)
  const croppedPng = await sharp(selfieBuf)
    .rotate()
    .extract({ left: cropL, top: cropT, width: cropW, height: cropH })
    .resize(INPAINT_SIZE, INPAINT_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
    .removeAlpha()
    .png()
    .toBuffer();

  // ── Build face-cutout mask ─────────────────────────────────────────────────
  const maskPng = await buildHairMask(faceBox, cropL, cropT, cropW, cropH);

  // ── Encode as base64 data-URIs ────────────────────────────────────────────
  const imageDataUri = `data:image/png;base64,${croppedPng.toString("base64")}`;
  const maskDataUri  = `data:image/png;base64,${maskPng.toString("base64")}`;

  // ── Run Replicate SDXL inpainting ─────────────────────────────────────────
  const client = getReplicateClient(replicateToken);

  const output = await client.run(SDXL_INPAINT_MODEL, {
    input: {
      image:           imageDataUri,
      mask:            maskDataUri,
      prompt:          buildPrompt(styleName, hairHex),
      negative_prompt: buildNegativePrompt(),
      num_inference_steps: 40,
      guidance_scale:      8.0,
      strength:            0.90,
      scheduler:           "DPM++2MKarras",
      seed:                Math.floor(Math.random() * 9999999), // varied per card
    },
  });

  // ── Download output + resize to card dimensions ───────────────────────────
  const outputUrl: string = Array.isArray(output)
    ? (output[0] as string)
    : (output as unknown as string);
  if (!outputUrl) throw new Error("Replicate returned no output");

  const resp = await fetch(outputUrl);
  if (!resp.ok) throw new Error(`Replicate output download failed: ${resp.status}`);
  const resultBuf = Buffer.from(await resp.arrayBuffer());

  return sharp(resultBuf)
    .resize(400, 530, { fit: "cover", position: "top" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ── Batch generator with concurrency cap ──────────────────────────────────────
/**
 * Generate all hairstyle previews in parallel (up to MAX_CONCURRENCY at once).
 * Returns array of { index, buffer, style } for successful generations.
 */
export async function replicateHairPreviewBatch(
  selfieBuf: Buffer,
  faceBox: FaceBox,
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

  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, styles.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

