// All AI prompts live here as string constants so they can be reviewed,
// tuned, and version-controlled in one place. Each prompt instructs the
// model to return strict JSON matching the corresponding type in
// src/types/report.ts.

export const SYSTEM_BASE = `You are Renovaara, a precise, kind, and inclusive personal stylist.
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

/**
 * Phase 5 — vision-only portion of the split skin analysis.
 * Uses gpt-4o (full model) on a face-cropped image for maximum texture accuracy.
 * Returns type + imageConfidence + structured concerns + zones.
 * Routine is fetched separately via buildSkinRoutinePrompt.
 */
export const SKIN_VISION_PROMPT = `Analyze skin type and visible concerns from this face-cropped photo.
IMPORTANT: Focus ONLY on skin texture, tone, pores, and visible condition. Ignore makeup, filters, and lighting artifacts.
If the image is blurry, heavily filtered, or poorly lit, set imageConfidence below 0.55 and add a concern noting the limitation.
Return JSON:
{
  "type": "Oily" | "Dry" | "Combination" | "Normal" | "Sensitive",
  "imageConfidence": number,
  "concerns": [{ "label": string, "severity": "mild" | "moderate" | "significant", "zone": "T-Zone" | "Cheeks" | "Under-Eye" | "Jawline" | "General" }],
  "zones": [{ "zone": "T-Zone" | "Cheeks" | "Under-Eye" | "Jawline", "observation": string }]
}`;

/**
 * Phase 5 — text-only AM/PM routine generator. No image required.
 * Accepts structured or plain-string concerns, plus optional user questionnaire context.
 */
export function buildSkinRoutinePrompt(
  type: string,
  concerns: Array<string | { label: string; severity?: string; zone?: string }>,
  userContext?: { ageRange?: string; selfReportedFeeling?: string; primaryConcern?: string },
): string {
  const concernLabels = concerns.map((c) => (typeof c === "string" ? c : c.label));
  const concernText = concernLabels.length > 0 ? concernLabels.join(", ") : "general maintenance";
  const contextParts: string[] = [];
  if (userContext?.selfReportedFeeling) contextParts.push(`Skin feels "${userContext.selfReportedFeeling}" by midday.`);
  if (userContext?.primaryConcern)      contextParts.push(`Primary concern: "${userContext.primaryConcern}".`);
  if (userContext?.ageRange)            contextParts.push(`Age range: ${userContext.ageRange}.`);
  const contextBlock = contextParts.length > 0 ? ` Additional user context: ${contextParts.join(" ")}` : "";
  return (
    `Create a personalized daily skincare routine for ${type} skin with these concerns: ${concernText}.${contextBlock} ` +
    `Split into AM (morning — focus on protection and hydration) and PM (evening — focus on treatment and repair). ` +
    `Each step must be actionable with a specific product-type recommendation. AM: 4–5 steps. PM: 4–5 steps. ` +
    `Return JSON: { "routine": { "am": [{ "step": string, "product": string }], "pm": [{ "step": string, "product": string }] } }`
  );
}

/**
 * Phase 4.1 — build the features prompt, optionally injecting hard Rekognition data.
 * Server-detected attributes (glasses, age range) are injected as hard evidence
 * so the AI doesn't have to guess from the compressed image.
 */
export function buildFeaturesPrompt(rekAttrs?: {
  ageRange?: string;
  wearingGlasses?: boolean;
  wearingSunglasses?: boolean;
}): string {
  const lines: string[] = [];
  if (rekAttrs?.ageRange) lines.push(`  Estimated age range: ${rekAttrs.ageRange}`);
  if (rekAttrs?.wearingGlasses) lines.push(`  Currently wearing prescription eyeglasses (describe the eye area accordingly).`);
  if (rekAttrs?.wearingSunglasses) lines.push(`  Currently wearing sunglasses (limited eye visibility).`);
  if (rekAttrs && !rekAttrs.wearingGlasses && !rekAttrs.wearingSunglasses) lines.push(`  No eyewear detected.`);

  const rekBlock = lines.length > 0
    ? `\n\nSERVER-DETECTED FACE ATTRIBUTES (hard evidence — incorporate into your feature descriptions):\n` + lines.join("\n")
    : "";

  return (
    `Describe these 5 facial features briefly and professionally: eyebrows, eyes, nose, lips, cheeks. ` +
    `For each feature provide shape (2-3 words) and notes (exactly 3 short styling-relevant bullet facts separated by ". "). ` +
    `Include eye color in the eyes.notes field (e.g. "Warm brown iris. Almond-shaped with subtle upward tilt. Defined upper lash line."). ` +
    `Include brow color and density in the eyebrows.notes field. ` +
    `Return JSON:\n` +
    `{\n` +
    `  "eyebrows": { "shape": string, "notes": string },\n` +
    `  "eyes":     { "shape": string, "notes": string },\n` +
    `  "nose":     { "shape": string, "notes": string },\n` +
    `  "lips":     { "shape": string, "notes": string },\n` +
    `  "cheeks":   { "shape": string, "notes": string }\n` +
    `}${rekBlock}`
  );
}

/**
 * Phase 4.3 — build the glasses prompt, optionally injecting eye and brow data
 * from the Features stage so frame colors are personalized to the person's eye color.
 */
export function buildGlassesPrompt(
  faceShape: string,
  features?: { eyes?: { shape: string; notes: string }; eyebrows?: { shape: string; notes: string } },
): string {
  const featBlock = features
    ? `\n\nDETECTED EYE & BROW FEATURES (use to personalize frame color and style recommendations):\n` +
      (features.eyes ? `  Eye shape: ${features.eyes.shape}. ${features.eyes.notes}\n` : "") +
      (features.eyebrows ? `  Eyebrow shape: ${features.eyebrows.shape}. ${features.eyebrows.notes}\n` : "")
    : "";

  return (
    `Recommend spectacle frames for a ${faceShape} face.${featBlock}` +
    `Return JSON:\n` +
    `{\n` +
    `  "goals": string[3],\n` +
    `  "recommended": [{ "style": string, "reason": string }],  // exactly 5 styles\n` +
    `  "avoid":       [{ "style": string, "reason": string }],  // 4 styles\n` +
    `  "colors":      [{ "name": string, "hex": "#RRGGBB" }],   // 5 frame colors that complement eye color and skin tone\n` +
    `  "fitTips":     string[3..5]\n` +
    `}`
  );
}

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
Order styles from best to least suitable for this person.
The first style must be the single best recommendation and should be practical to achieve.
Return JSON:
{
  "styles":  [{ "name": string, "description": string }],   // exactly 5 styles, rank-ordered (best first)
  "lengths": [{ "name": string, "description": string }],   // 3 lengths (Short / Medium / Long variants)
  "colors":  [{ "name": string, "hex": "#RRGGBB", "description": string }], // 5 colors
  "avoid":   string[3..5]
}`;

export const COMPILE_PROMPT = `Write a short (120-180 words) personalized intro for a beauty
report given this JSON of analysis results. Warm, encouraging, second-person.
Return JSON: { "summary": string }`;

export function buildStyleGuidePrompt(
  faceShape: string,
  season: string,
  undertone: string,
): string {
  return `Create a personalized style guide for a client with a ${faceShape} face and ${season} coloring (${undertone} undertone).
