/**
 * Color swatch preview generation — v2
 *
 * Single provider: prunaai/flux-kontext-fast
 *   - Input: user selfie (base64) + natural-language edit prompt
 *   - Context-aware image editing — no mask, no faceBox required
 *   - Identity-preserving by design (face/hair/background unchanged)
 *
 * All 12 swatches are generated (6 best + 6 avoid).
 * If generation fails for a slot, it is skipped — the UI falls back to the
 * static color circle built into ColorSwatch.
 */

import Replicate from "replicate";

// ── Constants ──────────────────────────────────────────────────────────────────
const FLUX_KONTEXT_MODEL = "prunaai/flux-kontext-fast" as const;

const OUTPUT_W = 400;
const OUTPUT_H = 530;
const MAX_CONCURRENCY = 12;

// Selfie is resized to this before sending — smaller payload = faster upload
// and faster model processing. 640px is sufficient for clothing color preview.
const SELFIE_SEND_SIZE = 640;

// ── Replicate singleton ────────────────────────────────────────────────────────
let _replicate: Replicate | null = null;
function getReplicate(token: string): Replicate {
  // useFileOutput: false → SDK returns plain string URLs instead of FileOutput
  // objects (ReadableStream subclasses). FileOutput objects don't have
  // .startsWith() so the URL validation and fetch both break silently.
  if (!_replicate) _replicate = new Replicate({ auth: token, useFileOutput: false });
  return _replicate;
}

// ── Prompt builder ─────────────────────────────────────────────────────────────
function buildKontextPrompt(colorName: string, colorHex: string): string {
  return (
    `Recolor ONLY the clothing and garment fabric in this photo to the color "${colorName}" (hex ${colorHex}). ` +
    `STRICT RULES — the following must remain pixel-perfect identical to the original:\n` +
    `• SKIN: every pixel of skin — face, forehead, nose, eyes, lips, chin, jaw, neck, collarbone, ` +
    `shoulders, arms, hands, and any other body skin — must NOT change color at all.\n` +
    `• HAIR: color, texture, style, and sheen of hair must remain exactly as in the original.\n` +
    `• BACKGROUND: walls, floor, furniture, objects, and environment must remain exactly as in the original.\n` +
    `• GARMENT STRUCTURE: the silhouette, cut, neckline, collar, sleeves, buttons, pockets, and ` +
    `all structural details of the clothing must remain identical — only the fabric color changes.\n` +
    `Think of this as applying professional fabric dye: the dye penetrates only textile fibers and ` +
    `cannot touch skin, hair, or any non-fabric surface. ` +
    `Apply the color "${colorName}" exclusively to the clothing/garment fabric.`
  );
}

// ── Download URL → Buffer ──────────────────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (!url.startsWith("https://")) {
    throw new Error(`Unexpected output URL from Replicate: ${url.slice(0, 60)}`);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Resize output ──────────────────────────────────────────────────────────────
async function resizeOutput(buf: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buf)
  .resize(OUTPUT_W, OUTPUT_H, { fit: "cover", position: "top" })
  .jpeg({ quality: 92 })
  .toBuffer();
}

// ── Flux Kontext Fast ──────────────────────────────────────────────────────────
async function runFluxKontext(
  selfieBuf: Buffer,
  colorName: string,
  colorHex: string,
  replicateToken: string,
): Promise<Buffer> {
  // Downscale selfie to SELFIE_SEND_SIZE before encoding — reduces base64
  // payload size and model processing time significantly.
  const sharp = (await import("sharp")).default;
  const smallBuf = await sharp(selfieBuf)
  .rotate()
  .resize(SELFIE_SEND_SIZE, SELFIE_SEND_SIZE, { fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 80 })
  .toBuffer();

  const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;

  const client = getReplicate(replicateToken);
  const output = await client.run(FLUX_KONTEXT_MODEL, {
  input: {
    img_cond_path:       imageDataUri,
    prompt:              buildKontextPrompt(colorName, colorHex),
    output_format:       "jpg",
    output_quality:      80,
    // Smallest output size — 512px is plenty for a 400×530 preview card
    image_size:          512,
    // Minimum steps — 4 is the floor for flux-based models; lower = faster but less detail
    num_inference_steps: 4,
  },
  });

  const url: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
  if (!url) throw new Error("Flux Kontext returned no output URL");

  const resultBuf = await fetchImageBuffer(url);
  return resizeOutput(resultBuf);
}

// ── Types ──────────────────────────────────────────────────────────────────────
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

// ── Public API ─────────────────────────────────────────────────────────────────
/**
 * Generate a single color swatch preview for one slot.
 * Used by POST /visuals/colors?slot=N — each call is its own Vercel invocation
 * so we never risk hitting the 60 s function timeout.
 */
export async function runSingleColorSwatch(
  selfieBuf: Buffer,
  colorName: string,
  colorHex: string,
  replicateToken: string,
): Promise<Buffer> {
  if (!replicateToken) throw new Error("No Replicate token");
  return runFluxKontext(selfieBuf, colorName, colorHex, replicateToken);
}

/**
 * Generate color swatch previews using prunaai/flux-kontext-fast.
 * Indices 0-5  = bestColors[0-5]  (isBest: true)
 * Indices 6-11 = avoidColors[0-5] (isBest: false)
 * @deprecated Prefer calling runSingleColorSwatch per slot to avoid Vercel timeouts.
 */
export async function generateAllColorSwatchPreviews(
  selfieBuf: Buffer,
  bestColors: { name: string; hex: string }[],
  avoidColors: { name: string; hex: string }[],
  _rekognitionFace: unknown,   // unused — Flux Kontext needs no face data
  replicateToken: string,
  skipSlots: Set<number> = new Set(), // already-ready slot indices to skip
): Promise<SwatchResult[]> {
  if (!replicateToken) {
  console.error("[swatch-v2] No Replicate token — skipping all slots");
  return [];
  }

  const jobs: SwatchColorEntry[] = [
  ...bestColors.slice(0, 6).map((c, i) => ({ index: i,     name: c.name, hex: c.hex, isBest: true  })),
  ...avoidColors.slice(0, 6).map((c, i) => ({ index: i + 6, name: c.name, hex: c.hex, isBest: false })),
  ].filter((job) => !skipSlots.has(job.index)); // skip already-ready slots

  const results: SwatchResult[] = [];
  const queue = [...jobs];

  async function worker() {
  while (queue.length > 0) {
    const job = queue.shift();
    if (!job) break;
    try {
    const buffer = await runFluxKontext(selfieBuf, job.name, job.hex, replicateToken);
    console.info(`[swatch-v2] ✓ slot ${job.index} "${job.name}" isBest=${job.isBest}`);
    results.push({ index: job.index, buffer, colorName: job.name, isBest: job.isBest });
    } catch (err) {
    console.warn(`[swatch-v2] ✗ slot ${job.index} "${job.name}" skipped:`, (err as Error).message);
    }
  }
  }

  await Promise.all(
  Array.from({ length: Math.min(MAX_CONCURRENCY, jobs.length) }, () => worker()),
  );

  return results;
}
