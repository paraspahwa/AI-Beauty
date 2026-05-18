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

// ── Hex → human-readable makeup color descriptor ──────────────────────────────
/**
 * Converts a hex color to a natural-language descriptor for diffusion models.
 * Diffusion models are trained on natural language, not hex notation — raw hex
 * like "#B03060" is poorly understood. Describing it as "deep raspberry-rose"
 * produces far more accurate color rendering in the output image.
 */
function hexToMakeupColor(hex: string): string {
  const h = hex.replace("#", "").toLowerCase();
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 510;  // 0–1
  const saturation = max === min ? 0 : (max - min) / (lightness < 0.5 ? max + min : 510 - max - min);

  // Neutral / low saturation
  if (saturation < 0.12) {
    if (lightness > 0.85) return `soft ivory-nude (${hex})`;
    if (lightness > 0.65) return `warm taupe-nude (${hex})`;
    if (lightness > 0.40) return `cool mauve-nude (${hex})`;
    if (lightness > 0.20) return `deep espresso (${hex})`;
    return `near-black deep tone (${hex})`;
  }

  // Hue-based naming (hue in degrees)
  const delta = max - min;
  let hue = 0;
  if (max === r) hue = 60 * (((g - b) / delta + 6) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);

  const sat = saturation;
  const lit = lightness;

  if (hue < 15 || hue >= 345)   return lit > 0.6 ? `light coral-rose (${hex})` : sat > 0.6 ? `true red (${hex})` : `deep burgundy (${hex})`;
  if (hue < 30)                  return lit > 0.6 ? `warm peach-coral (${hex})` : sat > 0.5 ? `terracotta (${hex})` : `burnt sienna (${hex})`;
  if (hue < 50)                  return lit > 0.7 ? `golden champagne (${hex})` : sat > 0.5 ? `warm amber (${hex})` : `caramel-bronze (${hex})`;
  if (hue < 75)                  return `olive-gold (${hex})`;
  if (hue < 150)                 return `sage-green (${hex})`;
  if (hue < 195)                 return lit > 0.7 ? `soft aqua (${hex})` : `teal (${hex})`;
  if (hue < 255)                 return lit > 0.7 ? `soft periwinkle (${hex})` : sat > 0.5 ? `vivid cobalt (${hex})` : `dusty navy (${hex})`;
  if (hue < 285)                 return lit > 0.7 ? `lavender (${hex})` : `deep violet (${hex})`;
  if (hue < 315)                 return lit > 0.7 ? `light orchid (${hex})` : sat > 0.5 ? `bold magenta (${hex})` : `plum (${hex})`;
  return lit > 0.7 ? `rosy pink (${hex})` : sat > 0.5 ? `deep raspberry-rose (${hex})` : `mauve-berry (${hex})`;
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
        `Apply a natural everyday makeup look: a sheer lip tint in ${hexToMakeupColor(lipHex)}, soft blush in ${hexToMakeupColor(blushHex)} ` +
        `on the cheeks, light foundation smoothing, and a coat of mascara. ` +
        `Keep it fresh and effortless — no heavy contouring. ${PRESERVE}`
      );
    case 1:
      return (
        `Apply a bold lip look: a saturated, precisely applied lip color in ${hexToMakeupColor(lipHex)} with a clean edge. ` +
        `Add groomed, defined brows and a thin coat of mascara. Keep eye makeup minimal — no eyeshadow. ` +
        `Blush in ${hexToMakeupColor(blushHex)} on the cheeks. ${PRESERVE}`
      );
    case 2:
      return (
        `Apply a smoky eye makeup look: blend ${hexToMakeupColor(eyeHex)} eyeshadow on the lids with a deeper shade in the ` +
        `crease and a lighter highlight on the brow bone. Add black eyeliner on the upper lash line and ` +
        `dramatic mascara. Keep lips nude or barely-there. Soft blush in ${hexToMakeupColor(blushHex)}. ${PRESERVE}`
      );
    case 3:
      return (
        `Apply a full glam makeup look: bold lip color in ${hexToMakeupColor(lipHex)}, ${hexToMakeupColor(eyeHex)} eyeshadow blended on the ` +
        `lids with shimmer highlight on the brow bone and inner corner. Precise black eyeliner, false-lash ` +
        `effect mascara. Sculpted blush and highlight in ${hexToMakeupColor(blushHex)} on cheekbones. Full-coverage foundation ` +
        `with a dewy finish. ${PRESERVE}`
      );
    default:
      return `Apply makeup with color ${hexToMakeupColor(lipHex)}. ${PRESERVE}`;
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
      // 0.25 MP: output is 400×530 (0.21MP) — no quality loss, ~75% cost saving vs 1MP default
      megapixels:       "0.25",
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
