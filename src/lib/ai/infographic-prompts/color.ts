import type { ColorAnalysisResult } from "@/types/report";
import { normalizeSeasonKey, SEASON_COLOR_PALETTES } from "@/lib/season-colors";

export const COLOR_PROMPT_VERSION = "color_v2";

type Swatch = { name: string; hex: string };

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

export function buildColorInfographicPrompt(color: ColorAnalysisResult): string {
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
    (c, i) =>
      `  ${i + 1}. ${c.name} (${c.hex}) — same face & hairstyle, change ONLY clothing to this color; swatch beneath`,
  );

  const avoidLines = avoidColors.map(
    (c, i) =>
      `  ${i + 1}. ${c.name} (${c.hex}) — same face, clashing clothing color; swatch beneath`,
  );

  return [
    "Transform the uploaded portrait into a premium personal color analysis infographic.",
    "Analyze natural coloring (undertone, hair, eyes, contrast) and present results as a luxury fashion consultant report.",
    "",
    "CRITICAL: Preserve the person's facial features and hairstyle exactly in every panel — change ONLY clothing color in comparison rows.",
    "",
    "=== PIPELINE DATA (use exactly — do not assign a different season) ===",
    `Season category: ${color.season}`,
    `Undertone: ${color.undertone}`,
    color.description ? `Consultant summary: ${color.description}` : "",
    color.clothingObservation
      ? `Clothing in photo: ${color.clothingObservation.color} (${color.clothingObservation.hex}) — ${color.clothingObservation.effect} on this person`
      : "",
    "",
    "=== DESIGN STYLE ===",
    "- High-end personal styling consultation sheet, clean editorial magazine aesthetic",
    "- Soft beige background #F5F0EA, ivory, cream, warm neutral tones",
    "- Elegant serif title with generous spacing, minimalist luxury design",
    "- Thin divider lines, rounded cards, subtle shadows, consistent icon set",
    "- Pinterest-worthy, professional color consultant presentation",
    "",
    "=== TOP SECTION ===",
    "- Large title: \"Color Analysis\"",
    "- Display the original portrait prominently",
    `- Detected season badge: ${color.season}`,
    `- Hero palette circles: ${heroDots.map((c) => `${c.name} ${c.hex}`).join(", ")}`,
    "",
    "Characteristics (icons + labels):",
    `  - Temperature: ${traits[0]}`,
    `  - Chroma: ${traits[1]}`,
    `  - Depth: ${traits[2]}`,
    "",
    "Best Neutrals swatches:",
    ...neutrals.map((n) => `  - ${n.name} (${n.hex})`),
    "",
    "=== COLOR COMPARISON SECTION ===",
    "Realistic clothing color simulations — same face and hairstyle, photorealistic.",
    "",
    "BEST COLORS row (6 portrait variations):",
    ...bestLines,
    "",
    "LESS FLATTERING row (6 portrait variations):",
    ...avoidLines,
    "",
    "=== BOTTOM SECTION ===",
    "",
    "BEST METALS:",
    ...metals.map((m) => `  - ${m}`),
    "",
    "BEST PRINTS:",
    "  - 3 circular pattern examples harmonizing with the seasonal palette (e.g. soft floral, muted geometric, tonal stripe)",
    `  - Use palette tones: ${bestColors.slice(0, 3).map((c) => c.hex).join(", ")}`,
    "",
    "BEST MAKEUP:",
    `  - Blush: ${makeup.blush}`,
    `  - Eyeshadow: ${makeup.eyeshadow}`,
    `  - Lip color: ${makeup.lip}`,
    "",
    "=== VISUAL REQUIREMENTS ===",
    "- Fashion magazine quality, luxury stylist report, consistent grid layout",
    "- Realistic color rendering, high readability, professional infographic design",
    "- Vertical 4:5 aspect ratio, high resolution, print-ready",
    "- Ultra-detailed portrait quality, no watermarks, no brand logos",
    "- Inspired by House of Colour, luxury fashion stylist portfolio, Vogue editorial styling guide",
  ]
    .filter(Boolean)
    .join("\n");
}
