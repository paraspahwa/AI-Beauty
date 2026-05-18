/**
 * Hairstyle try-on generation - v6 (fal-ai/image-apps-v2/hair-change)
 *
 * Primary:  fal-ai/image-apps-v2/hair-change
 *   - Purpose-built FAL specialised app for hair style + color changes
 *   - Structured inputs: image_url, hair_style, hair_color
 *   - $0.04/image - requires FAL_KEY env var
 *
 * Fallback 1: flux-kontext-apps/change-haircut (Replicate BFL app)
 *   - Purpose-built BFL app, structured enum inputs: haircut, hair_color, gender
 *   - Kicks in when FAL_KEY is absent or the FAL call fails
 *
 * Fallback 2: fofr/become-image (SDXL + IP-Adapter)
 *   - Last resort if both primary and fallback 1 fail
 *
 * Tier gate: only called for paid reports. Free reports skip visual generation
 * entirely in trigger-visuals/route.ts; images are generated after payment.
 */

import Replicate from "replicate";
import sharp from "sharp";

// -- Constants -----------------------------------------------------------------
const FAL_HAIR_MODEL       = "fal-ai/image-apps-v2/hair-change" as const;
const CHANGE_HAIRCUT_MODEL = "flux-kontext-apps/change-haircut" as const;
// Last-resort fallback: SDXL + IP-Adapter identity model (unpinned — use latest published version)
const BECOME_IMAGE_MODEL   = "fofr/become-image" as const;
const SELFIE_SEND_SIZE = 768;
const OUTPUT_W = 400;
const OUTPUT_H = 530;
const MAX_CONCURRENCY = 2;

// -- Types ---------------------------------------------------------------------
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

interface FalHairOutput {
  data?: { images?: { url?: string }[] };
  image?: { url?: string };
  images?: { url?: string }[];
  url?: string;
}

// -- Replicate client (lazy singleton) ----------------------------------------
let _client: Replicate | null = null;
function getClient(token: string): Replicate {
  if (!_client) _client = new Replicate({ auth: token, useFileOutput: false });
  return _client;
}

// -- Enum maps -----------------------------------------------------------------
const HAIRCUT_ENUM_MAP: Record<string, string> = {
  "straight":        "Straight",
  "wavy":            "Wavy",
  "curly":           "Curly",
  "soft waves":      "Soft Waves",
  "glamorous waves": "Glamorous Waves",
  "pixie":           "Pixie Cut",
  "pixie cut":       "Pixie Cut",
  "bob":             "Bob",
  "lob":             "Lob",
  "angled bob":      "Angled Bob",
  "crew cut":        "Crew Cut",
  "undercut":        "Undercut",
  "shag":            "Shag",
  "layered":         "Layered",
  "feathered":       "Feathered",
  "bun":             "Messy Bun",
  "messy bun":       "Messy Bun",
  "top knot":        "Top Knot",
  "chignon":         "Chignon",
  "updo":            "Updo",
  "ponytail":        "High Ponytail",
  "high ponytail":   "High Ponytail",
  "low ponytail":    "Low Ponytail",
  "braid":           "French Braid",
  "braided":         "French Braid",
  "french braid":    "French Braid",
  "dutch braid":     "Dutch Braid",
  "fishtail":        "Fishtail Braid",
  "box braids":      "Box Braids",
  "cornrows":        "Cornrows",
  "dreadlocks":      "Dreadlocks",
  "mohawk":          "Mohawk",
  "faux hawk":       "Faux Hawk",
};

// FAL's exact hair_color enum values (from ImageAppsV2HairChangeInput)
type FalHairColor =
  | "blonde" | "black" | "auburn" | "red" | "silver"
  | "blue" | "purple" | "pink" | "green"
  | "dark_brown" | "light_brown" | "platinum_blonde"
  | "gray" | "rainbow" | "natural" | "highlights" | "ombre" | "balayage";

