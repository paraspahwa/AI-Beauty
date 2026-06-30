import type { ColorAnalysisResult } from "@/types/report";
import { normalizeSeasonKey, SEASON_COLOR_PALETTES } from "@/lib/season-colors";

export const COLOR_PROMPT_VERSION = "color_v3";

type Swatch = { name: string; hex: string };

const COLOR_PROMPT_BASE = `Transform the uploaded portrait into a premium personal color analysis infographic.

Analyze the person's natural coloring including skin undertone, hair color, eye color, contrast level, and overall harmony. Determine the most suitable seasonal color palette and present the results as a luxury fashion consultant report.

Design Style:
- High-end personal styling consultation sheet
- Clean editorial magazine aesthetic
- Soft beige, ivory, cream, and warm neutral background
- Elegant typography with generous spacing
- Minimalist luxury design
- Professional color consultant presentation
- Pinterest-worthy infographic

Layout:

TOP SECTION
- Large title: "Color Analysis"
- Display the original portrait prominently
- Show detected season category (Soft Autumn, Warm Autumn, Soft Summer, Deep Winter, etc.)
- Add color palette circles representing the recommended season
- Include a "Characteristics" section with icons and descriptors such as:
  - Warm / Cool
  - Soft / Bright
  - Light / Deep
- Include "Best Neutrals" swatches

COLOR COMPARISON SECTION

Create realistic clothing color simulations using the same face and hairstyle.

BEST COLORS:
Generate 6 portrait variations wearing recommended colors.

LESS FLATTERING:
Generate 6 portrait variations wearing colors that clash with the season.

Each variation should:
- Preserve the person's facial features exactly
- Change only clothing color
- Look photorealistic
- Include matching color swatches beneath each image

BOTTOM SECTION

BEST METALS:
- Gold
- Rose Gold
- Silver (only if appropriate)

BEST PRINTS:
- 3 pattern examples matching the seasonal palette

BEST MAKEUP:
- Blush recommendation
- Eyeshadow recommendation
- Lip color recommendation

Visual Requirements:
- Fashion magazine quality
- Luxury stylist report
- Consistent grid layout
- Realistic color rendering
- High readability
- Professional infographic design
- Print-ready quality
- Preserve facial identity
- Ultra-detailed portrait quality

Output:
Vertical infographic
4:5 aspect ratio
High resolution
Professional color consultation report

Use the visual quality of a professional color consultant report, House of Colour analysis, luxury fashion stylist portfolio, Pinterest premium infographic, Vogue editorial styling guide, highly realistic color harmonization.

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

CRITICAL: Render as ONE finished infographic image. Preserve identity in every panel. No watermarks. No extra people.`;

function padSwatches(primary: Swatch[], fallback: Swatch[], count: number): Swatch[] {
  const out: Swatch[] = [];
  const seen = new Set<string>();
  for (const s of [...primary, ...fallback]) {
    const key = s.hex.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= count) break;
  }
  return out;
}

function seasonCharacteristics(season: string, undertone: ColorAnalysisResult["undertone"]): string[] {
  const s = season.toLowerCase();
  const temp = undertone === "Warm" ? "Warm" : undertone === "Cool" ? "Cool" : "Neutral";
  const chroma = s.includes("soft") ? "Soft" : s.includes("bright") ? "Bright" : "Muted";
  const value = s.includes("light") ? "Light" : s.includes("deep") ? "Deep" : "Medium";
  return [temp, chroma, value];
}

function neutralSwatches(undertone: ColorAnalysisResult["undertone"], palette: Swatch[]): Swatch[] {
  if (undertone === "Cool") {
    return [
      { name: "Soft White", hex: "#F0EDE8" },
      { name: "Cool Taupe", hex: "#B8A99A" },
      { name: "Charcoal", hex: "#4A4A4A" },
      { name: "Dove Gray", hex: "#9A9A9A" },
      { name: "Navy", hex: "#2C3E50" },
    ];
  }
  if (undertone === "Warm") {
    return [
      { name: "Cream", hex: "#F2E7D7" },
      { name: "Camel", hex: "#D8BE98" },
      { name: "Warm Taupe", hex: "#B79B81" },
      { name: "Olive Taupe", hex: "#8E8168" },
      { name: "Espresso", hex: "#5E4C3D" },
    ];
  }
  return palette.slice(0, 5).length >= 5
    ? palette.slice(0, 5)
    : [
        { name: "Ivory", hex: "#F5F0EA" },
        { name: "Stone", hex: "#C4B8A8" },
        { name: "Mushroom", hex: "#9E8E7E" },
        { name: "Graphite", hex: "#5C534A" },
        { name: "Black Brown", hex: "#3D3229" },
      ];
}