Use the provided analysis JSON context. Be specific, practical, and luxury-consultant in tone.
Return JSON:
{
  "primaryStyle": string,
  "secondaryStyles": string[4],
  "vibeTraits": string[4..6],
  "wardrobeEssentials": string[6..10],
  "silhouettes": string[4..6],
  "colorDirection": { "neutrals": string[3..5], "accents": string[3..5] },
  "styleNotes": string[4..6],
  "identitySummary": string
}`;
}

// ── Ingredient Analysis ────────────────────────────────────────────────────────

/**
 * Build the skincare ingredient analysis prompt.
 * Optionally injects the user's skin profile so the AI can personalise flags.
 */
export function buildIngredientAnalysisPrompt(skinProfile?: {
  type: string;           // e.g. "Oily"
  concerns: string[];     // e.g. ["Acne", "Hyperpigmentation"]
}): string {
  const profileBlock = skinProfile
    ? `\n\nUSER SKIN PROFILE (personalise your analysis to this):\n  Skin type: ${skinProfile.type}\n  Concerns: ${skinProfile.concerns.join(", ") || "None stated"}\n`
    : "";

  return `You are a cosmetic-science expert. Analyse the provided skincare product ingredient list and evaluate each ingredient.${profileBlock}
Return strict JSON with this exact shape — no prose, no markdown, no code fences:
{
  "overallScore": number,       // 1-10 compatibility score for this user's skin profile (10 = excellent)
  "summary": string,            // 2-3 sentence plain-English verdict; mention the most important positives and concerns
  "highlights": string[],       // up to 3 short phrases describing the best features (e.g. "Hyaluronic acid for deep hydration")
  "concerns": string[],         // up to 3 short phrases for notable concerns (e.g. "Fragrance may irritate sensitive skin")
  "flags": [                    // one entry per NOTABLE ingredient (skip unremarkable fillers like water, glycerin filler-grade)
    {
      "name": string,           // clean INCI or common name
      "verdict": "beneficial" | "neutral" | "caution" | "avoid",
      "reason": string          // one sentence explaining the verdict for this skin profile
    }
  ]
}
Rules:
- "avoid" only for confirmed irritants, comedogenic (rating 4-5) for oily/acne-prone, or known allergens.
- "caution" for moderate irritants, comedogenic 3, or ingredients that may conflict with the stated concerns.
- "beneficial" for evidence-backed actives that directly address the stated concerns.
- Keep flags to the most meaningful 5-15 ingredients; skip bulk emulsifiers, pH adjusters, and safe preservatives.
- overallScore must reflect the skin profile if provided; default to 7 if no profile.
- If the input does not appear to be an ingredient list, return: { "error": "Not a valid ingredient list" }`;
}

// ── Product Comparison ────────────────────────────────────────────────────────

/**
 * Build the skincare product comparison prompt.
 * Returns a structured side-by-side verdict for two products against the user's skin profile.
 */
export function buildProductComparisonPrompt(skinProfile?: {
  type: string;
  concerns: string[];
}): string {
  const profileBlock = skinProfile
    ? `\n\nUSER SKIN PROFILE (all scores and verdicts must be relative to this):\n  Skin type: ${skinProfile.type}\n  Concerns: ${skinProfile.concerns.join(", ") || "None stated"}\n`
    : "";

  return `You are a cosmetic-science expert. Compare two skincare products given their ingredient lists and decide which is better for this user.${profileBlock}
