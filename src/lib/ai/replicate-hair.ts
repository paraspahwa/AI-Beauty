/**
 * Replicate-based hairstyle inpainting
 *
 * Model: stability-ai/stable-diffusion-inpainting
 *   https://replicate.com/stability-ai/stable-diffusion-inpainting
 *
 * Strategy:
 *   1. Crop the selfie to a tight portrait around the face (using Rekognition box)
 *   2. Build a Sharp inpaint mask: WHITE = area to repaint (hair zone + crown),
 *      BLACK = area to keep (face, background below shoulders)
 *   3. Run Replicate inpainting with a style-specific prompt
 *   4. Download the result PNG → convert to JPEG buffer
 *
 * Falls back to the caller's fallback path on any error.
 */

import Replicate from "replicate";
import sharp from "sharp";

// ── Constants ─────────────────────────────────────────────────────────────────
// Inpainting model — pinned to a specific version for reproducibility
// Version: stability-ai/stable-diffusion-inpainting latest public version
const MODEL_VERSION =
  "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3" as const;

// Output size sent to Replicate (must be 512 or 768 for SD inpainting)
const INPAINT_SIZE = 512;

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
 * Build a 512×512 inpaint mask (PNG).
 * WHITE (#fff) = repaint this area (hair zone)
 * BLACK (#000) = preserve this area (face + rest of body)
 *
 * The hair zone is:
 *  - Top: crownY (above Rekognition top, where hair starts)
 *  - Bottom: ~30% down the face height (ear-level, below which we keep the face)
 *  - Horizontally: spans the full face width + 20% padding each side
 */
async function buildInpaintMask(faceBox: FaceBox): Promise<Buffer> {
  // In the cropped+resized INPAINT_SIZE square, we need to remap coords.
  // The crop region is computed in replicateHairPreview (same logic):
  const padX  = faceBox.faceW * 0.45;
  const padY  = faceBox.faceH * 0.55;
  const cropL = Math.max(0, faceBox.left   - padX);
  const cropT = Math.max(0, faceBox.crownY - padY * 0.35);
  const cropR = faceBox.right  + padX;
  const cropB = faceBox.bottom + padY * 0.45;
  const cropW = cropR - cropL;
  const cropH = cropB - cropT;

  // Hair zone in crop-relative coords (before resize to INPAINT_SIZE)
  const hairTop_crop    = 0;                                           // start at top of crop
  const hairBottom_crop = (faceBox.bottom - padY * 0.3) - cropT;     // ~30% below face bottom

  // Map to INPAINT_SIZE
  const scaleY = INPAINT_SIZE / cropH;
  const scaleX = INPAINT_SIZE / cropW;

  const maskTop    = Math.max(0, Math.round(hairTop_crop    * scaleY));
  const maskBottom = Math.min(INPAINT_SIZE, Math.round(hairBottom_crop * scaleY));
  const maskH      = maskBottom - maskTop;

  // Hair zone x: face left → face right with lateral padding
  const faceL_crop = faceBox.left  - padX - cropL;
  const faceR_crop = faceBox.right + padX - cropL;
  const maskLeft   = Math.max(0, Math.round(faceL_crop * scaleX));
  const maskRight  = Math.min(INPAINT_SIZE, Math.round(faceR_crop * scaleX));
  const maskWidth  = maskRight - maskLeft;

  // Start with all-black (preserve everything)
  const base = await sharp({
    create: {
      width: INPAINT_SIZE,
      height: INPAINT_SIZE,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

  // Paint WHITE over the hair zone
  const hairZone = await sharp({
    create: {
      width: maskWidth,
      height: maskH,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();

  return sharp(base)
    .composite([{ input: hairZone, top: maskTop, left: maskLeft }])
    .png()
    .toBuffer();
}

// ── Style → inpainting prompt ─────────────────────────────────────────────────
function buildInpaintPrompt(styleName: string, hairHex: string): string {
  // Convert hex to approximate English colour name for the prompt
  const colourDesc = hexToColourWord(hairHex);
  return (
    `Portrait photo of a person with a ${styleName} hairstyle, ` +
    `${colourDesc} hair color, photorealistic, high-resolution, ` +
    `natural lighting, same face and skin tone, beauty photography, ` +
    `sharp focus, 8k, professional photo shoot`
  );
}

function buildNegativePrompt(): string {
  return (
    "cartoon, painting, illustration, anime, CGI, 3d render, " +
    "bad anatomy, extra hair, bald, wig-like, plastic, " +
    "blurry, low quality, deformed face, ugly, watermark"
  );
}

function hexToColourWord(hex: string): string {
  const h = hex.replace("#", "").toLowerCase();
  if (!h || h.length < 6) return "natural";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  if (brightness > 200) return "blonde";
  if (brightness > 150) return "light brown";
  if (brightness > 100) return "medium brown";
  if (brightness > 60)  return "dark brown";
  if (r > g + 20)       return "auburn";
  return "black";
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Generate a photorealistic hairstyle preview using Replicate inpainting.
 *
 * @param selfieBuf     Raw image buffer (JPEG / PNG)
 * @param faceBox       Rekognition-derived face bounding box in original pixel space
 * @param styleName     e.g. "Long Layered Cut"
 * @param hairHex       Dominant hair hex from AI analysis e.g. "#3B1F0A"
 * @param replicateToken  REPLICATE_API_TOKEN
 * @returns JPEG buffer (400×530) of the composited preview
 */
export async function replicateHairPreview(
  selfieBuf: Buffer,
  faceBox: FaceBox,
  styleName: string,
  hairHex: string,
  replicateToken: string,
): Promise<Buffer> {
  // ── Step 1: crop + resize the selfie to INPAINT_SIZE square ──────────────
  const padX  = faceBox.faceW * 0.45;
  const padY  = faceBox.faceH * 0.55;
  const cropL = Math.max(0, Math.round(faceBox.left   - padX));
  const cropT = Math.max(0, Math.round(faceBox.crownY - padY * 0.35));
  const cropR = Math.round(faceBox.right  + padX);
  const cropB = Math.round(faceBox.bottom + padY * 0.45);
  const cropW = cropR - cropL;
  const cropH = cropB - cropT;

  const croppedPng = await sharp(selfieBuf)
    .rotate()
    .extract({ left: cropL, top: cropT, width: cropW, height: cropH })
    .resize(INPAINT_SIZE, INPAINT_SIZE, { fit: "cover", position: "top" })
    .removeAlpha()
    .png()
    .toBuffer();

  // ── Step 2: build the inpaint mask ────────────────────────────────────────
  const maskPng = await buildInpaintMask(faceBox);

  // ── Step 3: encode both as base64 data-URIs for Replicate ────────────────
  const imageDataUri = `data:image/png;base64,${croppedPng.toString("base64")}`;
  const maskDataUri  = `data:image/png;base64,${maskPng.toString("base64")}`;

  // ── Step 4: run Replicate prediction ─────────────────────────────────────
  const client = getReplicateClient(replicateToken);

  const output = await client.run(
    `stability-ai/stable-diffusion-inpainting:${MODEL_VERSION}`,
    {
      input: {
        image:           imageDataUri,
        mask:            maskDataUri,
        prompt:          buildInpaintPrompt(styleName, hairHex),
        negative_prompt: buildNegativePrompt(),
        num_inference_steps: 30,
        guidance_scale:      7.5,
        strength:            0.85,        // how aggressively to repaint the mask region
        scheduler:           "DPMSolverMultistep",
        seed:                42,          // deterministic per style slot
      },
    },
  );

  // ── Step 5: download the result and convert to JPEG ──────────────────────
  // Replicate returns either a string URL or an array of URLs
  const outputUrl: string = Array.isArray(output)
    ? (output[0] as string)
    : (output as unknown as string);
  if (!outputUrl) throw new Error("Replicate returned no output URL");

  const resp = await fetch(outputUrl);
  if (!resp.ok) throw new Error(`Failed to download Replicate output: ${resp.status}`);
  const resultBuf = Buffer.from(await resp.arrayBuffer());

  // Resize to the standard preview dimensions used by the card UI
  return sharp(resultBuf)
    .resize(400, 530, { fit: "cover", position: "top" })
    .jpeg({ quality: 90 })
    .toBuffer();
}
