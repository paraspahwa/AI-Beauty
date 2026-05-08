/**
 * Hairstyle try-on generation — v5 (flux-kontext-apps/change-haircut)
 *
 * Primary:  flux-kontext-apps/change-haircut
 *   - Purpose-built BFL app for hair style + color changes
 *   - Uses structured enum inputs: haircut, hair_color, gender
 *   - Powered by FLUX.1 Kontext [pro] — best identity preservation
 *
 * Fallback: fofr/become-image (SDXL + IP-Adapter)
 *   - Kicks in automatically if primary fails or times out
 */

import Replicate from "replicate";
import sharp from "sharp";

// ── Constants ──────────────────────────────────────────────────────────────────
/** Primary: BFL's purpose-built hairstyle + hair color app */
const CHANGE_HAIRCUT_MODEL = "flux-kontext-apps/change-haircut" as const;
/** Fallback: SDXL + IP-Adapter face-preserving style transfer */
const BECOME_IMAGE_MODEL   = "fofr/become-image:4af11083a4e2c9dd1b1f18ce37ade3f4d38d21e8d3a62a9c3b7fcf1d8b53db8" as const;
const SELFIE_SEND_SIZE = 768;
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
  // useFileOutput: false → SDK returns plain string URLs instead of FileOutput
  // objects (ReadableStream subclasses). FileOutput objects lack .startsWith()
  // so URL validation and fetch both fail silently without this flag.
  if (!_client) _client = new Replicate({ auth: token, useFileOutput: false });
  return _client;
}

// ── Enum maps ─────────────────────────────────────────────────────────────────
// Supported haircut values for flux-kontext-apps/change-haircut
// Full list: Bob, Pixie Cut, Layered, Messy Bun, High Ponytail, Low Ponytail,
// Braided Ponytail, French Braid, Dutch Braid, Undercut, Mohawk, Crew Cut,
// Slicked Back, Side-Parted, Shag, Lob, Angled Bob, Straight, Wavy, Curly, etc.
const HAIRCUT_ENUM_MAP: Record<string, string> = {
  // straight / wavy / curly texture
  "straight":        "Straight",
  "wavy":            "Wavy",
  "curly":           "Curly",
  "soft waves":      "Soft Waves",
  "glamorous waves": "Glamorous Waves",
  // short styles
  "pixie":           "Pixie Cut",
  "pixie cut":       "Pixie Cut",
  "bob":             "Bob",
  "lob":             "Lob",
  "angled bob":      "Angled Bob",
  "crew cut":        "Crew Cut",
  "undercut":        "Undercut",
  "shag":            "Shag",
  // medium / long
  "layered":         "Layered",
  "feathered":       "Feathered",
  // updos / buns
  "bun":             "Messy Bun",
  "messy bun":       "Messy Bun",
  "top knot":        "Top Knot",
  "chignon":         "Chignon",
  "updo":            "Updo",
  // ponytails
  "ponytail":        "High Ponytail",
  "high ponytail":   "High Ponytail",
  "low ponytail":    "Low Ponytail",
  // braids
  "braid":           "French Braid",
  "braided":         "French Braid",
  "french braid":    "French Braid",
  "dutch braid":     "Dutch Braid",
  "fishtail":        "Fishtail Braid",
  "box braids":      "Box Braids",
  "cornrows":        "Cornrows",
  "dreadlocks":      "Dreadlocks",
  // other
  "mohawk":          "Mohawk",
  "faux hawk":       "Faux Hawk",
};

// Supported hair_color values for flux-kontext-apps/change-haircut
const HAIR_COLOR_ENUM_MAP: Record<string, string> = {
  "blonde":             "Blonde",
  "golden blonde":      "Golden Blonde",
  "honey blonde":       "Honey Blonde",
  "ash blonde":         "Ash Blonde",
  "platinum blonde":    "Platinum Blonde",
  "strawberry blonde":  "Strawberry Blonde",
  "brunette":           "Brunette",
  "black":              "Black",
  "jet black":          "Jet Black",
  "blue-black":         "Blue-Black",
  "dark brown":         "Dark Brown",
  "medium brown":       "Medium Brown",
  "light brown":        "Light Brown",
  "ash brown":          "Ash Brown",
  "chestnut":           "Chestnut",
  "caramel":            "Caramel",
  "auburn":             "Auburn",
  "copper":             "Copper",
  "red":                "Red",
  "mahogany":           "Mahogany",
  "burgundy":           "Burgundy",
  "silver":             "Silver",
  "white":              "White",
  "titanium":           "Titanium",
  "rose gold":          "Rose Gold",
  "blue":               "Blue",
  "purple":             "Purple",
  "pink":               "Pink",
  "green":              "Green",
};

/**
 * Map a free-text style name to a supported haircut enum value.
 * Falls back to "No change" if no match found.
 */
