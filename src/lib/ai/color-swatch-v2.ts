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
const MAX_CONCURRENCY = 6;

// Selfie is resized to this before sending — smaller payload = faster upload
// and faster model processing. 640px is sufficient for clothing color preview.
const SELFIE_SEND_SIZE = 640;

// ── Replicate singleton ────────────────────────────────────────────────────────
let _replicate: Replicate | null = null;
function getReplicate(token: string): Replicate {
  if (!_replicate) _replicate = new Replicate({ auth: token });
  return _replicate;
}

// ── Color word helper ──────────────────────────────────────────────────────────
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

// ── Prompt builder ─────────────────────────────────────────────────────────────
function buildKontextPrompt(colorName: string, colorHex: string): string {
  const word = hexToColorWord(colorHex);
  return (
	`Recolor ONLY the fabric of the existing clothing to solid ${word} (${colorName}, hex ${colorHex}). ` +
	`The dress/garment shape, neckline, cut, collar, sleeves, buttons, and all fabric details must remain IDENTICAL. ` +
	`The person's face, eyes, nose, lips, skin tone, hair, and expression must remain IDENTICAL. ` +
	`The background must remain IDENTICAL. ` +
	`This is a fabric dye operation — ONLY the color of the cloth changes, nothing else in the image.`
  );
}

// ── Download URL → Buffer ──────────────────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
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
	  img_cond_path:      imageDataUri,
	  prompt:             buildKontextPrompt(colorName, colorHex),
	  output_format:      "jpg",
	  output_quality:     80,
	  // Smallest output size — 512px is plenty for a 400×530 preview card
	  image_size:         512,
	  // Minimum steps for "Extra Juiced" speed mode — model is already fast
	  num_inference_steps: 20,
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
 * Generate all 12 color swatch previews (6 best + 6 avoid) using
 * prunaai/flux-kontext-fast. Requires only the selfie buffer and a Replicate
 * token — no faceBox or mask needed.
 * Returns only successfully generated slots; failed slots are skipped and
 * the UI falls back to static color circles.
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
	...bestColors.slice(0, 6).map((c, i) => ({ index: i,      name: c.name, hex: c.hex, isBest: true  })),
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