const HAIR_COLOR_ENUM_MAP: Record<string, FalHairColor> = {
  // blondes
  "blonde":             "blonde",
  "golden blonde":      "blonde",
  "honey blonde":       "blonde",
  "ash blonde":         "blonde",
  "strawberry blonde":  "blonde",
  "platinum blonde":    "platinum_blonde",
  // browns
  "brunette":           "dark_brown",
  "dark brown":         "dark_brown",
  "medium brown":       "dark_brown",
  "light brown":        "light_brown",
  "ash brown":          "light_brown",
  "chestnut":           "dark_brown",
  "caramel":            "light_brown",
  // reds/auburns
  "auburn":             "auburn",
  "copper":             "auburn",
  "red":                "red",
  "mahogany":           "auburn",
  "burgundy":           "auburn",
  // blacks
  "black":              "black",
  "jet black":          "black",
  "blue-black":         "black",
  // other
  "silver":             "silver",
  "gray":               "gray",
  "grey":               "gray",
  "white":              "platinum_blonde",
  "titanium":           "gray",
  "rose gold":          "balayage",
  "blue":               "blue",
  "purple":             "purple",
  "pink":               "pink",
  "green":              "green",
  "rainbow":            "rainbow",
  "highlights":         "highlights",
  "ombre":              "ombre",
  "balayage":           "balayage",
  "natural":            "natural",
};

function mapToHaircutEnum(styleName: string): string {
  const key = styleName.toLowerCase().trim();
  return HAIRCUT_ENUM_MAP[key] ?? "No change";
}

