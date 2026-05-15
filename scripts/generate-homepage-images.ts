#!/usr/bin/env npx ts-node --esm
/**
 * scripts/generate-homepage-images.ts
 *
 * One-time script that generates before/after showcase images for the
 * homepage via SeedDream 4.5 on Replicate.
 *
 * Generates: sample-3-before.jpg, sample-3-after.jpg,
 *            sample-4-before.jpg, sample-4-after.jpg
 *
 * Run:
 *   REPLICATE_API_TOKEN=r8_... npx ts-node --esm scripts/generate-homepage-images.ts
 *
 * Cost: 4 images × $0.03 = $0.12 total (one-time)
 *
 * After running, commit the generated images in public/samples/.
 */

import Replicate from "replicate";
import * as fs from "fs";
import * as path from "path";

const MODEL = "bytedance/seedream-4.5" as const;
const OUTPUT_DIR = path.join(process.cwd(), "public", "samples");

// ── Pair definitions ──────────────────────────────────────────────────────────
interface ImageSpec {
  filename: string;
  prompt: string;
}

const PAIRS: ImageSpec[] = [
  // ── Pair 3: Wardrobe and frame polish / Style uplift ─────────────────────
  {
    filename: "sample-3-before.jpg",
    prompt:
      "Portrait photo of a young South Asian woman, mid-20s. Plain casual outfit: a faded grey t-shirt and basic jeans in mismatched colors. Minimal styling. Natural indoor lighting. Slightly tired look. Realistic, warm tones, friendly smile. Headshot-style photo. No makeup, hair loose and unstyled. Plain background.",
  },
  {
    filename: "sample-3-after.jpg",
    prompt:
      "Portrait photo of a young South Asian woman, mid-20s. Polished outfit: a fitted terracotta blouse with elegant gold-frame cat-eye glasses that complement her warm skin tone. Hair neatly styled. Warm autumn colors — terracotta, olive, cream. Soft studio lighting. Confident, radiant expression. High-end editorial fashion photography. Same person, completely transformed look.",
  },

  // ── Pair 4: Skin finish and glow / Routine-led progress ──────────────────
  {
    filename: "sample-4-before.jpg",
    prompt:
      "Portrait photo of a young South Asian woman, late 20s. Dull, uneven skin tone. Dry patches visible on cheeks and forehead. No skincare. Slight redness around nose. Flat lighting. Bare face. Hair pulled back casually. Tired look. Natural, unretouched photo. Realistic skin texture. Neutral plain background.",
  },
  {
    filename: "sample-4-after.jpg",
    prompt:
      "Portrait photo of a young South Asian woman, late 20s. Glowing, healthy, luminous skin. Even skin tone with a natural dewy finish. Hydrated and radiant complexion. Light natural makeup: tinted moisturizer, subtle blush. Hair soft and glossy. Warm natural light. Fresh, confident, healthy expression. High-end beauty photography, editorial quality. Same person, visible skincare transformation.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  return Buffer.from(await res.arrayBuffer());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.error("Error: REPLICATE_API_TOKEN env var is required.");
    console.error("Run: REPLICATE_API_TOKEN=r8_... npx ts-node --esm scripts/generate-homepage-images.ts");
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const replicate = new Replicate({ auth: token, useFileOutput: false });

  console.log(`Generating ${PAIRS.length} images via SeedDream 4.5...`);
  console.log(`Estimated cost: $${(PAIRS.length * 0.03).toFixed(2)}\n`);

  let successCount = 0;

  for (const spec of PAIRS) {
    const outPath = path.join(OUTPUT_DIR, spec.filename);

    // Skip if already generated
    if (fs.existsSync(outPath)) {
      console.log(`  ✓ ${spec.filename} already exists — skipping`);
      successCount++;
      continue;
    }

    console.log(`  → Generating ${spec.filename}...`);

    try {
      const output = await replicate.run(MODEL, {
        input: {
          prompt: spec.prompt,
          size: "2K",
          aspect_ratio: "3:4",   // portrait — matches card aspect ratio
          enhance_prompt: false,
          sequential_image_generation: "disabled",
          max_images: 1,
        },
      });

      const urls = Array.isArray(output) ? output : [output];
      const rawUrl = typeof urls[0] === "string" ? urls[0] : null;

      if (!rawUrl) {
        console.error(`  ✗ ${spec.filename}: no URL returned from Replicate`);
        continue;
      }

      const buffer = await downloadBuffer(rawUrl);
      fs.writeFileSync(outPath, buffer);
      console.log(`  ✓ ${spec.filename} saved (${(buffer.length / 1024).toFixed(0)} KB)`);
      successCount++;

      // Brief pause between requests to avoid rate limiting
      await sleep(1000);
    } catch (err) {
      console.error(`  ✗ ${spec.filename} failed:`, (err as Error).message);
    }
  }

  console.log(`\nDone: ${successCount}/${PAIRS.length} images generated.`);

  if (successCount === PAIRS.length) {
    console.log("\nNext step: update src/content/home-content.json pairs 3 and 4:");
    console.log('  "beforeFile": "sample-3-before.jpg"');
    console.log('  "afterFile": "sample-3-after.jpg"');
    console.log('  "beforeFile": "sample-4-before.jpg"');
    console.log('  "afterFile": "sample-4-after.jpg"');
    console.log("\nThen commit: git add public/samples/ src/content/home-content.json");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
