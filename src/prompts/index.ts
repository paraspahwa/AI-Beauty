// All AI prompts live here as string constants so they can be reviewed,
// tuned, and version-controlled in one place. Each prompt instructs the
// model to return strict JSON matching the corresponding type in
// src/types/report.ts.

export const SYSTEM_BASE = `You are StyleAI, a precise, kind, and inclusive personal stylist.
- Always respond with strict JSON. No prose, no markdown, no code fences.
- Never invent demographic attributes (age, ethnicity, gender) beyond what's
  needed for the analysis. Phrase observations respectfully.
- Use realistic, professional stylist vocabulary.
- If uncertain, keep language conservative and set lower confidence instead of guessing.`;

export const FACE_SHAPE_PROMPT = `Classify the face shape from the photo.
Return JSON of shape:
{
  "shape": "Oval" | "Soft Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Oblong" | "Triangle",
  "traits": string[3..5],   // short bullet phrases like "Balanced proportions"
  "confidence": number      // 0..1 (use values below 0.65 when uncertain)
}`;

/**
 * Build the color analysis prompt, optionally injecting server-side extracted
 * dominant clothing colours and coverage fraction so the AI has hard pixel data
 * instead of guessing from the compressed image.
 */
export function buildColorAnalysisPrompt(opts?: {
  clothingColors?: string[];  // e.g. ["#4A2D6F", "#C8A87B"]
  clothingCoverage?: number;  // 0..1
}): string {
  const clothingBlock =
    opts?.clothingColors && opts.clothingColors.length > 0
      ? `\n\nSERVER-EXTRACTED CLOTHING COLOURS (pixel-accurate, use as hard evidence):\n` +
        `  Dominant colors: ${opts.clothingColors.join(", ")}\n` +
        `  Clothing coverage in frame: ${Math.round((opts.clothingCoverage ?? 0) * 100)}%\n` +
        (((opts.clothingCoverage ?? 0) < 0.2)
          ? `  Coverage is LOW (<20%) — this is likely a headshot; weight clothing signal less heavily.\n`
          : `  Coverage is GOOD — evaluate each colour against the person's coloring.\n`)
      : "";

  return `Perform a 12-season color analysis on the person in the photo.

IMPORTANT: Focus ONLY on the person. Ignore background, walls, furniture, or environment.

Analysis signals to consider (in priority order):
1. SKIN UNDERTONE — examine inner wrist / jaw / neck area (not the forehead which may be oily).
   Identify warm (peachy/golden/yellow), cool (pink/rosy/bluish), or neutral undertones.
2. HAIR COLOR — natural root color and depth (dark/medium/light, cool/warm cast).
3. EYE COLOR — depth and warmth of iris.
4. CLOTHING COLOR — observe what the person is wearing (ignoring background).${clothingBlock}
   If a clothing color visibly flatters the face (skin looks radiant, no shadowing), include
   it in "palette". If it clashes or washes out the complexion, include in "avoidColors".
   Set "clothingObservation" for the most prominent visible clothing color.
5. OVERALL CONTRAST — high (dark hair + light skin), medium, or low contrast affects season.

Return JSON (strict, no markdown):
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
}`;
}

// Legacy constant kept for backward compat (canary v1 still uses it)
export const COLOR_ANALYSIS_PROMPT = buildColorAnalysisPrompt();

export const SKIN_ANALYSIS_PROMPT = `Analyze skin from the photo.
Return JSON:
{
  "type": "Oily" | "Dry" | "Combination" | "Normal" | "Sensitive",
  "concerns": string[],                              // e.g. "Mild redness", "Uneven tone"
  "zones": [{ "zone": "T-Zone" | "Cheeks" | "Under-Eye" | "Jawline", "observation": string }],
  "routine": [{ "step": string, "product": string }]  // 4-6 steps
}`;

export const FEATURES_PROMPT = `Describe these facial features briefly and professionally:
eyes, nose, lips, cheeks. Note shape and one styling-relevant detail per feature.
Return JSON:
{
  "eyes":   { "shape": string, "notes": string },
  "nose":   { "shape": string, "notes": string },
  "lips":   { "shape": string, "notes": string },
  "cheeks": { "shape": string, "notes": string }
}`;

export const GLASSES_PROMPT = (faceShape: string) => `Recommend spectacle frames for a ${faceShape} face.
Return JSON:
{
  "goals": string[3],   // e.g. "Maintain balance", "Add definition & structure", "Highlight your best features"
  "recommended": [{ "style": string, "reason": string }],  // exactly 5: ["Round","Cat-Eye","Rectangle","Square","Aviator"] adapted as needed
  "avoid":       [{ "style": string, "reason": string }],  // 4 styles
  "colors":      [{ "name": string, "hex": "#RRGGBB" }],   // 5 frame colors
  "fitTips":     string[3..5]
}`;

export const HAIRSTYLE_PROMPT = (faceShape: string) => `Recommend hairstyles for a ${faceShape} face.
Return JSON:
{
  "styles":  [{ "name": string, "description": string }],   // 5 styles
  "lengths": [{ "name": string, "description": string }],   // 3 lengths (Short / Medium / Long variants)
  "colors":  [{ "name": string, "hex": "#RRGGBB", "description": string }], // 5 colors
  "avoid":   string[3..5]
}`;

export const COMPILE_PROMPT = `Write a short (120-180 words) personalized intro for a beauty
report given this JSON of analysis results. Warm, encouraging, second-person.
Return JSON: { "summary": string }`;
