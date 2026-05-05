/**
 * Color swatch preview generation — v2
 *
 * Provider chain (per-slot):
 *   A → Replicate lucataco/sdxl-inpainting  (photorealistic face-preserving inpaint)
 *   B → Replicate black-forest-labs/flux-schnell  (fast text-to-image, no Sharp needed)
 *   C → OpenAI DALL-E 3  (last resort text-to-image)
 *
 * All 12 swatches are generated (6 best + 6 avoid).
 * NO Sharp fallback — if all three providers fail a slot, that slot is skipped.
 *
 * This module is Sharp-free in the generation path.
 * Cropping/resizing before sending to Replicate A still uses Sharp via a
 * thin helper that is isolated to the inpaint path only.
 */

import Replicate from "replicate";
import type { FaceBox } from "./replicate-hair";

// ── Constants ──────────────────────────────────────────────────────────────────
const SDXL_INPAINT_MODEL =
  "lucataco/sdxl-inpainting:a5b13068cc81a89a4fbeefecf6d6fc5e529a5ecc6bde3f97867ef36429a56a69" as const;

const INPAINT_SIZE = 1024;
const OUTPUT_W = 400;
const OUTPUT_H = 530;
// Generate at most N slots in parallel to avoid overwhelming the provider
const MAX_CONCURRENCY = 3;

// ── Replicate singleton ────────────────────────────────────────────────────────
let _replicate: Replicate | null = null;
function getReplicate(token: string): Replicate {
  if (!_replicate) _replicate = new Replicate({ auth: token });
  return _replicate;
}

// ── Color word helper (shared with prompt builder) ────────────────────────────
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

// ── Prompt builders ────────────────────────────────────────────────────────────
function buildInpaintPrompt(colorName: string, colorHex: string): string {
  const word = hexToColorWord(colorHex);
  return (
    // Keep prompt laser-focused on RECOLOR only — verbose generation prompts
    // push strength up and cause face/background drift at low strength values.
    `${word} ${colorName} solid colored fabric, clothing recolor only, ` +
    `same person same face same background same lighting, ` +
    `photorealistic, DSLR, high resolution`
  );
}

function buildInpaintNegative(): string {
  return (
    "new person, different face, altered face, changed skin tone, changed background, " +
    "changed lighting, color bleed onto face or hair or skin, " +
    "cartoon, painting, anime, CGI, 3d render, illustration, " +
    "blurry, low quality, deformed, bad anatomy, watermark, " +
    "pattern, print, stripes, graphic, logo, text, buttons, collar change"
  );
}

// ── Download URL → Buffer ──────────────────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Resize via Sharp (only used in Option A crop/prepare step) ─────────────────
async function cropAndResizeForInpaint(
  selfieBuf: Buffer,
  faceBox: FaceBox,
): Promise<{ croppedPng: Buffer; cropL: number; cropT: number; cropW: number; cropH: number }> {
  // Lazy import so Sharp is only loaded when Option A is actually attempted
  const sharp = (await import("sharp")).default;

  const img  = sharp(selfieBuf).rotate();
  const meta = await img.metadata();
  const W    = meta.width  ?? 512;
  const H    = meta.height ?? 768;

  const padX   = faceBox.faceW * 0.55;
  const padTop = faceBox.faceH * 0.50;
  const padBot = faceBox.faceH * 1.20;

  const cropL = Math.max(0, Math.round(faceBox.left  - padX));
  const cropT = Math.max(0, Math.round(faceBox.top   - padTop));
  const cropR = Math.min(W, Math.round(faceBox.right + padX));
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

  return { croppedPng, cropL, cropT, cropW, cropH };
}