function makeupRecommendations(
  undertone: ColorAnalysisResult["undertone"],
  palette: Swatch[],
): { blush: string; eyeshadow: string; lip: string } {
  const pick = (i: number, fallback: string) =>
    palette[i] ? `${palette[i].name} (${palette[i].hex})` : fallback;

  if (undertone === "Cool") {
    return {
      blush: pick(0, "Dusty Rose Blush"),
      eyeshadow: pick(2, "Cool Mauve / Soft Plum Eyeshadow"),
      lip: pick(1, "Berry / Rose Lip Color"),
    };
  }
  if (undertone === "Warm") {
    return {
      blush: pick(0, "Peachy / Terracotta Blush"),
      eyeshadow: pick(2, "Warm Brown / Bronze Eyeshadow"),
      lip: pick(1, "Coral Nude / Warm Nude Lip"),
    };
  }
  return {
    blush: pick(0, "Soft Rose Blush"),
    eyeshadow: pick(2, "Taupe / Neutral Brown Eyeshadow"),
    lip: pick(1, "Nude Pink Lip Color"),
  };
}

function buildPipelineDataAppendix(color: ColorAnalysisResult): string {
  const seasonKey = normalizeSeasonKey(color.season);
  const fallback = SEASON_COLOR_PALETTES[seasonKey];

  const bestColors = padSwatches(color.palette, fallback?.best ?? [], 6);
  const avoidColors = padSwatches(color.avoidColors, fallback?.avoid ?? [], 6);
  const heroDots = bestColors.slice(0, 4);
  const neutrals = neutralSwatches(color.undertone, bestColors);
  const traits = seasonCharacteristics(color.season, color.undertone);
  const metals = color.metals.length ? color.metals : ["Gold", "Rose Gold"];
  const makeup = makeupRecommendations(color.undertone, bestColors);

  const bestLines = bestColors.map(
    (c, i) => `${i + 1}. ${c.name} (${c.hex}) — same face & hairstyle, clothing only`,
  );
  const avoidLines = avoidColors.map(
    (c, i) => `${i + 1}. ${c.name} (${c.hex}) — clashing clothing color`,
  );

  return [
    "",
    "=== AUTHORITATIVE ANALYSIS DATA (use verbatim — do not contradict) ===",
    `Season category: ${color.season}`,
    `Undertone: ${color.undertone}`,
    color.description ? `Consultant summary: ${color.description}` : "",
    color.clothingObservation
      ? `Clothing in photo: ${color.clothingObservation.color} (${color.clothingObservation.hex}) — ${color.clothingObservation.effect}`
      : "",
    "",
    `Hero palette circles: ${heroDots.map((c) => `${c.name} ${c.hex}`).join(", ")}`,
    "",
    "Characteristics:",
    `- Temperature: ${traits[0]}`,
    `- Chroma: ${traits[1]}`,
    `- Depth: ${traits[2]}`,
    "",
    "Best Neutrals:",
    ...neutrals.map((n) => `- ${n.name} (${n.hex})`),
    "",
    "BEST COLORS row (6 portrait variations):",
    ...bestLines,
    "",
    "LESS FLATTERING row (6 portrait variations):",
    ...avoidLines,
    "",
    "BEST METALS:",
    ...metals.map((m) => `- ${m}`),
    "",
    "BEST PRINTS:",
    `- 3 pattern examples using palette tones: ${bestColors.slice(0, 3).map((c) => c.hex).join(", ")}`,
    "",
    "BEST MAKEUP:",
    `- Blush: ${makeup.blush}`,
    `- Eyeshadow: ${makeup.eyeshadow}`,
    `- Lip color: ${makeup.lip}`,
    "",
    "CRITICAL: Preserve facial identity and hairstyle. Change ONLY clothing color in comparison rows.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildColorInfographicPrompt(color: ColorAnalysisResult): string {
  return COLOR_PROMPT_BASE + buildPipelineDataAppendix(color);
}
