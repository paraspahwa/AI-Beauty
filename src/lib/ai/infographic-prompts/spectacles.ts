import type { FaceShapeResult, GlassesResult } from "@/types/report";

export const SPECTACLES_PROMPT_VERSION = "spectacles_v2";

const DEFAULT_TRY_ON_STYLES = ["Round", "Cat-Eye", "Rectangle", "Square", "Aviator"] as const;

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
      padded.push({ style, caption: `Flatters a ${style.toLowerCase()} frame silhouette` });
    }
  }
  return padded.slice(0, 5);
}

export function buildSpectaclesInfographicPrompt(
  faceShape: FaceShapeResult,
  glasses: GlassesResult,
): string {
  const traits = faceShape.traits.slice(0, 4).join(", ");
  const goals = glasses.goals.slice(0, 3);
  const tryOn = resolveTryOnStyles(glasses);
  const goodChoices = glasses.recommended.slice(0, 5);
  const avoid = glasses.avoid.slice(0, 4);
  const colors = glasses.colors.slice(0, 5);
  const fitTips = glasses.fitTips.slice(0, 4);

  const tryOnLines = tryOn.map(
    (item, i) =>
      `  ${i + 1}. ${item.style} — photorealistic try-on on the same face. Caption: "${item.caption}"`,
  );

  const goodLines = goodChoices.map(
    (g) => `  ✓ ${g.style}: ${g.reason}`,
  );

  const avoidLines = avoid.map(
    (g) => `  ✗ ${g.style}: ${g.reason}`,
  );

  const colorLines = colors.map((c) => `  ${c.name} (${c.hex})`);

  const fitLines = fitTips.map((t) => `  - ${t}`);

  return [
    "Transform the uploaded portrait into a luxury optician-style eyewear recommendation infographic.",
    "Analyze the person's face shape and create a clean, professional visual guide like a premium eyewear consultation report.",
    "",
    "CRITICAL: Preserve the person's facial identity exactly in every try-on panel — same person, photorealistic, realistic facial details.",
    "",
    "=== PIPELINE DATA (use exactly — do not re-detect face shape differently) ===",
    `Face shape: ${faceShape.shape}`,
    `Key characteristics: ${traits}`,
    goals.length ? `Frame goals: ${goals.join("; ")}` : "",
    "",
    "=== LAYOUT ===",
    "- Elegant editorial design: soft beige background #F5F0EA, cream and warm neutral tones",
    "- Large serif title at top: \"Spectacles Guide\"",
    "- Subtitle: \"Find Frames That Flatter You\"",
    "- Center: original portrait with subtle face-shape outline around the face",
    "",
    "Left side panel — \"Your Face Shape\":",
    `  Shape: ${faceShape.shape}`,
    `  Traits: ${traits}`,
    "",
    "Right side panel — \"Frame Goals\":",
    ...goals.map((g, i) => `  ${i + 1}. ${g} (minimal icon)`),
    "",
    "=== TRY-ON: FLATTERING STYLES ===",
    "Five realistic eyeglass mockups on THE SAME FACE — photorealistic, natural fit, benefit caption under each:",
    ...tryOnLines,
    "",
    "=== FRAME RECOMMENDATIONS ===",
    "Good Choices — illustrated frame silhouettes with green check:",
    ...goodLines,
    "",
    "Avoid These — illustrated frame silhouettes with red X:",
    ...avoidLines,
    "",
    "Include concise professional eyewear advice summarizing why recommended frames balance this face shape.",
    "",
    "=== BEST COLORS & FINISHES ===",
    "Frame color swatches and finish names:",
    ...colorLines,
    "",
    "=== FIT GUIDE ===",
    "Technical diagram hints: frame width vs face, bridge fit on nose, temple alignment with ears, frames level on face.",
    ...fitLines,
    "",
    "=== QUICK TIPS ===",
    "Three practical tips with icons: try frames in natural light; keep brows visible above rim; choose frames that boost confidence.",
    fitTips.length > 1 ? fitLines.slice(0, 3).join("\n") : "",
    "",
    "=== DESIGN STYLE ===",
    "- Premium optical store consultation report, Apple-level clean design",
    "- Luxury magazine aesthetic, minimalist typography, soft shadows",
    "- High-end infographic layout, professional optometrist recommendation sheet",
    "- Photorealistic glasses rendering, consistent spacing and alignment",
    "- Thin divider lines, rounded cards, Pinterest-quality premium editorial layout",
    "",
    "=== OUTPUT ===",
    "- Portrait orientation 4:5 aspect ratio, ultra sharp, print-ready",
    "- No watermarks, no brand logos, no extra people",
  ]
    .filter(Boolean)
    .join("\n");
}
