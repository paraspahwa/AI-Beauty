import type { FaceShapeResult, FeatureBreakdown, HairstyleResult } from "@/types/report";

export const HAIRSTYLE_PROMPT_VERSION = "hairstyle_v2";

const DEFAULT_RECOMMENDED = [
  "Soft Layers",
  "Face-Framing Layers",
  "Long Layers",
  "Side-Part Waves",
  "Curtain Bangs",
] as const;

const DEFAULT_ALTERNATIVES = [
  "Blunt Bob",
  "Heavy Straight Cut",
  "Full Straight Bangs",
  "Very Short Pixie",
] as const;

const DEFAULT_LENGTHS = [
  "Chin Length",
  "Collarbone Length",
  "Below Shoulder",
  "Mid Back",
  "Long Length",
] as const;

const DEFAULT_HAIR_COLORS = [
  { name: "Dark Brown", hex: "#3B2A1A" },
  { name: "Chestnut Brown", hex: "#6B3A2A" },
  { name: "Caramel Highlights", hex: "#C4956A" },
  { name: "Warm Balayage", hex: "#D4A574" },
  { name: "Honey Brown", hex: "#B8864A" },
] as const;

function resolveRecommended(hairstyle: HairstyleResult): { name: string; note: string }[] {
  const fromPipeline = hairstyle.styles.slice(0, 5).map((s) => ({
    name: s.name,
    note: s.description,
  }));
  const used = new Set(fromPipeline.map((s) => s.name.toLowerCase()));
  const padded = [...fromPipeline];
  for (const name of DEFAULT_RECOMMENDED) {
    if (padded.length >= 5) break;
    if (!used.has(name.toLowerCase())) {
      padded.push({ name, note: "Flatters face shape with balanced movement" });
    }
  }
  return padded.slice(0, 5);
}

function resolveAlternatives(hairstyle: HairstyleResult): { name: string; note: string }[] {
  const fromAvoid = hairstyle.avoid.slice(0, 4).map((a) => ({
    name: a,
    note: "Less ideal for this face shape — may overpower proportions",
  }));
  if (fromAvoid.length >= 4) return fromAvoid;
  const used = new Set(fromAvoid.map((s) => s.name.toLowerCase()));
  const padded = [...fromAvoid];
  for (const name of DEFAULT_ALTERNATIVES) {
    if (padded.length >= 4) break;
    if (!used.has(name.toLowerCase())) {
      padded.push({ name, note: "Alternative option — suitability varies" });
    }
  }
  return padded.slice(0, 4);
}

function resolveHairGoals(faceShape: FaceShapeResult, hairstyle: HairstyleResult): string[] {
  const fromTips = (hairstyle.stylingTips ?? []).slice(0, 2);
  const defaults = [
    "Frame the face beautifully",
    "Add movement and volume",
    "Enhance natural texture",
    "Balance facial proportions",
    "Soften angular features",
  ];
  const goals = [...fromTips, ...defaults];
  return goals.slice(0, 5);
}

function idealLength(hairstyle: HairstyleResult): string {
  const top = hairstyle.lengths[0];
  if (top) return `${top.name} — ${top.description}`;
  return "Collarbone to Below Shoulder";
}

function textureLabel(hairType: string, tips: string[]): string {
  if (tips[0]) return tips[0];
  const t = hairType.toLowerCase();
  if (t.includes("wavy")) return "Soft Waves";
  if (t.includes("curly") || t.includes("coily")) return "Defined Texture";
  if (t.includes("straight")) return "Sleek Movement";
  return "Natural Texture";
}

