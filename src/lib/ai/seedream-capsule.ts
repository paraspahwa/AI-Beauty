/**
 * Capsule hero image generation — SeedDream 4.5 (paid users only)
 *
 * Generates a single editorial flat-lay mood board image for the wardrobe
 * capsule. Only called when the user has a paid report; free users see
 * the text-only capsule.
 *
 * $0.03 per capsule generation (regenerates every 30 days max).
 */

import Replicate from "replicate";
import type { GeneratedCapsule } from "@/app/api/capsule/generate/route";

const SEEDREAM_MODEL = "bytedance/seedream-4.5" as const;

let _client: Replicate | null = null;
function getClient(token: string): Replicate {
  if (!_client) _client = new Replicate({ auth: token, useFileOutput: false });
  return _client;
}

function buildPrompt(capsule: GeneratedCapsule): string {
  const topItems = capsule.items
    .slice(0, 6)
    .map((i) => i.name)
    .join(", ");

  const topColors = capsule.items
    .slice(0, 5)
    .map((i) => i.name.toLowerCase())
    .join(", ");

  return (
    `Minimalist editorial fashion flat lay. A curated wardrobe capsule for ${capsule.season} color season ` +
    `with ${capsule.undertone} undertone. Featuring neatly arranged garments: ${topItems}. ` +
    `Color palette: ${topColors}. ` +
    `Perfectly folded and styled on a clean white or off-white surface. ` +
    `Soft natural studio lighting, gentle shadows. Small accessories — gold or silver jewelry pieces, ` +
    `a silk scarf — arranged alongside. ` +
    `High-end fashion magazine editorial photography. No people. No faces. No text. No logos. ` +
    `4K resolution, crisp product photography, luxury aesthetic.`
  );
}

async function fetchBuffer(url: string): Promise<Buffer> {
  if (!url.startsWith("https://")) {
    throw new Error(`Unexpected Replicate output URL: ${url.slice(0, 80)}`);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Generate a hero flat-lay image for a paid user's wardrobe capsule.
 *
 * @returns JPEG Buffer at 900×600, or null if generation fails (capsule still returns without image).
 */
export async function generateCapsuleHeroImage(
  capsule: GeneratedCapsule,
  replicateToken: string,
): Promise<Buffer | null> {
  try {
    const replicate = getClient(replicateToken);
    const prompt = buildPrompt(capsule);

    const output = await replicate.run(SEEDREAM_MODEL, {
      input: {
        prompt,
        size: "2K",
        aspect_ratio: "3:2",
        enhance_prompt: false,
        sequential_image_generation: "disabled",
        max_images: 1,
      },
    });

    const urls = Array.isArray(output) ? output : [output];
    const rawUrl = typeof urls[0] === "string" ? urls[0] : null;
    if (!rawUrl) {
      console.warn("[seedream-capsule] no output URL returned");
      return null;
    }

    const rawBuf = await fetchBuffer(rawUrl);

    const sharp = (await import("sharp")).default;
    return sharp(rawBuf)
      .resize(900, 600, { fit: "cover", position: "centre" })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch (err) {
    console.warn("[seedream-capsule] generation failed, capsule returned without hero image:", (err as Error).message);
    return null;
  }
}
