/**
 * Makeup try-on generation — Flux Kontext Pro
 *
 * Generates 4 photorealistic makeup looks for a user's selfie, each look
 * derived from one of their seasonal palette colors applied as:
 *   Look 0 — everyday (natural lip + subtle blush)
 *   Look 1 — bold lip   (statement lip color, groomed brows)
 *   Look 2 — eye focus  (complementary eyeshadow + mascara)
 *   Look 3 — full glam  (all-over: lip + eye + blush + highlight)
 *
 * The palette hex values come from the color season result so every look
 * is guaranteed to be flattering for that user's season.
 *
 * Model: black-forest-labs/flux-kontext-pro
 *   - Instruction-based editing; no mask or segmentation needed
 *   - Preserves face identity, skin tone, hair, clothing, and background
 *   - ~8-12 s per image on Replicate
 */

import Replicate from "replicate";
import sharp from "sharp";
import { MAKEUP_LOOKS, type MakeupLook } from "@/lib/makeup-looks";
export type { MakeupLook } from "@/lib/makeup-looks";
export { MAKEUP_LOOKS };

// ── Constants ─────────────────────────────────────────────────────────────────
const FLUX_KONTEXT_MODEL = "black-forest-labs/flux-kontext-pro" as const;
const SELFIE_SEND_SIZE   = 768;   // px — larger than glasses/hair to preserve face detail
const OUTPUT_W           = 400;
const OUTPUT_H           = 530;
const MAX_CONCURRENCY    = 2;     // conservative: makeup calls are heavier than glasses

// ── Replicate singleton ───────────────────────────────────────────────────────
let _client: Replicate | null = null;
function getClient(token: string): Replicate {
  if (!_client) _client = new Replicate({ auth: token, useFileOutput: false });
  return _client;
}

// ── Prompt builder ────────────────────────────────────────────────────────────
/**
 * Build a flux-kontext-pro makeup prompt for a specific look.
 *
 * @param look    - which makeup look (0-3)
 * @param lipHex  - hex color for lip product (from season palette)
 * @param eyeHex  - hex color for eye product (from season palette)
 * @param blushHex - hex color for blush (from season palette)
 */
function buildPrompt(
  look: MakeupLook,
  lipHex: string,
  eyeHex: string,
  blushHex: string,
): string {
  const PRESERVE =
    "The person's face shape, skin tone, facial features, hair, clothing, background, and " +
    "lighting must remain EXACTLY the same. Only makeup is added — nothing else changes. " +
    "Photorealistic, editorial quality, natural lighting.";

  switch (look.index) {
    case 0:
      return (
        `Apply a natural everyday makeup look: a sheer lip tint in ${lipHex}, soft blush in ${blushHex} ` +
        `on the cheeks, light foundation smoothing, and a coat of mascara. ` +
        `Keep it fresh and effortless — no heavy contouring. ${PRESERVE}`
      );
    case 1:
      return (
        `Apply a bold lip look: a saturated, precisely applied lip color in ${lipHex} with a clean edge. ` +
        `Add groomed, defined brows and a thin coat of mascara. Keep eye makeup minimal — no eyeshadow. ` +
        `Blush in ${blushHex} on the cheeks. ${PRESERVE}`
      );
    case 2:
      return (
        `Apply a smoky eye makeup look: blend ${eyeHex} eyeshadow on the lids with a deeper shade in the ` +
        `crease and a lighter highlight on the brow bone. Add black eyeliner on the upper lash line and ` +
        `dramatic mascara. Keep lips nude or barely-there. Soft blush in ${blushHex}. ${PRESERVE}`
      );
    case 3:
      return (
        `Apply a full glam makeup look: bold lip color in ${lipHex}, ${eyeHex} eyeshadow blended on the ` +
        `lids with shimmer highlight on the brow bone and inner corner. Precise black eyeliner, false-lash ` +
        `effect mascara. Sculpted blush and highlight in ${blushHex} on cheekbones. Full-coverage foundation ` +
        `with a dewy finish. ${PRESERVE}`
      );
    default:
      return `Apply makeup with color ${lipHex}. ${PRESERVE}`;
  }
}

// ── Single look generator ─────────────────────────────────────────────────────
export async function replicateMakeupPreview(
  selfieBuf: Buffer,
  look: MakeupLook,
  lipHex: string,
  eyeHex: string,
  blushHex: string,
  replicateToken: string,
): Promise<Buffer> {
  const smallBuf = await sharp(selfieBuf)
    .rotate()
    .resize(SELFIE_SEND_SIZE, SELFIE_SEND_SIZE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;
  const client = getClient(replicateToken);
  const prompt = buildPrompt(look, lipHex, eyeHex, blushHex);

  const output = await client.run(FLUX_KONTEXT_MODEL, {
    input: {
      input_image:      imageDataUri,
      prompt,
      output_format:    "jpg",
      output_quality:   92,
      aspect_ratio:     "match_input_image",
      safety_tolerance: 2,
    },
  });

  const url: string = Array.isArray(output)
    ? (output[0] as string)
    : (output as unknown as string);
  if (!url) throw new Error("Flux Kontext returned no output URL");
  if (!url.startsWith("https://")) {
    throw new Error(`Unexpected output URL from Replicate: ${url.slice(0, 60)}`);
  }

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const resultBuf = Buffer.from(await resp.arrayBuffer());

  return sharp(resultBuf)
    .resize(OUTPUT_W, OUTPUT_H, { fit: "cover", position: "top" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ── Batch generator ───────────────────────────────────────────────────────────
/**
 * Generate up to 4 makeup looks concurrently (capped at MAX_CONCURRENCY).
 * Palette colors are picked from the user's seasonal palette:
 *   lip   → palette[0] (most flattering)
 *   eye   → palette[1] or palette[0] fallback
 *   blush → palette[2] or palette[0] fallback
 *
 * @param selfieBuf        - raw selfie image buffer
 * @param palette          - seasonal best-color palette entries [{name, hex}]
 * @param replicateToken   - Replicate API token
 * @param indicesToGenerate - optional: only generate specific look indices
 */
export async function replicateMakeupPreviewBatch(
  selfieBuf: Buffer,
  palette: { name: string; hex: string }[],
  replicateToken: string,
  indicesToGenerate?: number[],
): Promise<{ index: number; buffer: Buffer; label: string }[]> {
  const lipHex   = palette[0]?.hex ?? "#B03060";
  const eyeHex   = palette[1]?.hex ?? palette[0]?.hex ?? "#6B4A3E";
  const blushHex = palette[2]?.hex ?? palette[0]?.hex ?? "#E8A898";

  const looksToRun = MAKEUP_LOOKS.filter(
    (l) => !indicesToGenerate || indicesToGenerate.includes(l.index),
  );

  const results: { index: number; buffer: Buffer; label: string }[] = [];
  const queue = [...looksToRun];

  async function worker() {
    while (queue.length > 0) {
      const look = queue.shift();
      if (!look) break;
      try {
        const buf = await replicateMakeupPreview(
          selfieBuf, look, lipHex, eyeHex, blushHex, replicateToken,
        );
        results.push({ index: look.index, buffer: buf, label: look.label });
        console.info(`[replicate-makeup] ✓ slot ${look.index} "${look.label}"`);
      } catch (err) {
        console.warn(
          `[replicate-makeup] ✗ slot ${look.index} "${look.label}":`,
          (err as Error).message,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENCY, looksToRun.length) }, () => worker()),
  );
  return results;
}
