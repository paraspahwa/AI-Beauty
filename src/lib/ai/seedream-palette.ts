/**
 * AI Palette Board generation — SeedDream 4.5 (paid users only)
 *
 * Replaces the programmatic SVG palette board with an editorial-quality
 * AI-generated mood board image. Only called when the report is_paid=true;
 * free users fall back to the Sharp-rendered SVG in visuals.ts.
 *
 * Model: bytedance/seedream-4.5 (Replicate)
 *   - Text-to-image, up to 4K, strong prompt adherence
 *   - $0.03 per output image — only incurred for paid reports
 *   - ~14s generation time
 *
 * Output: 1200×800 JPEG matching the SVG palette board dimensions.
 */

import Replicate from "replicate";
import type { ColorAnalysisResult } from "@/types/report";

const SEEDREAM_MODEL = "bytedance/seedream-4.5" as const;

// Singleton Replicate client
let _client: Replicate | null = null;
function getClient(token: string): Replicate {
  if (!_client) _client = new Replicate({ auth: token, useFileOutput: false });
  return _client;
}

/**
 * Build a descriptive mood board prompt from the palette colors and season.
 */
function buildMoodBoardPrompt(analysis: ColorAnalysisResult): string {
  const topColors = analysis.palette
    .slice(0, 6)
    .map((c) => c.name)
    .join(", ");

  const season = analysis.season ?? "seasonal";
  const undertone = analysis.undertone ?? "neutral";

  return (
    `Editorial fashion mood board for ${season} color season with ${undertone} undertone. ` +
    `A beautifully arranged flat lay featuring fabric swatches, color chips, and fashion accessories ` +
    `in the following palette: ${topColors}. ` +
    `Soft natural studio lighting. Minimal white background with elegant composition. ` +
    `Magazine editorial style. No text, no labels, no typography. ` +
    `High-end fashion photography, 4K, professional product photography.`
  );
}

/**
 * Download a Replicate output URL to a Buffer.
 */
async function fetchBuffer(url: string): Promise<Buffer> {
  if (!url.startsWith("https://")) {
    throw new Error(`Unexpected Replicate output URL: ${url.slice(0, 80)}`);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Generate an AI mood board image for a paid user's palette.
 *
 * @returns JPEG buffer at 1200×800, or null if generation fails (caller falls back to SVG).
 */
export async function generateAIPaletteBoard(
  analysis: ColorAnalysisResult,
  replicateToken: string,
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  try {
    const replicate = getClient(replicateToken);
    const prompt = buildMoodBoardPrompt(analysis);

    const output = await replicate.run(SEEDREAM_MODEL, {
      input: {
        prompt,
        size: "2K",
        aspect_ratio: "3:2",
        enhance_prompt: false, // we've crafted a detailed prompt already
        sequential_image_generation: "disabled",
        max_images: 1,
      },
    });

    // Output is an array of URLs (useFileOutput: false)
    const urls = Array.isArray(output) ? output : [output];
    const rawUrl = typeof urls[0] === "string" ? urls[0] : null;
    if (!rawUrl) {
      console.warn("[seedream-palette] no output URL returned");
      return null;
    }

    const rawBuf = await fetchBuffer(rawUrl);

    // Resize to match the SVG palette board dimensions (1200×800)
    const sharp = (await import("sharp")).default;
    const buffer = await sharp(rawBuf)
      .resize(1200, 800, { fit: "cover", position: "centre" })
      .jpeg({ quality: 90 })
      .toBuffer();

    return { buffer, width: 1200, height: 800 };
  } catch (err) {
    console.warn("[seedream-palette] generation failed, caller will use SVG fallback:", (err as Error).message);
    return null;
  }
}
