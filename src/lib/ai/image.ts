import sharp from "sharp";

/**
 * Resize an image to a max edge length while preserving aspect ratio,
 * re-encoded as JPEG. Used to keep AI requests cheap and fast.
 */
export async function compressForAI(buffer: Buffer, maxEdge = 512): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // honor EXIF orientation
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

export async function toBase64Jpeg(buffer: Buffer): Promise<string> {
  const compressed = await compressForAI(buffer);
  return compressed.toString("base64");
}

// ── Dominant colour extraction ─────────────────────────────────────────────

export interface DominantColorInfo {
  /** Up to 5 dominant colours in the clothing/body region (below face). */
  clothingColors: string[];
  /** 0..1 — fraction of non-face pixels that are non-background (clothing coverage). */
  clothingCoverage: number;
}

/**
 * Extract dominant clothing colours from the lower 60% of the image
 * (the body region, skipping the face at the top).
 *
 * Algorithm:
 *  1. Crop to the bottom 60% of pixels (avoids face & hair)
 *  2. Resize to 32×32 for speed
 *  3. Quantise via sharp's .stats() dominant colour per channel
 *  4. Build k=5 buckets by walking pixel data and rounding RGB to nearest 32
 *
 * Returns hex strings sorted by frequency (most common first).
 */
export async function extractClothingColors(buffer: Buffer): Promise<DominantColorInfo> {
  try {
    const meta = await sharp(buffer).rotate().metadata();
    const width = meta.width ?? 512;
    const height = meta.height ?? 512;

    // Crop bottom 60% (body/clothing region) and skip top 5% of bottom crop (transition zone)
    const cropTop = Math.floor(height * 0.35);
    const cropHeight = Math.floor(height * 0.60);

    const { data, info } = await sharp(buffer)
      .rotate()
      .extract({ left: 0, top: cropTop, width, height: cropHeight })
      .resize(48, 48, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const totalPixels = info.width * info.height;

    // k-means–style bucket: quantise each channel to nearest 32, form RGB bucket key
    const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
    for (let i = 0; i < data.length; i += 3) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;

      // Skip near-white (background walls) and near-black
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma > 230 || luma < 18) continue;

      const key = `${r},${g},${b}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.count++;
      } else {
        buckets.set(key, { r, g, b, count: 1 });
      }
    }

    // Sort by count, take top 5
    const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count).slice(0, 5);

    const clothingColors = sorted.map(({ r, g, b }) => {
      const toHex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    });

    const coloredPixels = sorted.reduce((s, c) => s + c.count, 0);
    const clothingCoverage = Math.min(1, coloredPixels / totalPixels);

    return { clothingColors, clothingCoverage };
  } catch (err) {
    console.warn("[extractClothingColors] failed, skipping:", err);
    return { clothingColors: [], clothingCoverage: 0 };
  }
}