Return strict JSON with this exact shape — no prose, no markdown, no code fences:
{
  "winner": "A" | "B" | "tie",
  "winnerReason": string,         // 1-2 sentences explaining why the winner is better for this skin profile
  "recommendation": string,       // 2-3 sentences of actionable advice (e.g. when to use each, order of layers)
  "productA": {
    "score": number,              // 1-10 compatibility for this skin profile
    "highlights": string[],       // up to 3 short positive phrases
    "concerns": string[],         // up to 3 short concern phrases
    "flags": [
      {
        "name": string,
        "verdict": "beneficial" | "neutral" | "caution" | "avoid",
        "reason": string
      }
    ]
  },
  "productB": {
    "score": number,
    "highlights": string[],
    "concerns": string[],
    "flags": [
      {
        "name": string,
        "verdict": "beneficial" | "neutral" | "caution" | "avoid",
        "reason": string
      }
    ]
  }
}
Rules:
- Score must reflect compatibility with the user's skin profile (not overall quality).
- "avoid" flags only for confirmed irritants, high comedogenic risk, or known allergens relevant to the stated concerns.
- Keep each flags array to the most meaningful 5-12 ingredients; skip safe, unremarkable fillers.
- If either ingredient list does not appear valid, return: { "error": "Product A/B ingredient list is not valid." }`;
}
