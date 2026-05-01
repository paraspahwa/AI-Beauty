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

export const COLOR_ANALYSIS_PROMPT = `Perform a 12-season color analysis.
Consider skin undertone, hair, and eye color from the photo.
Return JSON:
{
  "season": "Spring" | "Summer" | "Autumn" | "Winter" | "Soft Spring" | "Soft Summer" |
            "Soft Autumn" | "Deep Winter" | "Deep Autumn" | "Bright Spring" | "Bright Winter" |
            "Light Spring" | "Light Summer",
  "undertone": "Warm" | "Cool" | "Neutral",
  "description": string,                    // 2-3 sentences
  "palette": [{ "name": string, "hex": "#RRGGBB" }],   // exactly 8 colors
  "metals": ("Gold"|"Silver"|"Rose Gold"|"Bronze"|"Platinum")[],
  "avoidColors": [{ "name": string, "hex": "#RRGGBB" }] // 3-4 colors
}`;

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
