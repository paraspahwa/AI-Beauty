import type { FaceShapeResult, GlassesResult } from "@/types/report";

export const SPECTACLES_PROMPT_VERSION = "spectacles_v3";

const DEFAULT_TRY_ON_STYLES = ["Round", "Cat-Eye", "Rectangle", "Square", "Aviator"] as const;

const SPECTACLES_PROMPT_BASE = `Transform the uploaded portrait into a luxury optician-style eyewear recommendation infographic.

Analyze the person's face shape and create a clean, professional visual guide similar to a premium eyewear consultation report.

Layout requirements:
- Elegant editorial design with soft beige, cream, and warm neutral tones
- Large title at top: "Spectacles Guide"
- Subtitle: "Find Frames That Flatter You"
- Place the original face in the center with a subtle face-shape outline drawn around the face
- Add a side panel labeled "Your Face Shape" showing the detected face shape and key characteristics
- Add a side panel labeled "Frame Goals" with simple minimal icons and recommendations

Create a "Try-On: Flattering Styles" section containing 5 realistic eyeglass mockups on the same face:
1. Round
2. Cat-Eye
3. Rectangle
4. Square
5. Aviator

Each frame style should:
- Be photorealistic
- Fit naturally on the face
- Include a short benefit caption underneath

Create a "Frame Recommendations" section:
- Good Choices with illustrated frame silhouettes
- Avoid These with illustrated frame silhouettes
- Include concise professional eyewear advice

Add sections:
- Best Colors & Finishes
- Fit Guide
- Quick Tips

Design style:
- Premium optical store consultation report
- Apple-level clean design
- Luxury magazine aesthetic
- Minimalist typography
- Soft shadows
- High-end infographic layout
- Professional optometrist recommendation sheet
- Photorealistic glasses rendering
- Consistent spacing and alignment

Output:
- Portrait orientation (4:5)
- Ultra sharp
- Print-ready quality
- Realistic facial details preserved
- Modern premium infographic

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
- High-end personal styling report

CRITICAL: Render as ONE finished infographic image. Preserve identity exactly in every try-on panel. No watermarks. No extra people.`;

function resolveTryOnStyles(glasses: GlassesResult): { style: string; caption: string }[] {
  const fromPipeline = glasses.recommended.slice(0, 5).map((g) => ({
    style: g.style,
    caption: g.reason,
  }));

  if (fromPipeline.length >= 5) return fromPipeline;

  const used = new Set(fromPipeline.map((g) => g.style.toLowerCase()));
  const padded = [...fromPipeline];
  for (const style of DEFAULT_TRY_ON_STYLES) {
    if (padded.length >= 5) break;
    if (!used.has(style.toLowerCase())) {
      padded.push({ style, caption: `Flatters this face shape with balanced proportions` });
    }
  }
  return padded.slice(0, 5);
}

function buildPipelineDataAppendix(
  faceShape: FaceShapeResult,
  glasses: GlassesResult,
): string {
  const traits = faceShape.traits.slice(0, 5);
  const goals = glasses.goals.slice(0, 3);
  const tryOn = resolveTryOnStyles(glasses);
  const goodChoices = glasses.recommended.slice(0, 5);
  const avoid = glasses.avoid.slice(0, 4);
  const colors = glasses.colors.slice(0, 5);
  const fitTips = glasses.fitTips.slice(0, 4);

  const tryOnLines = tryOn.map(
    (item, i) => `${i + 1}. ${item.style} — photorealistic try-on. Caption: "${item.caption}"`,
  );
  const goodLines = goodChoices.map((g) => `✓ ${g.style}: ${g.reason}`);
  const avoidLines = avoid.map((g) => `✗ ${g.style}: ${g.reason}`);
  const colorLines = colors.map((c) => `- ${c.name} (${c.hex})`);
  const fitLines = fitTips.map((t) => `- ${t}`);

  return [
    "",
    "=== AUTHORITATIVE ANALYSIS DATA (use verbatim on panels — do not contradict) ===",
    `Face shape: ${faceShape.shape}`,
    traits.length ? `Key characteristics: ${traits.join("; ")}` : "",
    "",
    "Frame Goals:",
    ...goals.map((g, i) => `${i + 1}. ${g}`),
    "",
    "Try-On: Flattering Styles (same person, photorealistic):",
    ...tryOnLines,
    "",
    "Frame Recommendations — Good Choices:",
    ...goodLines,
    "",
    "Avoid These:",
    ...avoidLines,
    "",
    "Best Colors & Finishes:",
    ...colorLines,
    "",
    "Fit Guide:",
    ...fitLines,
    "",
    "Quick Tips:",
    "- Try frames in natural light",
    "- Keep brows visible above the rim",
    "- Choose frames that boost confidence",
    "",
    "CRITICAL: Preserve the person's identity exactly. Layout from prompt above; copy from this data block.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSpectaclesInfographicPrompt(
  faceShape: FaceShapeResult,
  glasses: GlassesResult,
): string {
  return SPECTACLES_PROMPT_BASE + buildPipelineDataAppendix(faceShape, glasses);
}
