import { env } from "@/lib/env";
import { fetchRemoteImageBuffer } from "@/lib/security/remote-image";

const GPT_IMAGE_EDIT_MODEL = "openai/gpt-image-2/edit" as const;

export type GptImageEditQuality = "low" | "medium" | "high";

/** Portrait infographic output — 4:5-ish, within FAL pixel limits. */
export const INFOGRAPHIC_IMAGE_SIZE = { width: 1024, height: 1536 } as const;

export type GptImageEditResult = {
  buffer: Buffer;
  mime: "image/png" | "image/jpeg";
};

/**
 * Run OpenAI GPT Image 2 edit via fal.ai on a selfie buffer.
 * @see https://fal.ai/models/openai/gpt-image-2/edit
 */
export async function generateGptImageEdit(opts: {
  prompt: string;
  imageBuffer: Buffer;
  quality?: GptImageEditQuality;
  imageSize?: { width: number; height: number } | "auto";
  outputFormat?: "png" | "jpeg";
}): Promise<GptImageEditResult> {
  if (!env.fal.isConfigured) {
    throw new Error("FAL_KEY is not configured — cannot generate infographics");
  }

  const outputFormat = opts.outputFormat ?? "png";
  const { default: sharp } = await import("sharp");
  const jpegBuf = await sharp(opts.imageBuffer)
    .rotate()
    .resize(1536, 1536, { fit: "inside", withoutEnlargement: false })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  const imageDataUri = `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;

  const { createFalClient } = await import("@fal-ai/client");
  const fal = createFalClient({ credentials: env.fal.apiKey });

  const result = await fal.subscribe(GPT_IMAGE_EDIT_MODEL, {
    input: {
      prompt: opts.prompt,
      image_urls: [imageDataUri],
      image_size: opts.imageSize ?? INFOGRAPHIC_IMAGE_SIZE,
      quality: opts.quality ?? "high",
      output_format: outputFormat,
      num_images: 1,
    },
    logs: false,
  }) as { data?: { images?: { url?: string }[] } };

  const url = result?.data?.images?.[0]?.url;
  if (!url?.startsWith("https://")) {
    throw new Error("GPT Image 2 edit returned no image URL");
  }

  const buffer = await fetchRemoteImageBuffer(url, { timeoutMs: 90_000, maxBytes: 20 * 1024 * 1024 });
  return {
    buffer,
    mime: outputFormat === "jpeg" ? "image/jpeg" : "image/png",
  };
}
