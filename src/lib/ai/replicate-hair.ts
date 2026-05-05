/**
 * Hairstyle try-on generation — v3 (Flux Kontext Fast)
 *
 * Replaces SDXL inpainting (v2) with prunaai/flux-kontext-fast:
 *   - No mask or faceBox geometry required
 *   - Instruction-based: "restyle hair to [style name]"
 *   - ~30% cheaper per prediction vs SDXL, better face preservation
 */

import Replicate from "replicate";
import sharp from "sharp";

// ── Constants ──────────────────────────────────────────────────────────────────
const FLUX_KONTEXT_MODEL = "prunaai/flux-kontext-fast" as const;
const SELFIE_SEND_SIZE = 640;
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
  if (!_client) _client = new Replicate({ auth: token });
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

// ── Prompt builder ─────────────────────────────────────────────────────────────
function buildPrompt(styleName: string, hairHex: string): string {
  const colour = hexToColourWord(hairHex);
  return (
    `Restyle the hair to ${styleName} while keeping the same ${colour} hair color. ` +
    `The person's face, eyes, nose, lips, skin tone, expression, clothing, and background must remain EXACTLY the same. ` +
    `Only the hair style and shape changes — color and everything else stays identical. ` +
    `Photorealistic beauty portrait, natural studio lighting.`
  );
}

// ── Single preview generator ───────────────────────────────────────────────────
/**
 * Generate one photorealistic hairstyle try-on using Flux Kontext Fast.
 * No mask or faceBox required — the model handles the edit from the prompt.
 * _faceBox param kept for API compatibility with callers; it is unused.
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
    .jpeg({ quality: 80 })
    .toBuffer();

  const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;
  const client = getClient(replicateToken);

  const output = await client.run(FLUX_KONTEXT_MODEL, {
    input: {
      img_cond_path:       imageDataUri,
      prompt:              buildPrompt(styleName, hairHex),
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

// ── Batch generator with concurrency cap ───────────────────────────────────────
/**
 * Generate up to 3 hairstyle previews in parallel.
 * Concurrency capped at MAX_CONCURRENCY to stay under Replicate rate limits.
 * Returns array of { index, buffer, style } for successful generations.
 * faceBox param kept for API compatibility; Flux Kontext does not use it.
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