function mapToHaircutEnum(styleName: string): string {
  const key = styleName.toLowerCase().trim();
  return HAIRCUT_ENUM_MAP[key] ?? "No change";
}

/**
 * Map a free-text color name to a supported hair_color enum value.
 * Falls back to "No change" if no match found.
 */
function mapToHairColorEnum(colorName: string): string {
  const key = colorName.toLowerCase().trim();
  // Direct match
  if (HAIR_COLOR_ENUM_MAP[key]) return HAIR_COLOR_ENUM_MAP[key];
  // Partial match — e.g. "warm auburn" → "Auburn"
  for (const [k, v] of Object.entries(HAIR_COLOR_ENUM_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return "No change";
}

/** Kept for fallback prompt — free-text description of the colour */
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

// ── Prompt builder (fallback only) ───────────────────────────────────────────
function buildPromptFallback(styleName: string, hairHex: string): string {
  const colour = hexToColourWord(hairHex);
  return (
    `A photorealistic portrait with ${styleName} hairstyle in ${colour} color. ` +
    `Studio lighting, natural skin, sharp facial features.`
  );
}

// ── Single preview generator ───────────────────────────────────────────────────
/**
 * Generate one photorealistic hairstyle try-on.
 *
 * Strategy:
 *  1. Try flux-kontext-apps/change-haircut (purpose-built app, structured enum inputs)
 *  2. On failure → fallback to fofr/become-image (IP-Adapter style transfer)
 *
 * _faceBox param kept for API compatibility with callers; it is unused here.
 */
export async function replicateHairPreview(
  selfieBuf: Buffer,
  _faceBox: FaceBox | null,
  styleName: string,
  hairHex: string,
  replicateToken: string,
  hairColorName?: string,   // optional explicit color name (preferred over hex mapping)
  gender?: "none" | "male" | "female",
): Promise<Buffer> {
  const smallBuf = await sharp(selfieBuf)
    .rotate()
    .resize(SELFIE_SEND_SIZE, SELFIE_SEND_SIZE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const imageDataUri = `data:image/jpeg;base64,${smallBuf.toString("base64")}`;
  const client = getClient(replicateToken);

  // Map free-text names to the model's supported enum values
  const haircutEnum   = mapToHaircutEnum(styleName);
  const hairColorEnum = hairColorName
    ? mapToHairColorEnum(hairColorName)
    : "No change";

  console.info(
    `[replicate-hair] "${styleName}" → haircut="${haircutEnum}" | ` +
    `color="${hairColorName ?? "(none)"}" → "${hairColorEnum}"`
  );

  // ── Option 1: flux-kontext-apps/change-haircut ──────────────────────────
  let url: string | null = null;
  try {
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
    if (raw?.startsWith("https://")) url = raw;
    else console.warn(`[replicate-hair] change-haircut unexpected URL, falling back`);
  } catch (err) {
    console.warn(`[replicate-hair] change-haircut failed (${(err as Error).message}), trying fallback`);
  }

  // ── Option 2: fofr/become-image (IP-Adapter fallback) ───────────────────
  if (!url) {
    try {
      const output = await client.run(BECOME_IMAGE_MODEL, {
        input: {
          image:            imageDataUri,
          prompt:           buildPromptFallback(styleName, hairHex),
          image_strength:   0.55,
          denoising_start:  0.45,
          output_format:    "jpg",
          output_quality:   90,
          negative_prompt:  "deformed face, disfigured, cartoon, painting, low quality, blurry",
        },
      });
      const raw: string = Array.isArray(output) ? (output[0] as string) : (output as unknown as string);
      if (raw?.startsWith("https://")) {
        url = raw;
        console.info(`[replicate-hair] used fallback model for "${styleName}"`);
      }
    } catch (err) {
      console.warn(`[replicate-hair] fallback also failed: ${(err as Error).message}`);
    }
  }

  if (!url) throw new Error(`Both models failed for style "${styleName}"`);

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
 * Generate up to 5 hairstyle previews (dual-model: pro + fallback per slot).
 * Concurrency capped at MAX_CONCURRENCY to stay within Replicate rate limits.
 * Returns array of { index, buffer, style } for successful generations.
 */
export async function replicateHairPreviewBatch(
  selfieBuf: Buffer,
  faceBox: FaceBox | null,
  styles: { index: number; name: string }[],
  hairHex: string,
  replicateToken: string,
  hairColorName?: string,
  gender?: "none" | "male" | "female",
): Promise<{ index: number; buffer: Buffer; style: string }[]> {
  const results: { index: number; buffer: Buffer; style: string }[] = [];
  const queue = [...styles];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        const buf = await replicateHairPreview(
          selfieBuf, faceBox, item.name, hairHex, replicateToken, hairColorName, gender,
        );
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