function mapToHairColorEnum(colorName: string): FalHairColor | "No change" {
  const key = colorName.toLowerCase().trim();
  if (HAIR_COLOR_ENUM_MAP[key]) return HAIR_COLOR_ENUM_MAP[key];
  for (const [k, v] of Object.entries(HAIR_COLOR_ENUM_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return "No change";
}

function hexToColourWord(hex: string): string {
  const h = hex.replace("#", "").toLowerCase();
  if (!h || h.length < 6) return "natural brown";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const isReddish  = r > g + 25 && r > b + 20;
  if (brightness > 200) return "golden blonde";
  if (brightness > 165) return "light honey brown";
  if (brightness > 130) return "medium chestnut brown";
  if (brightness > 90)  return isReddish ? "warm auburn" : "dark brown";
  if (brightness > 50)  return "very dark brown";
  return "black";
}

function buildPromptFallback(styleName: string, hairHex: string): string {
  const colour = hexToColourWord(hairHex);
  return (
    `A photorealistic portrait with ${styleName} hairstyle in ${colour} color. ` +
    `Studio lighting, natural skin, sharp facial features.`
  );
}

// -- Single preview generator --------------------------------------------------
/**
 * Generate one photorealistic hairstyle try-on.
 *
 * 1. fal-ai/image-apps-v2/hair-change  (primary, when falApiKey provided)
 * 2. flux-kontext-apps/change-haircut  (fallback 1, Replicate)
 * 3. fofr/become-image                 (fallback 2, last resort)
 *
 * Only called for paid reports — tier gate in trigger-visuals/route.ts.
 * _faceBox is kept for API compatibility with callers; unused by any model.
 */
export async function replicateHairPreview(
  selfieBuf: Buffer,
  _faceBox: FaceBox | null,
  styleName: string,
  hairHex: string,
  replicateToken: string,
  hairColorName?: string,
  gender?: "none" | "male" | "female",
  falApiKey?: string,
): Promise<Buffer> {
  const smallBuf = await sharp(selfieBuf)
    .rotate()
    .resize(SELFIE_SEND_SIZE, SELFIE_SEND_SIZE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;

  const haircutEnum   = mapToHaircutEnum(styleName);
  const hairColorEnum = hairColorName ? mapToHairColorEnum(hairColorName) : "No change";

  console.info(
    `[hair] "${styleName}" => hair_style="${haircutEnum}" | ` +
    `color="${hairColorName ?? "(none)"}" => "${hairColorEnum}"`,
  );

  let url: string | null = null;

  // Option 1: fal-ai/image-apps-v2/hair-change (primary) ---------------------
  if (falApiKey) {
    try {
      const { createFalClient } = await import("@fal-ai/client");
      const fal = createFalClient({ credentials: falApiKey });
      const falInput: Record<string, unknown> = { image_url: imageDataUri };
      if (haircutEnum   !== "No change") falInput["hair_style"] = haircutEnum;
      if (hairColorEnum !== "No change") falInput["hair_color"] = hairColorEnum;
      // @ts-expect-error -- cast required to pass dynamic Record into strict generic RunOptions
      const result = await fal.run(FAL_HAIR_MODEL, { input: falInput }) as FalHairOutput;
      const raw = result?.data?.images?.[0]?.url ?? result?.image?.url ?? result?.images?.[0]?.url ?? result?.url;
      if (raw?.startsWith("https://")) {
        url = raw;
        console.info(`[hair] fal primary OK for "${styleName}"`);
      } else {
        console.warn(`[hair] fal returned unexpected output, falling back`);
      }
    } catch (err) {
      console.warn(`[hair] fal failed (${(err as Error).message}), falling back to Replicate`);
    }
  }

  // Option 2: flux-kontext-apps/change-haircut (Replicate fallback 1) ---------
  if (!url) {
    try {
      const client = getClient(replicateToken);
      const output = await client.run(CHANGE_HAIRCUT_MODEL, {
        input: {
          input_image:      imageDataUri,
          haircut:          haircutEnum,
          hair_color:       hairColorEnum,
          gender:           gender ?? "none",
          aspect_ratio:     "match_input_image",
          output_format:    "jpg",
          safety_tolerance: 2,
        },
      });
      const raw: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
      if (raw?.startsWith("https://")) {
        url = raw;
        console.info(`[hair] Replicate change-haircut OK for "${styleName}"`);
      } else {
        console.warn(`[hair] change-haircut unexpected URL, trying last-resort`);
      }
    } catch (err) {
      console.warn(`[hair] change-haircut failed (${(err as Error).message}), trying last-resort`);
    }
  }

  // Option 3: fofr/become-image (last resort) ----------------------------------
  if (!url) {
    try {
      const client = getClient(replicateToken);
      const output = await client.run(BECOME_IMAGE_MODEL, {
        input: {
          image:           imageDataUri,
          prompt:          buildPromptFallback(styleName, hairHex),
          image_strength:  0.55,
          denoising_start: 0.45,
          output_format:   "jpg",
          output_quality:  90,
          negative_prompt: "deformed face, disfigured, cartoon, painting, low quality, blurry",
        },
      });
      const raw: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
      if (raw?.startsWith("https://")) {
        url = raw;
        console.info(`[hair] become-image last-resort OK for "${styleName}"`);
      }
    } catch (err) {
      console.warn(`[hair] become-image also failed: ${(err as Error).message}`);
    }
  }

  if (!url) throw new Error(`All models failed for style "${styleName}"`);

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  const resultBuf = Buffer.from(await resp.arrayBuffer());

  return sharp(resultBuf)
    .resize(OUTPUT_W, OUTPUT_H, { fit: "cover", position: "top" })
    .jpeg({ quality: 92 })
    .toBuffer();
}

// -- Batch generator with concurrency cap -------------------------------------
/**
 * Generate up to 5 hairstyle previews.
 * Paid tier:   fal-ai/image-apps-v2/hair-change → change-haircut → become-image.
 * Free tier:   flux-kontext-schnell (fast, cheap; falls back to paid pipeline on error).
 */
export async function replicateHairPreviewBatch(
  selfieBuf: Buffer,
  faceBox: FaceBox | null,
  styles: { index: number; name: string }[],
  hairHex: string,
  replicateToken: string,
  hairColorName?: string,
  gender?: "none" | "male" | "female",
  falApiKey?: string,
): Promise<{ index: number; buffer: Buffer; style: string }[]> {
  const results: { index: number; buffer: Buffer; style: string }[] = [];
  const queue = [...styles];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        const buf = await replicateHairPreview(
          selfieBuf, faceBox, item.name, hairHex, replicateToken, hairColorName, gender, falApiKey,
        );
        results.push({ index: item.index, buffer: buf, style: item.name });
        console.info(`[hair] slot ${item.index} "${item.name}" done`);
      } catch (err) {
        console.warn(`[hair] slot ${item.index} "${item.name}" failed:`, (err as Error).message);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, styles.length) }, () => worker()));
  return results;
}