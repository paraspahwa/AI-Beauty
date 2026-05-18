import path from "path";

const LOGO_PATH = path.join(process.cwd(), "public", "web-app-manifest-192x192.png");
const LOGO_SIZE = 60;  // px — visible but not intrusive
const PADDING   = 14;  // px from bottom-right edges

/**
 * Composite the Renovaara logo into the bottom-right corner of an image buffer.
 * Input and output are both JPEG buffers.
 */
export async function applyLogoWatermark(imageBuf: Buffer): Promise<Buffer> {
  const { default: sharp } = await import("sharp");

  const logoBuf = await sharp(LOGO_PATH)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: "contain" })
    .png()
    .toBuffer();

  const { width = 640, height = 640 } = await sharp(imageBuf).metadata();

  return sharp(imageBuf)
    .composite([{
      input: logoBuf,
      top:  Math.max(0, height - LOGO_SIZE - PADDING),
      left: Math.max(0, width  - LOGO_SIZE - PADDING),
    }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
