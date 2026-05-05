/**
 * Glasses try-on generation — v2 (Flux Kontext Fast)
 *
 * Replaces SDXL inpainting (v1) with prunaai/flux-kontext-fast:
 *   - No mask or faceBox geometry required
 *   - Instruction-based: "add [style] glasses" to the selfie
 *   - ~30% cheaper per prediction vs SDXL, better identity preservation
 */

import Replicate from "replicate";
import sharp from "sharp";
import type { FaceBox } from "./replicate-hair";

// ── Constants ──────────────────────────────────────────────────────────────────
const FLUX_KONTEXT_MODEL = "prunaai/flux-kontext-fast" as const;
const SELFIE_SEND_SIZE = 640;
const OUTPUT_W = 400;
const OUTPUT_H = 530;
const MAX_CONCURRENCY = 3;

// ── Replicate client (lazy singleton) ─────────────────────────────────────────
let _client: Replicate | null = null;
function getClient(token: string): Replicate {
  if (!_client) _client = new Replicate({ auth: token });
  return _client;
}

// ── Style → frame description map ─────────────────────────────────────────────
const STYLE_MAP: Record<string, string> = {
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

function buildPrompt(styleName: string): string {
  const lower = styleName.toLowerCase();
  const desc  = Object.entries(STYLE_MAP).find(([k]) => lower.includes(k))?.[1]
    ?? `${styleName} style glasses`;
  return (
    `Add ${desc} to the person — the glasses should sit naturally at eye level on the face. ` +
    `The person's face, skin tone, eyes, nose, lips, hair, clothing, and background must remain EXACTLY the same. ` +
    `Only the glasses are added — nothing else changes. Photorealistic, natural lighting.`
  );
}

// ── Single preview generator ───────────────────────────────────────────────────
/**
 * Generate one photorealistic glasses try-on using Flux Kontext Fast.
 * No mask or faceBox required — the model handles placement from the prompt.
 * _faceBox param kept for API compatibility with callers; it is unused.
 */
export async function replicateGlassesPreview(
  selfieBuf: Buffer,
  _faceBox: FaceBox | null,
  styleName: string,
  replicateToken: string,
): Promise<Buffer> {
  const smallBuf = await sharp(selfieBuf)
    .rotate()
    .resize(SELFIE_SEND_SIZE, SELFIE_SEND_SIZE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;
  const client = getClient(replicateToken);

  const output = await client.run(FLUX_KONTEXT_MODEL, {
    input: {
      img_cond_path:       imageDataUri,
      prompt:              buildPrompt(styleName),
      output_format:       "jpg",
      output_quality:      85,
      image_size:          512,
      num_inference_steps: 4,
    },
  });

  const url: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
  if (!url) throw new Error("Flux Kontext returned no output URL");

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const resultBuf = Buffer.from(await resp.arrayBuffer());

  return sharp(resultBuf)
    .resize(OUTPUT_W, OUTPUT_H, { fit: "cover", position: "top" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ── Batch generator ────────────────────────────────────────────────────────────
/**
 * Generate up to 3 glasses try-on previews in parallel.
 * Concurrency capped at MAX_CONCURRENCY to stay under Replicate rate limits.
 * Returns array of { index, buffer, style } for successful slots only.
 * faceBox param kept for API compatibility; Flux Kontext does not use it.
 */
export async function replicateGlassesPreviewBatch(
  selfieBuf: Buffer,
  faceBox: FaceBox | null,
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
        const buf = await replicateGlassesPreview(selfieBuf, faceBox, item.name, replicateToken);
        results.push({ index: item.index, buffer: buf, style: item.name });
        console.info(`[replicate-glasses] ✓ slot ${item.index} "${item.name}"`);
      } catch (err) {
        console.warn(`[replicate-glasses] ✗ slot ${item.index} "${item.name}":`, (err as Error).message);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, styles.length) }, () => worker()));
  return results;
}
