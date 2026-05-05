/**
 * Color swatch preview generation — v2
 *
 * Provider chain (per-slot):
 *   A → prunaai/flux-kontext-fast  (context-aware edit: selfie + prompt, no mask, identity-preserving)
 *   B → lucataco/sdxl-inpainting   (fallback: mask-based inpaint on cropped selfie)
 *
 * All 12 swatches are generated (6 best + 6 avoid).
 * NO text-to-image fallback — any path that does not use the real selfie is
 * excluded because it produces a different person.
 * If both providers fail a slot, it is skipped and the UI falls back to the
 * static color circle built into ColorSwatch.
 */

import Replicate from "replicate";
import type { FaceBox } from "./replicate-hair";

// ── Constants ──────────────────────────────────────────────────────────────────
// Option A — Flux Kontext Fast (pruned BFL Kontext, context-aware image edit)
// Uses latest version tag; no version hash pinning needed for this model.
const FLUX_KONTEXT_MODEL = "prunaai/flux-kontext-fast" as const;

// Option B — SDXL Inpainting (fallback, mask-based)
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

/**
 * Flux Kontext prompt — natural-language edit instruction.
 * Kontext understands context so we describe the edit precisely and
 * explicitly state what must NOT change (face, hair, background).
 */
function buildKontextPrompt(colorName: string, colorHex: string): string {
  const word = hexToColorWord(colorHex);
  return (
    `Change the person's clothing/top to a solid ${word} color (${colorName}, hex ${colorHex}). ` +
    `Keep the person's face, hair, skin tone, facial features, expression, and background ` +
    `completely identical and unchanged. Photorealistic DSLR portrait.`
  );
}

/** SDXL inpainting prompt (Option B fallback — mask-based recolor) */
function buildInpaintPrompt(colorName: string, colorHex: string): string {
  const word = hexToColorWord(colorHex);
  return (
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

// ── Option A: Flux Kontext Fast (selfie + prompt, no mask needed) ──────────────
/**
 * Uses prunaai/flux-kontext-fast — a context-aware image editing model.
 * Input: the user's selfie as a base64 data URI + a natural-language edit prompt.
 * The model natively understands "change the clothing color while preserving
 * the face, hair, and background" — no mask generation is required.
 */
async function tryOptionA(
  selfieBuf: Buffer,
  colorName: string,
  colorHex: string,
  replicateToken: string,
): Promise<Buffer> {
  // Encode selfie as data URI — Replicate accepts base64 data URIs directly
  const imageDataUri = `data:image/jpeg;base64,${selfieBuf.toString("base64")}`;

  const client = getReplicate(replicateToken);
  const output = await client.run(FLUX_KONTEXT_MODEL, {
    input: {
      input_image:   imageDataUri,
      prompt:        buildKontextPrompt(colorName, colorHex),
      aspect_ratio:  "3:4",
      output_format: "webp",
    },
  });

  const url: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
  if (!url) throw new Error("Flux Kontext returned no output URL");

  const resultBuf = await fetchImageBuffer(url);
  return resizeOutput(resultBuf);
}

// ── Option B: Replicate SDXL Inpainting (fallback, mask-based) ────────────────
async function tryOptionB(
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

// ── Per-slot generation — Option A (Flux Kontext) → Option B (SDXL) ───────────
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
 * Attempt to generate one swatch preview.
 * Chain: Option A (Flux Kontext Fast) → Option B (SDXL inpainting fallback).
 * faceBox is only required for Option B; Option A works without it.
 * If both fail, throws — the caller skips the slot and the UI falls back to
 * the static color circle already built into ColorSwatch.
 */
async function generateOneSwatchPreview(
  selfieBuf: Buffer,
  faceBox: FaceBox | null,
  entry: SwatchColorEntry,
  replicateToken: string,
): Promise<SwatchResult> {
  if (!replicateToken) throw new Error("No Replicate token — cannot generate swatch");

  // Option A — Flux Kontext Fast (no mask, identity-preserving)
  try {
    const buf = await tryOptionA(selfieBuf, entry.name, entry.hex, replicateToken);
    console.info(`[swatch-v2] ✓ A slot ${entry.index} "${entry.name}" isBest=${entry.isBest}`);
    return { index: entry.index, buffer: buf, colorName: entry.name, isBest: entry.isBest };
  } catch (errA) {
    console.warn(`[swatch-v2] A failed slot ${entry.index} "${entry.name}":`, (errA as Error).message);
  }

  // Option B — SDXL inpainting (requires faceBox for mask generation)
  if (!faceBox) throw new Error(`No faceBox for Option B slot ${entry.index} "${entry.name}" — skipping`);
  const buf = await tryOptionB(selfieBuf, faceBox, entry.name, entry.hex, replicateToken);
  console.info(`[swatch-v2] ✓ B slot ${entry.index} "${entry.name}" isBest=${entry.isBest}`);
  return { index: entry.index, buffer: buf, colorName: entry.name, isBest: entry.isBest };
}

// ── Public API ─────────────────────────────────────────────────────────────────
/**
 * Generate all 12 color swatch previews (6 best + 6 avoid).
 * Per-slot chain: Option A (Flux Kontext Fast — selfie + prompt, no mask)
 *                 → Option B (SDXL inpainting — mask-based fallback).
 * Returns only successfully generated slots — failed slots are skipped and
 * the UI falls back to static color circles.
 * No text-to-image fallback — that would show a different person.
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
