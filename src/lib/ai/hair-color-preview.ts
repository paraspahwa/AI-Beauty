import type { HairstyleResult } from "@/types/report";
import { env } from "@/lib/env";
import { replicateHairPreview } from "@/lib/ai/replicate-hair";

/**
 * Generate photorealistic hair-color previews for recommended shades.
 * Uses the top recommended style with each palette color applied.
 */
export async function generateHairColorPreviews(
  selfieBuf: Buffer,
  hairstyle: HairstyleResult,
  gender?: "none" | "male" | "female",
  indicesToGenerate?: number[],
): Promise<{ index: number; buffer: Buffer; colorName: string }[]> {
  if (!env.fal.isConfigured && !env.replicate.isConfigured) {
    console.warn("[visuals] Neither FAL nor Replicate configured — hair color previews skipped");
    return [];
  }

  const colors = hairstyle.colors.slice(0, 5);
  const styleName = hairstyle.styles[0]?.name ?? "Soft layered cut";
  const token = env.replicate.apiToken;
  const falKey = env.fal.isConfigured ? env.fal.apiKey : undefined;

  const targets = colors
    .map((c, index) => ({ index, color: c }))
    .filter((t) => !indicesToGenerate || indicesToGenerate.includes(t.index));

  const results: { index: number; buffer: Buffer; colorName: string }[] = [];

  for (const { index, color } of targets) {
    try {
      const buffer = await replicateHairPreview(
        selfieBuf,
        null,
        styleName,
        color.hex,
        token,
        color.name,
        gender,
        falKey,
      );
      results.push({ index, buffer, colorName: color.name });
    } catch (err) {
      console.warn(`[visuals] hair color preview failed for "${color.name}":`, (err as Error).message);
    }
  }

  return results;
}
