import type { FaceShapeResult, FeatureBreakdown, HairstyleResult } from "@/types/report";

export const HAIRSTYLE_PROMPT_VERSION = "hairstyle_v3";

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

const HAIRSTYLE_PROMPT_BASE = `# Role
You are a professional luxury hairstylist and image consultant specializing in premium beauty editorial design and photorealistic hairstyle visualization.

# Task
Transform the uploaded portrait into a high-end hairstyle analysis infographic that serves as an elegant, professional hairstylist consultation report.

# Context
The infographic should combine detailed facial and hair analysis with luxury branding consistent with premium salon and beauty magazine standards. It must preserve the person's facial identity exactly while showcasing photorealistic hairstyle simulations and styling recommendations. The target output is a print-ready vertical infographic with a refined editorial aesthetic inspired by Vogue beauty guides, Korean salon analysis boards, and Pinterest premium beauty infographics.

# Requirements
1. **Facial and Hair Analysis**
   - Analyze facial proportions, face shape, hair texture, density, hairline, natural movement, and overall features without altering identity.
   - Automatically identify face shape from options: Oval, Round, Heart, Square, Rectangle, Diamond.

2. **Design Style**
   - Premium beauty consultation report with elegant editorial magazine layout.
   - Color palette: soft beige (#F5F0EA), ivory, cream, warm neutrals.
   - Minimalist typography with elegant serif title font.
   - Luxury salon branding with thin divider lines, rounded cards, subtle shadows.
   - Clean spacing and professional presentation with a consistent grid layout.
   - Pinterest-worthy, high-end infographic design with a consistent icon set.

3. **Layout and Content Sections**
   - **Top Section**:
     - Title: "Hairstyle Analysis"
     - Subtitle: "Find Styles That Flatter You"
     - Prominently display the original portrait centered with subtle face-shape overlays: face contour outline, vertical center line, facial proportion markers.

   - **Left Panel**:
     - **Face Shape**: Include face shape illustration, key characteristics, proportions, jawline, forehead-to-chin ratio.
     - **Hair Goals**: Personalized goals such as framing the face, adding movement or volume, enhancing texture, balancing proportions, softening features.

   - **Right Panel**:
     - **Best Features**: Highlight flattering facial features including eyes, cheekbones, jawline, smile, facial symmetry.
     - **Styling Tips**: Concise recommendations on layer placement, texture, parting, volume, fringe guidance.

   - **Most Flattering Styles Section**:
     - Generate 5 photorealistic hairstyle simulations of the same person with natural salon-quality styling and consistent lighting.
     - Mark each style with a ✓ Recommended badge.
     - Preserve facial identity exactly.

   - **Styles to Consider Section**:
     - Generate alternative photorealistic styles on the same person.
     - Mark as ○ Alternative Option with brief suitability notes.

   - **Best Length Section**:
     - Elegant hair-length guide showing: Chin Length, Collarbone Length, Below Shoulder, Mid Back, Long Length.
     - Highlight the ideal recommended length.

   - **Hair Type Match Section**:
     - Identify natural hair type: Straight, Wavy, Curly, Coily.
     - Explain benefits such as adding volume, enhancing texture, framing face naturally, creating balance.

   - **Best Color Direction Section**:
     - Provide realistic hair color swatches with samples.

   - **Bottom Recommendation Banner**:
     - Highlighted summary with the format:
       "[Recommended Style] + [Texture Recommendation] = Your Best Look"

4. **Visual and Output Specifications**
   - Maintain photorealistic facial and hair rendering without altering identity.
   - Luxury salon consultation aesthetic with professional hairstylist report quality.
   - Editorial beauty magazine quality with premium infographic hierarchy and ultra-detailed hair texture.
   - Consistent grid layout, high readability, modern beauty industry design.
   - Output format: vertical infographic, 4:5 aspect ratio, high resolution, print-ready quality.

5. **Inspirational Style Sources**
   - Vogue beauty guides, Korean salon analysis boards, celebrity hairstylist consultation reports, Pinterest premium beauty infographics, high-end fashion styling presentations.

CRITICAL: Render as ONE finished infographic image. No watermarks. No extra people. No markdown text outside the design.`;

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
  return [...fromTips, ...defaults].slice(0, 5);
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

function buildPipelineDataAppendix(
  faceShape: FaceShapeResult,
  features: FeatureBreakdown,
  hairstyle: HairstyleResult,
): string {
  const recommended = resolveRecommended(hairstyle);
  const alternatives = resolveAlternatives(hairstyle);
  const hairType = hairstyle.hairType ?? "Wavy";
  const tips = hairstyle.stylingTips ?? [];
  const colors = hairstyle.colors.length ? hairstyle.colors.slice(0, 5) : [...DEFAULT_HAIR_COLORS];
  const hairGoals = resolveHairGoals(faceShape, hairstyle);
  const topStyle = recommended[0]?.name ?? "Soft Layers";
  const textureRec = textureLabel(hairType, tips);
  const traits = faceShape.traits.slice(0, 5);

  const recLines = recommended.map((s, i) => `${i + 1}. ${s.name} — ✓ Recommended. ${s.note}`);
  const altLines = alternatives.map((s, i) => `${i + 1}. ${s.name} — ○ Alternative Option. ${s.note}`);
  const lengthLines = hairstyle.lengths.length
    ? hairstyle.lengths.map((l) => `- ${l.name}: ${l.description}`)
    : DEFAULT_LENGTHS.map((l) => `- ${l}`);
  const colorLines = colors.map((c) => `- ${c.name} (${c.hex})`);
  const tipLines = tips.length
    ? tips.map((t) => `- ${t}`)
    : [
        "- Use light layers for movement",
        "- Soft waves add texture",
        "- Side part balances proportions",
      ];

  return [
    "",
    "=== AUTHORITATIVE ANALYSIS DATA (use verbatim on panels — do not contradict) ===",
    `Face shape: ${faceShape.shape}`,
    traits.length ? `Face traits: ${traits.join("; ")}` : "",
    `Hair type: ${hairType}`,
    `Ideal length: ${idealLength(hairstyle)}`,
    "",
    "Hair Goals:",
    ...hairGoals.map((g) => `- ${g}`),
    "",
    "Best Features:",
    `- Eyes: ${features.eyes.shape} — ${features.eyes.notes.split(".").slice(0, 1).join(".")}`,
    `- Cheekbones: ${features.cheeks.shape} — ${features.cheeks.notes.split(".").slice(0, 1).join(".")}`,
    `- Lips: ${features.lips.shape}`,
    "",
    "Styling Tips:",
    ...tipLines,
    "",
    "Most Flattering Styles (photorealistic simulations — same person):",
    ...recLines,
    "",
    "Styles to Consider:",
    ...altLines,
    "",
    "Best Length guide:",
    ...lengthLines,
    `Highlight ideal: ${idealLength(hairstyle)}`,
    "",
    "Hair Type Match:",
    `Type: ${hairType}`,
    "- Benefits: adds volume, enhances texture, frames face naturally, creates balance",
    "",
    "Best Color Direction swatches:",
    ...colorLines,
    "",
    `Bottom banner text: "${topStyle} + ${textureRec} = Your Best Look"`,
    "",
    "CRITICAL: Preserve the person's identity exactly in every panel. Layout from prompt above; copy from this data block.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildHairstyleInfographicPrompt(
  faceShape: FaceShapeResult,
  features: FeatureBreakdown,
  hairstyle: HairstyleResult,
): string {
  return HAIRSTYLE_PROMPT_BASE + buildPipelineDataAppendix(faceShape, features, hairstyle);
}
