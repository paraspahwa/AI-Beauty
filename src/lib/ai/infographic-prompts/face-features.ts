import type { FaceShapeResult, FeatureBreakdown } from "@/types/report";

export const FACE_FEATURES_PROMPT_VERSION = "face_features_v3";

const FACE_FEATURES_PROMPT_BASE = `Transform the uploaded portrait into a premium facial features analysis infographic.

Analyze the visible facial structure, proportions, symmetry, and individual facial features from the uploaded image. Create a luxury beauty consultant report with a clean editorial layout.

DESIGN STYLE

- Premium beauty consultation report
- Luxury skincare and aesthetics clinic branding
- Soft beige, ivory, cream, and warm neutral color palette
- Elegant serif title typography
- Minimalist magazine-quality infographic
- Clean spacing and professional visual hierarchy
- High-end beauty editorial aesthetic

TITLE

"Face Features Analysis"

MAIN LAYOUT

Place the portrait in the center.

Preserve the person's identity exactly.

Add elegant callout lines from the portrait to analysis panels positioned around the face.

Use subtle white connector lines and anchor points.

LEFT SIDE PANELS

FACE SHAPE

Automatically determine face shape.

Include:
- Face shape icon
- Face shape name
- Key characteristics
- Facial proportion observations

Example:
- Balanced proportions
- Soft jawline
- Slightly tapered chin

EYES

Analyze:
- Eye shape
- Eye size
- Eye spacing
- Eye tilt

Include concise beauty-analysis observations.

NOSE

Analyze:
- Bridge shape
- Tip shape
- Facial balance
- Proportion relative to face

RIGHT SIDE PANELS

EYEBROWS

Analyze:
- Brow shape
- Thickness
- Natural arch
- Facial harmony

CHEEKS

Analyze:
- Fullness
- Cheekbone visibility
- Facial balance
- Mid-face proportions

LIPS

Analyze:
- Lip fullness
- Cupid's bow definition
- Upper-to-lower lip balance
- Natural shape

VISUAL REQUIREMENTS

- Professional image consultant report
- Luxury aesthetics clinic quality
- Fashion magazine infographic
- Clean vector icons
- Elegant typography
- Consistent panel design
- Soft shadows
- Rounded cards
- Neutral luxury palette
- High readability
- Sophisticated layout

FACIAL ANALYSIS RULES

Focus on:
- Face shape
- Eyes
- Nose
- Eyebrows
- Cheeks
- Lips

Use positive, descriptive observations.

Avoid medical diagnoses, attractiveness ratings, beauty scores, or subjective judgments.

OUTPUT

Vertical infographic
4:5 aspect ratio
Ultra-high resolution
Print-ready quality
Premium beauty consultation report
Photorealistic portrait preservation

Inspired by luxury beauty consultation reports, facial harmony assessments, premium aesthetics clinics, Vogue beauty editorials, Korean image consulting reports, professional makeup artist analysis boards, and high-end skincare consultation infographics. Maintain elegant design, realistic facial detail, and professional editorial presentation.

Brand Style:
- Soft beige background (#F5F0EA)
- Warm neutral palette
- Elegant serif title
- Minimal luxury infographic
- Thin divider lines
- Rounded cards
- Subtle shadows
- Beauty consultation report aesthetic
- Pinterest-quality design
- Premium editorial layout
- Consistent icon set
- High-end personal styling report`;

function buildPipelineDataAppendix(
  faceShape: FaceShapeResult,
  features: FeatureBreakdown,
): string {
  const traits = faceShape.traits.slice(0, 5);
  return [
    "",
    "=== AUTHORITATIVE ANALYSIS DATA (use verbatim on panels — do not contradict) ===",
    `Face shape: ${faceShape.shape}`,
    traits.length ? `Characteristics: ${traits.join("; ")}` : "",
    `Eyes: ${features.eyes.shape} — ${features.eyes.notes}`,
    `Nose: ${features.nose.shape} — ${features.nose.notes}`,
    `Eyebrows: ${features.eyebrows.shape} — ${features.eyebrows.notes}`,
    `Cheeks: ${features.cheeks.shape} — ${features.cheeks.notes}`,
    `Lips: ${features.lips.shape} — ${features.lips.notes}`,
    "",
    "CRITICAL: Preserve the person's identity exactly. Layout and visual style from the prompt above; panel copy from this data block.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildFaceFeaturesInfographicPrompt(
  faceShape: FaceShapeResult,
  features: FeatureBreakdown,
): string {
  return FACE_FEATURES_PROMPT_BASE + buildPipelineDataAppendix(faceShape, features);
}