async function buildClothingMask(
  faceBox: FaceBox,
  cropL: number,
  cropT: number,
  cropW: number,
  cropH: number,
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;

  const scaleX = INPAINT_SIZE / cropW;
  const scaleY = INPAINT_SIZE / cropH;

  const faceLeft_s   = Math.max(0, Math.round((faceBox.left   - cropL) * scaleX));
  const faceTop_s    = Math.max(0, Math.round((faceBox.top    - cropT) * scaleY));
  const faceRight_s  = Math.min(INPAINT_SIZE, Math.round((faceBox.right  - cropL) * scaleX));
  const faceBottom_s = Math.min(INPAINT_SIZE, Math.round((faceBox.bottom - cropT) * scaleY));
  const faceCx_s     = Math.round((faceBox.cx - cropL) * scaleX);
  const faceCy_s     = Math.round(((faceBox.top + faceBox.bottom) / 2 - cropT) * scaleY);
  // 1.45× wider oval — protects forehead, jaw, and neck from the inpainter.
  // At low strength (0.35) even pixels outside the white mask region can shift
  // slightly; a generous black ellipse prevents any face-area touch.
  const faceRx_s     = Math.round(((faceRight_s - faceLeft_s) / 2) * 1.45);
  const faceRy_s     = Math.round(((faceBottom_s - faceTop_s) / 2) * 1.45);

  const torsoTop    = Math.min(INPAINT_SIZE, faceBottom_s + Math.round(faceRy_s * 0.25));
  const torsoBottom = Math.round(INPAINT_SIZE * 0.92);
  const torsoLeft   = Math.round(INPAINT_SIZE * 0.06);
  const torsoRight  = Math.round(INPAINT_SIZE * 0.94);

  const svg = `<svg width="${INPAINT_SIZE}" height="${INPAINT_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${INPAINT_SIZE}" height="${INPAINT_SIZE}" fill="black"/>
    <rect x="${torsoLeft}" y="${torsoTop}" width="${torsoRight - torsoLeft}" height="${torsoBottom - torsoTop}" rx="18" fill="white"/>
    <ellipse cx="${faceCx_s}" cy="${faceCy_s}" rx="${faceRx_s}" ry="${faceRy_s}" fill="black"/>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function resizeOutput(buf: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buf)
    .resize(OUTPUT_W, OUTPUT_H, { fit: "cover", position: "top" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ── Option A: Replicate SDXL Inpainting ───────────────────────────────────────
async function tryOptionA(
  selfieBuf: Buffer,
  faceBox: FaceBox,
  colorName: string,
  colorHex: string,
  replicateToken: string,
): Promise<Buffer> {
  const { croppedPng, cropL, cropT, cropW, cropH } = await cropAndResizeForInpaint(selfieBuf, faceBox);
  const maskPng = await buildClothingMask(faceBox, cropL, cropT, cropW, cropH);

  const imageDataUri = `data:image/png;base64,${croppedPng.toString("base64")}`;
  const maskDataUri  = `data:image/png;base64,${maskPng.toString("base64")}`;

  const client = getReplicate(replicateToken);
  const output = await client.run(SDXL_INPAINT_MODEL, {
    input: {
      image:               imageDataUri,
      mask:                maskDataUri,
      prompt:              buildInpaintPrompt(colorName, colorHex),
      negative_prompt:     buildInpaintNegative(),
      // ── Tuned for recolor-only fidelity ──────────────────────────────────
      // strength 0.35 → just enough to recolor fabric; face/bg stay identical
      // guidance 5.0  → lower adherence = less hallucination outside mask
      // steps 40      → more diffusion steps at low strength = cleaner edges
      // DDIM          → best scheduler for faithful low-strength inpainting
      num_inference_steps: 40,
      guidance_scale:      5.0,
      strength:            0.35,
      scheduler:           "DDIM",
      seed:                Math.floor(Math.random() * 9999999),
    },
  });

  const url: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
  if (!url) throw new Error("Replicate SDXL returned no output URL");

  const resultBuf = await fetchImageBuffer(url);
  return resizeOutput(resultBuf);
}

// ── Per-slot generation — Option A only (SDXL inpainting on real selfie) ──────
export interface SwatchColorEntry {
  index: number;
  name: string;
  hex: string;
  isBest: boolean;
}

export interface SwatchResult {
  index: number;
  buffer: Buffer;
  colorName: string;
  isBest: boolean;
}

/**
 * Attempt to generate one swatch preview via SDXL inpainting on the user's
 * real selfie. Requires a valid faceBox from Rekognition.
 * If it fails, throws — the caller skips the slot and the UI falls back to
 * the static color circle already built into ColorSwatch.
 * Options B and C (text-to-image without selfie) are intentionally removed:
 * they produced a completely different person, which is worse than no image.
 */
async function generateOneSwatchPreview(
  selfieBuf: Buffer,
  faceBox: FaceBox | null,
  entry: SwatchColorEntry,
  replicateToken: string,
): Promise<SwatchResult> {
  if (!replicateToken) throw new Error("No Replicate token — cannot generate swatch");
  if (!faceBox) throw new Error(`No faceBox for slot ${entry.index} "${entry.name}" — skipping`);

  const buf = await tryOptionA(selfieBuf, faceBox, entry.name, entry.hex, replicateToken);
  console.info(`[swatch-v2] ✓ slot ${entry.index} "${entry.name}" isBest=${entry.isBest}`);
  return { index: entry.index, buffer: buf, colorName: entry.name, isBest: entry.isBest };
}

// ── Public API ─────────────────────────────────────────────────────────────────
/**
 * Generate all 12 color swatch previews (6 best + 6 avoid) using SDXL
 * inpainting on the user's real selfie. Returns only successfully generated
 * slots — failed slots are skipped and the UI falls back to static color
 * circles. No text-to-image fallback — that would show a different person.
 */
export async function generateAllColorSwatchPreviews(
  selfieBuf: Buffer,
  bestColors: { name: string; hex: string }[],
  avoidColors: { name: string; hex: string }[],
  rekognitionFace: unknown,
  replicateToken: string,
): Promise<SwatchResult[]> {
  const jobs: SwatchColorEntry[] = [
    ...bestColors.slice(0, 6).map((c, i) => ({ index: i,     name: c.name, hex: c.hex, isBest: true })),
    ...avoidColors.slice(0, 6).map((c, i) => ({ index: i + 6, name: c.name, hex: c.hex, isBest: false })),
  ];

  // Resolve faceBox from Rekognition data
  let faceBox: import("./replicate-hair").FaceBox | null = null;
  try {
    const { getFaceBox } = await import("./visuals");
    const sharp = (await import("sharp")).default;
    const meta  = await sharp(selfieBuf).rotate().metadata();
    faceBox = getFaceBox(rekognitionFace, meta.width ?? 512, meta.height ?? 768);
  } catch (err) {
    console.warn("[swatch-v2] Could not resolve faceBox:", (err as Error).message);
  }

  if (!faceBox) {
    console.warn("[swatch-v2] No faceBox available — all slots will be skipped (UI shows static circles)");
    return [];
  }

  const results: SwatchResult[] = [];
  const queue  = [...jobs];

  async function worker() {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) break;
      try {
        const result = await generateOneSwatchPreview(selfieBuf, faceBox, job, replicateToken);
        results.push(result);
      } catch (err) {
        console.warn(`[swatch-v2] slot ${job.index} "${job.name}" skipped:`, (err as Error).message);
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENCY, jobs.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
