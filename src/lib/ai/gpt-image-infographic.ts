import { env } from "@/lib/env";
import { fetchRemoteImageBuffer } from "@/lib/security/remote-image";

const GPT_IMAGE_EDIT_MODEL = "openai/gpt-image-2/edit" as const;

export type GptImageEditQuality = "low" | "medium" | "high";

/**
 * Run OpenAI GPT Image 2 edit via fal.ai on a selfie buffer.
 * @see https://fal.ai/models/openai/gpt-image-2/edit
 */
export async function generateGptImageEdit(opts: {
  prompt: string;
  imageBuffer: Buffer;
  quality?: GptImageEditQuality;
}): Promise<Buffer> {
  if (!env.fal.isConfigured) {
    throw new Error("FAL_KEY is not configured — cannot generate infographics");
  }

  const { default: sharp } = await import("sharp");
  const jpegBuf = await sharp(opts.imageBuffer)
    .rotate()
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const imageDataUri = `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;

  const { createFalClient } = await import("@fal-ai/client");
  const fal = createFalClient({ credentials: env.fal.apiKey });

  const result = await fal.subscribe(GPT_IMAGE_EDIT_MODEL, {
    input: {
      prompt: opts.prompt,
      image_urls: [imageDataUri],
      image_size: "auto",
      quality: opts.quality ?? "medium",
      output_format: "jpeg",
    },
    logs: false,
  }) as { data?: { images?: { url?: string }[] } };

  const url = result?.data?.images?.[0]?.url;
  if (!url?.startsWith("https://")) {
    throw new Error("GPT Image 2 edit returned no image URL");
  }

  return fetchRemoteImageBuffer(url, { timeoutMs: 90_000, maxBytes: 15 * 1024 * 1024 });
}
