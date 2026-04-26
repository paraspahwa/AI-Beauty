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