export function buildHairstyleInfographicPrompt(
  faceShape: FaceShapeResult,
  features: FeatureBreakdown,
  hairstyle: HairstyleResult,
): string {
  const recommended = resolveRecommended(hairstyle);
  const alternatives = resolveAlternatives(hairstyle);
  const hairType = hairstyle.hairType ?? "Wavy";
  const tips = hairstyle.stylingTips ?? [];
  const colors = hairstyle.colors.length
    ? hairstyle.colors.slice(0, 5)
    : [...DEFAULT_HAIR_COLORS];
  const hairGoals = resolveHairGoals(faceShape, hairstyle);
  const topStyle = recommended[0]?.name ?? "Soft Layers";
  const textureRec = textureLabel(hairType, tips);
  const traits = faceShape.traits.slice(0, 5);

  const recLines = recommended.map(
    (s, i) => `  ${i + 1}. ${s.name} — ✓ Recommended. ${s.note}`,
  );

  const altLines = alternatives.map(
    (s, i) => `  ${i + 1}. ${s.name} — ○ Alternative Option. ${s.note}`,
  );

  const lengthLines = hairstyle.lengths.length
    ? hairstyle.lengths.map((l) => `  - ${l.name}: ${l.description}`)
    : DEFAULT_LENGTHS.map((l) => `  - ${l}`);

  const colorLines = colors.map((c) => `  - ${c.name} (${c.hex})`);

  const tipLines = tips.length
    ? tips.map((t) => `  - ${t}`)
    : [
        "  - Use light layers for movement",
        "  - Soft waves add texture",
        "  - Side part balances proportions",
      ];

  return [
    "You are a professional luxury hairstylist and image consultant.",
    "Transform the uploaded portrait into a high-end hairstyle analysis infographic — an elegant hairstylist consultation report.",
    "",
    "CRITICAL: Preserve the person's facial identity exactly in every hairstyle simulation panel.",
    "Do NOT re-detect face shape — use pipeline data below. Layout and photorealistic hair visualization only.",
    "",
    "=== PIPELINE DATA (authoritative) ===",
    `Face shape: ${faceShape.shape}`,
    traits.length ? `Face traits: ${traits.join("; ")}` : "",
    `Hair type: ${hairType}`,
  `Ideal length: ${idealLength(hairstyle)}`,
    "",
    "=== DESIGN STYLE ===",
    "- Premium beauty consultation report, elegant editorial magazine layout",
    "- Soft beige background #F5F0EA, ivory, cream, warm neutrals",
    "- Elegant serif title, minimalist typography, thin dividers, rounded cards, subtle shadows",
    "- Consistent grid layout, consistent icon set, Pinterest-worthy luxury salon branding",
    "",
    "=== TOP SECTION ===",
    "- Title: \"Hairstyle Analysis\"",
    "- Subtitle: \"Find Styles That Flatter You\"",
    "- Centered original portrait with face-shape overlay: contour outline, vertical center line, proportion markers",
    "",
    "=== LEFT PANEL ===",
    "Face Shape:",
    `  Shape: ${faceShape.shape} (illustration icon)`,
    ...traits.map((t) => `  - ${t}`),
    "",
    "Hair Goals (personalized icons):",
    ...hairGoals.map((g) => `  - ${g}`),
    "",
    "=== RIGHT PANEL ===",
    "Best Features:",
    `  - Eyes: ${features.eyes.shape} — ${features.eyes.notes.split(".").slice(0, 1).join(".")}`,
    `  - Cheekbones: ${features.cheeks.shape} — ${features.cheeks.notes.split(".").slice(0, 1).join(".")}`,
    `  - Lips: ${features.lips.shape}`,
    `  - Facial symmetry and balanced proportions`,
    "",
    "Styling Tips:",
    ...tipLines,
    "",
    "=== MOST FLATTERING STYLES ===",
    "Five photorealistic hairstyle simulations — same person, salon-quality lighting, natural styling:",
    ...recLines,
    "",
    "=== STYLES TO CONSIDER ===",
    "Four alternative photorealistic styles on the same person:",
    ...altLines,
    "",
    "=== BEST LENGTH ===",
    "Elegant hair-length guide silhouette showing: Chin, Collarbone, Below Shoulder, Mid Back, Long.",
    `Highlight ideal: ${idealLength(hairstyle)}`,
    lengthLines.length ? "Length notes:" : "",
    ...lengthLines,
    "",
    "=== HAIR TYPE MATCH ===",
    `Type: ${hairType}`,
    "- Benefits: adds volume, enhances texture, frames face naturally, creates balance",
    "",
    "=== BEST COLOR DIRECTION ===",
    "Realistic hair color swatches:",
    ...colorLines,
    "",
    "=== BOTTOM RECOMMENDATION BANNER ===",
    `"${topStyle} + ${textureRec} = Your Best Look"`,
    "",
    "=== OUTPUT ===",
    "- Vertical 4:5 aspect ratio, ultra-detailed hair texture, print-ready, high resolution",
    "- Luxury salon consultation, Vogue / Korean salon board aesthetic",
    "- No watermarks, no extra people, no markdown — render as one finished infographic image",
  ]
    .filter(Boolean)
    .join("\n");
}
