/**
 * Prompt canary / A-B variant system.
 *
 * Usage:
 *   const variant = pickVariant("face_shape");
 *   // use variant.prompt in the pipeline stage
 *   // the variant.id is stored in pipeline_meta.stages[].variantId for log correlation
 *
 * Adding a new experiment:
 *   1. Add a new entry to VARIANTS below.
 *   2. Set its weight relative to other variants for the same stage.
 *   3. Monitor Vercel logs filtering on [canary] lines.
 *
 * Variants with weight 0 are disabled but kept for reference.
 */

export interface PromptVariant {
  /** Unique stable id — stored in logs for correlation. */
  id: string;
  /** The prompt string (or factory function receiving the face shape). */
  prompt: string | ((arg: string) => string);
  /** Relative sampling weight. Higher = more traffic. */
  weight: number;
}

type StageKey =
  | "face_shape"
  | "color_analysis"
  | "skin_analysis"
  | "features"
  | "glasses"
  | "hairstyle"
  | "summary";

const VARIANTS: Record<StageKey, PromptVariant[]> = {
  face_shape: [
    {
      id: "face_shape_v1",
      weight: 1,
      prompt: `Classify the face shape from the photo.
Return JSON of shape:
{
  "shape": "Oval" | "Soft Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Oblong" | "Triangle",
  "traits": string[3..5],   // short bullet phrases like "Balanced proportions"
  "confidence": number      // 0..1 (use values below 0.65 when uncertain)
}`,
    },
  ],
  color_analysis: [
    {
      id: "color_v1",
      weight: 5,   // 5:1 toward v2 once stable; keep v1 for baseline comparison
      prompt: `Perform a 12-season color analysis.
Consider skin undertone, hair, and eye color from the photo.
Ignore background. Focus only on the person.
Return JSON:
{
  "season": "Spring" | "Summer" | "Autumn" | "Winter" | "Soft Spring" | "Soft Summer" |
            "Soft Autumn" | "Deep Winter" | "Deep Autumn" | "Bright Spring" | "Bright Winter" |
            "Light Spring" | "Light Summer",
  "undertone": "Warm" | "Cool" | "Neutral",
  "description": string,
  "palette": [{ "name": string, "hex": "#RRGGBB" }],
  "metals": ("Gold"|"Silver"|"Rose Gold"|"Bronze"|"Platinum")[],
  "avoidColors": [{ "name": string, "hex": "#RRGGBB" }],
  "clothingObservation": { "color": string, "hex": "#RRGGBB", "effect": "flattering"|"clashing"|"neutral" }
}`,
    },
    {
      // v2: prompt is built dynamically in pipeline.ts using server-extracted colours
      // This variant exists to route traffic through the dominant-colour path.
      id: "color_v2_dominant",
      weight: 5,
      // Sentinel: pipeline.ts checks for this id and builds the prompt via buildColorAnalysisPrompt()
      prompt: "__dominant_color_variant__",
    },
  ],
  skin_analysis: [
    {
      id: "skin_v1",
      weight: 1,
      prompt: `Analyze skin from the photo.
Return JSON:
{
  "type": "Oily" | "Dry" | "Combination" | "Normal" | "Sensitive",
  "concerns": string[],                              // e.g. "Mild redness", "Uneven tone"
  "zones": [{ "zone": "T-Zone" | "Cheeks" | "Under-Eye" | "Jawline", "observation": string }],
  "routine": [{ "step": string, "product": string }]  // 4-6 steps
}`,
    },
  ],
  features: [
    {
      id: "features_v1",
      weight: 1,
      prompt: `Describe these facial features briefly and professionally:
eyes, nose, lips, cheeks. Note shape and one styling-relevant detail per feature.
Return JSON:
{
  "eyes":   { "shape": string, "notes": string },
  "nose":   { "shape": string, "notes": string },
  "lips":   { "shape": string, "notes": string },
  "cheeks": { "shape": string, "notes": string }
}`,
    },
  ],
  glasses: [
    {
      id: "glasses_v1",
      weight: 1,
      prompt: (faceShape: string) => `Recommend spectacle frames for a ${faceShape} face.
Return JSON:
{
  "goals": string[3],   // e.g. "Maintain balance", "Add definition & structure", "Highlight your best features"
  "recommended": [{ "style": string, "reason": string }],  // exactly 5: ["Round","Cat-Eye","Rectangle","Square","Aviator"] adapted as needed
  "avoid":       [{ "style": string, "reason": string }],  // 4 styles
  "colors":      [{ "name": string, "hex": "#RRGGBB" }],   // 5 frame colors
  "fitTips":     string[3..5]
}`,
    },
  ],
  hairstyle: [
    {
      id: "hairstyle_v1",
      weight: 1,
      prompt: (faceShape: string) => `Recommend hairstyles for a ${faceShape} face.
Return JSON:
{
  "styles":      [{ "name": string, "description": string }],   // exactly 5 flattering styles
  "lengths":     [{ "name": string, "description": string }],   // 3 lengths (Short / Collarbone / Below Shoulder)
  "colors":      [{ "name": string, "hex": "#RRGGBB", "description": string }], // 5 hair colors
  "avoid":       string[4],                                    // exactly 4 styles to avoid (short descriptive names)
  "stylingTips": string[3],                                    // exactly 3 short actionable styling tips (e.g. "Use light layers for movement")
  "hairType":    string                                        // detected/recommended hair type, e.g. "Wavy / Curly"
}`,
    },
  ],
  summary: [
    {
      id: "summary_v1",
      weight: 1,
      prompt: `Write a short (120-180 words) personalized intro for a beauty
report given this JSON of analysis results. Warm, encouraging, second-person.
Return JSON: { "summary": string }`,
    },
  ],
};

/**
 * Weighted random selection of a prompt variant for a pipeline stage.
 * Logs the selected variant id for monitoring.
 */
export function pickVariant(stage: StageKey): { id: string; prompt: string | ((arg: string) => string) } {
  const pool = VARIANTS[stage].filter((v) => v.weight > 0);
  const total = pool.reduce((s, v) => s + v.weight, 0);
  let rand = Math.random() * total;
  for (const v of pool) {
    rand -= v.weight;
    if (rand <= 0) {
      if (pool.length > 1) {
        console.info(`[canary] stage=${stage} variant=${v.id}`);
      }
      return { id: v.id, prompt: v.prompt };
    }
  }
  // Fallback to last (should never reach here)
  const last = pool[pool.length - 1];
  return { id: last.id, prompt: last.prompt };
}
