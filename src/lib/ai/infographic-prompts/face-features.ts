import type { FaceShapeResult, FeatureBreakdown } from "@/types/report";

export const FACE_FEATURES_PROMPT_VERSION = "face_features_v2";

function featurePanel(title: string, shape: string, notes: string): string[] {
  return [
    `${title}`,
    `  Shape / type: ${shape}`,
    `  Observations: ${notes}`,
  ];
}

export function buildFaceFeaturesInfographicPrompt(
  faceShape: FaceShapeResult,
  features: FeatureBreakdown,
): string {
  const traits = faceShape.traits.slice(0, 5);

  return [
    "Transform the uploaded portrait into a premium facial features analysis infographic.",
    "Analyze visible facial structure, proportions, symmetry, and individual features. Present as a luxury beauty consultant report with clean editorial layout.",
    "",
    "CRITICAL: Preserve the person's identity exactly — same person, same expression, photorealistic portrait in center.",
    "Do NOT re-detect or change face shape or features — use the pipeline data below verbatim.",
    "",
    "=== PIPELINE DATA (authoritative — layout only, do not contradict) ===",
    `Face shape: ${faceShape.shape}`,
    traits.length ? `Key characteristics: ${traits.join("; ")}` : "",
    "",
    "=== DESIGN STYLE ===",
    "- Premium beauty consultation report; luxury skincare & aesthetics clinic branding",
    "- Soft beige background #F5F0EA, ivory, cream, warm neutral palette",
    "- Elegant serif title typography, minimalist magazine-quality infographic",
    "- Clean spacing, professional visual hierarchy, high-end beauty editorial aesthetic",
    "- Thin divider lines, rounded cards, soft shadows, consistent icon set",
    "- Pinterest-quality, sophisticated layout, high readability",
    "",
    "=== TITLE ===",
    "\"Face Features Analysis\"",
    "",
    "=== MAIN LAYOUT ===",
    "- Portrait centered, identity preserved exactly",
    "- Elegant callout lines from portrait to six analysis panels around the face",
    "- Subtle white connector lines and anchor points on facial zones",
    "",
    "=== LEFT SIDE PANELS ===",
    "",
    "FACE SHAPE (icon + name + characteristics + proportion notes):",
    `  Name: ${faceShape.shape}`,
    ...traits.map((t) => `  - ${t}`),
    "",
    ...featurePanel(
      "EYES (shape, size, spacing, tilt — concise beauty-analysis notes)",
      features.eyes.shape,
      features.eyes.notes,
    ),
    "",
    ...featurePanel(
      "NOSE (bridge, tip, balance, proportion relative to face)",
      features.nose.shape,
      features.nose.notes,
    ),
    "",
    "=== RIGHT SIDE PANELS ===",
    "",
    ...featurePanel(
      "EYEBROWS (shape, thickness, arch, facial harmony)",
      features.eyebrows.shape,
      features.eyebrows.notes,
    ),
    "",
    ...featurePanel(
      "CHEEKS (fullness, cheekbone visibility, balance, mid-face proportions)",
      features.cheeks.shape,
      features.cheeks.notes,
    ),
    "",
    ...featurePanel(
      "LIPS (fullness, Cupid's bow, upper-to-lower balance, natural shape)",
      features.lips.shape,
      features.lips.notes,
    ),
    "",
    "=== FACIAL ANALYSIS RULES ===",
    "- Focus only on: face shape, eyes, nose, eyebrows, cheeks, lips",
    "- Use positive, descriptive, professional observations",
    "- NO medical diagnoses, attractiveness ratings, beauty scores, or subjective judgments",
    "",
    "=== VISUAL REQUIREMENTS ===",
    "- Professional image consultant report, luxury aesthetics clinic quality",
    "- Fashion magazine infographic, clean vector-style icons per panel",
    "- Consistent panel design, neutral luxury palette",
    "- Vertical 4:5 aspect ratio, ultra-high resolution, print-ready",
    "- No watermarks, no extra people",
    "- Inspired by luxury beauty consultations, Korean image consulting boards, Vogue editorials, makeup artist analysis boards",
  ]
    .filter(Boolean)
    .join("\n");
}
