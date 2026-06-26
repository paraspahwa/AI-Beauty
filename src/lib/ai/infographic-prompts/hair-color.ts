import type { ColorAnalysisResult, FeatureBreakdown, HairstyleResult } from "@/types/report";
import { normalizeSeasonKey, SEASON_COLOR_PALETTES } from "@/lib/season-colors";

export const HAIR_COLOR_PROMPT_VERSION = "hair_color_v1";

type Swatch = { name: string; hex: string; description?: string };

const BEST_HAIR_COLORS: Swatch[] = [
  { name: "Soft Black", hex: "#1C1A18" },
  { name: "Espresso Black", hex: "#2A1F1A" },
  { name: "Dark Chocolate", hex: "#3B2A1F" },
  { name: "Mocha Brown", hex: "#4A3228" },
  { name: "Chestnut Brown", hex: "#6B3A2A" },
  { name: "Cinnamon Brown", hex: "#7A4A32" },
  { name: "Warm Brown", hex: "#6F4E37" },
  { name: "Caramel Brown", hex: "#A67B4A" },
  { name: "Honey Brown", hex: "#B8864A" },
  { name: "Golden Brown", hex: "#C49A3C" },
  { name: "Toffee Brown", hex: "#9E6B45" },
  { name: "Hazelnut Brown", hex: "#8B6B4A" },
  { name: "Auburn", hex: "#8B3A2A" },
  { name: "Copper", hex: "#B85C38" },
  { name: "Rich Mahogany", hex: "#5C2A2A" },
  { name: "Bronze Brown", hex: "#7A5238" },
  { name: "Warm Balayage", hex: "#C4956A" },
  { name: "Honey Balayage", hex: "#D4A574" },
  { name: "Caramel Highlights", hex: "#C9A06A" },
  { name: "Face Framing Highlights", hex: "#DDB87A" },
];

const TRENDING_COLORS = [
  "Expensive Brunette",
  "Mocha Mousse",
  "Teddy Bear Brown",
  "Cinnamon Spice",
  "Old Money Brunette",
  "Luxe Caramel Balayage",
] as const;

const AVOID_HAIR_COLORS: Swatch[] = [
  { name: "Ash Blonde", hex: "#C8B8A0" },
  { name: "Platinum Blonde", hex: "#E8E4DC" },
  { name: "Silver Grey", hex: "#A8A8A8" },
  { name: "Blue Black", hex: "#1A1A2E" },
  { name: "Burgundy", hex: "#6B1A3A" },
  { name: "Violet", hex: "#6B3A8B" },
  { name: "Neon Red", hex: "#E82020" },
  { name: "Cool Ash Brown", hex: "#6B6B5A" },
];

const HIGHLIGHT_TECHNIQUES = [
  "Money Piece",
  "Babylights",
  "Balayage",
  "Ombre",
  "Face Framing Highlights",
  "Ribbon Highlights",
] as const;

const COLOR_DIMENSIONS = [
  "Solid Color",
  "Balayage",
  "Ombre",
  "Babylights",
  "Multi-Tonal Brunette",
] as const;

const CLOTHING_PALETTE: Swatch[] = [
  { name: "Cream", hex: "#F5F0EA" },
  { name: "Camel", hex: "#C4A574" },
  { name: "Olive", hex: "#6B6B3A" },
  { name: "Chocolate", hex: "#4A3228" },
  { name: "Rust", hex: "#A84425" },
  { name: "Terracotta", hex: "#C2673A" },
  { name: "Sage", hex: "#8B9A7A" },
  { name: "Warm Teal", hex: "#3E8FA0" },
  { name: "Dusty Peach", hex: "#E8B89A" },
  { name: "Honey Gold", hex: "#D4A03C" },
];

function padSwatches(primary: Swatch[], fallback: Swatch[], count: number): Swatch[] {
  const out: Swatch[] = [];
  const seen = new Set<string>();
  for (const s of [...primary, ...fallback]) {
    const key = s.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= count) break;
  }
  return out;
}

function profileSliders(color: ColorAnalysisResult) {
  const season = color.season.toLowerCase();
  const warmth =
    color.undertone === "Warm" ? 78 : color.undertone === "Cool" ? 22 : 50;
  const contrast =
    season.includes("bright") || season.includes("deep") || season.includes("winter")
      ? 82
      : season.includes("soft")
        ? 32
        : 55;
  const brightness =
    season.includes("light") || season.includes("spring") ? 72 : season.includes("deep") ? 28 : 50;
  const saturation =
    season.includes("soft") || season.includes("muted") ? 34 : season.includes("bright") ? 86 : 52;
  return { warmth, contrast, brightness, saturation };
}

function colorClarity(season: string): string {
  const s = season.toLowerCase();
  if (s.includes("bright")) return "Clear / Bright";
  if (s.includes("soft")) return "Soft / Muted";
  return "Balanced";
}

function contrastLevel(sliders: ReturnType<typeof profileSliders>): string {
  if (sliders.contrast >= 70) return "High";
  if (sliders.contrast <= 40) return "Low";
  return "Medium";
}

function extractEyeColor(features: FeatureBreakdown): string {
  const notes = features.eyes.notes;
  const match = notes.match(
    /\b(brown|blue|green|hazel|amber|grey|gray|black|dark|light)\b[^.]*\b(eye|iris|eyes)?/i,
  );
  if (match) return match[0].replace(/\.$/, "");
  const first = notes.split(".")[0]?.trim();
  return first && first.length < 80 ? first : "Natural iris tone from photo";
}

function resolveBestHairColors(hairstyle: HairstyleResult): Swatch[] {
  const fromPipeline = hairstyle.colors.map((c) => ({
    name: c.name,
    hex: c.hex,
    description: c.description,
  }));
  return padSwatches(fromPipeline, BEST_HAIR_COLORS, 20);
}

function resolveAvoidColors(color: ColorAnalysisResult): Swatch[] {
  const fromPipeline = color.avoidColors.map((c) => ({ name: c.name, hex: c.hex }));
  return padSwatches(fromPipeline, AVOID_HAIR_COLORS, 8);
}

function bestHighlightTechnique(undertone: ColorAnalysisResult["undertone"]): string {
  if (undertone === "Warm") return "Balayage";
  if (undertone === "Cool") return "Face Framing Highlights";
  return "Babylights";
}

function bestColorDimension(undertone: ColorAnalysisResult["undertone"]): string {
  if (undertone === "Warm") return "Balayage";
  if (undertone === "Cool") return "Multi-Tonal Brunette";
  return "Balayage";
}

function finalRecommendation(hairstyle: HairstyleResult, bestColors: Swatch[]) {
  const primary = bestColors[0]?.name ?? "Chestnut Brown";
  const secondary =
    bestColors.find((c) => c.name.toLowerCase().includes("balayage"))?.name ??
    hairstyle.colors.find((c) => c.name.toLowerCase().includes("balayage"))?.name ??
    "Caramel Balayage";
  const accent =
    bestColors.find((c) => c.name.toLowerCase().includes("highlight"))?.name ??
    "Face Framing Highlights";
  return { primary, secondary, accent };
}

function harmonyScore(color: ColorAnalysisResult): number {
  const season = color.season.toLowerCase();
  if (season.includes("soft") || season.includes("muted")) return 91;
  if (season.includes("bright") || season.includes("deep")) return 94;
  return 92;
}

function clothingPalette(color: ColorAnalysisResult): Swatch[] {
  const seasonKey = normalizeSeasonKey(color.season);
  const fallback = SEASON_COLOR_PALETTES[seasonKey];
  const fromSeason = (fallback?.best ?? []).map((c) => ({ name: c.name, hex: c.hex }));
  return padSwatches(fromSeason, CLOTHING_PALETTE, 10);
}

export function buildHairColorInfographicPrompt(
  color: ColorAnalysisResult,
  features: FeatureBreakdown,
  hairstyle: HairstyleResult,
): string {
  const sliders = profileSliders(color);
  const bestColors = resolveBestHairColors(hairstyle);
  const avoidColors = resolveAvoidColors(color);
  const eyeColor = extractEyeColor(features);
  const metals = color.metals.length ? color.metals : ["Gold", "Rose Gold", "Silver"];
  const idealMetal = metals[0] ?? "Gold";
  const highlightPick = bestHighlightTechnique(color.undertone);
  const dimensionPick = bestColorDimension(color.undertone);
  const final = finalRecommendation(hairstyle, bestColors);
  const harmony = harmonyScore(color);
  const clothing = clothingPalette(color);

  const bestLines = bestColors.map(
    (c, i) =>
      `  ${i + 1}. ${c.name} (${c.hex}) — photorealistic hair color on same person; swatch above; salon-quality shine${c.description ? `; ${c.description}` : ""}`,
  );

  const trendingLines = TRENDING_COLORS.map(
    (name, i) => `  ${i + 1}. ${name} — premium trend example on same person`,
  );

  const avoidLines = avoidColors.map(
    (c, i) =>
      `  ${i + 1}. ${c.name} (${c.hex}) — less harmonious; brief note: clashes with ${color.undertone.toLowerCase()} undertone / ${color.season} coloring`,
  );

  const highlightLines = HIGHLIGHT_TECHNIQUES.map((t) => {
    const mark = t === highlightPick ? " ★ BEST CHOICE" : "";
    return `  - ${t}${mark}`;
  });

  const dimensionLines = COLOR_DIMENSIONS.map((d) => {
    const mark = d === dimensionPick ? " ✓ RECOMMENDED" : "";
    return `  - ${d}${mark}`;
  });

  const metalLines = metals.map((m) => {
    const mark = m === idealMetal || m.includes(idealMetal.split(" ")[0]) ? " ★ IDEAL" : "";
    return `  - ${m}${mark}`;
  });

  return [
    "Transform the uploaded portrait into an ultra-premium Hair Color Analysis Report — a luxury salon colorist consultation infographic.",
    "",
    "CRITICAL: Preserve the person's facial identity exactly in every hair color simulation. Same pose, same lighting, realistic hair texture and natural shine.",
    "Do NOT re-analyze season or undertone — use pipeline data below. Layout and photorealistic hair visualization only.",
    "",
    "=== PIPELINE DATA (authoritative) ===",
    `Seasonal coloring: ${color.season}`,
    `Skin undertone: ${color.undertone}`,
    `Eye color: ${eyeColor}`,
    `Hair depth: ${hairstyle.hairType ? `${hairstyle.hairType} texture` : "Natural depth from photo"}`,
    `Contrast level: ${contrastLevel(sliders)}`,
    color.description ? `Color harmony summary: ${color.description}` : "",
    "",
    "=== DESIGN STYLE ===",
    "- Modern luxury beauty report, Vogue editorial quality, premium salon consultation board",
    "- Soft beige background #F5F0EA, rich color accents, warm neutral palette",
    "- Elegant serif title, minimalist luxury typography, thin dividers, rounded cards, subtle shadows",
    "- Extremely colorful, large swatches, Pinterest viral aesthetic, consistent icon set",
    "",
    "=== TITLE ===",
    "- HAIR COLOR ANALYSIS REPORT",
    "- Subtitle: Personalized color recommendations tailored to your natural features",
  "",
    "=== YOUR COLOR PROFILE ===",
    `Undertone: ${color.undertone}`,
    `Contrast: ${contrastLevel(sliders)}`,
    `Color Temperature: ${color.undertone === "Warm" ? "Warm" : color.undertone === "Cool" ? "Cool" : "Neutral"}`,
    `Color Clarity: ${colorClarity(color.season)}`,
    `Saturation Level: ${sliders.saturation >= 60 ? "Medium-High" : sliders.saturation <= 40 ? "Soft-Low" : "Balanced"}`,
    "",
    "Visual sliders (labeled bars):",
    `  • Warmth: ${sliders.warmth}%`,
    `  • Contrast: ${sliders.contrast}%`,
    `  • Brightness: ${sliders.brightness}%`,
    `  • Saturation: ${sliders.saturation}%`,
    "",
    "=== BEST HAIR COLORS FOR YOU ===",
    "Grid of 20 photorealistic hair color transformations — same person, salon-quality coloring:",
    ...bestLines,
    "",
    "=== TRENDING COLOR MATCHES ===",
    ...trendingLines,
    "",
    "=== COLORS TO AVOID ===",
    "Eight less harmonious simulations with brief why-not notes:",
    ...avoidLines,
    "",
    "=== HIGHLIGHT ANALYSIS ===",
    "Six highlight technique examples on the same person:",
    ...highlightLines,
    "",
    "=== BEST COLOR DIMENSION ===",
    "Compare technique types — mark recommended:",
    ...dimensionLines,
    "",
    "=== COLOR WHEEL ===",
    `Show Warm / Neutral / Cool shade zones; mark user placement: ${color.undertone} (${color.season})`,
    "",
    "=== BEST METALS ===",
    ...metalLines,
    "",
    "=== BEST CLOTHING COLORS ===",
    "Matching wardrobe palette swatches:",
    ...clothing.map((c) => `  - ${c.name} (${c.hex})`),
    "",
    "=== MAINTENANCE GUIDE ===",
    `For top recommendation "${final.primary}": touch-up every 6–8 weeks, maintenance level Medium, salon visits 4–6×/year, slow fade`,
    `For "${final.secondary}": touch-up every 10–14 weeks, maintenance Medium-High, balayage refresh 2–3×/year`,
    "Use visual rating scales (1–5 dots) for each row",
    "",
    "=== SALON EXPERT NOTES ===",
    `  • Best gloss treatment: ${color.undertone === "Warm" ? "Honey glaze / amber gloss" : "Pearl ash gloss / cool toner"}`,
    `  • Best toning strategy: ${color.undertone === "Cool" ? "Violet-ash toner to neutralize warmth" : "Gold-copper gloss to enrich warmth"}`,
    "  • Best root blend: seamless shadow root / lived-in blend",
    "  • Best shine enhancement: keratin gloss + bond treatment",
    "  • Best color refresh schedule: every 8–12 weeks for dimension, 4–6 weeks for solid color",
    "",
    "=== FINAL RECOMMENDATION BANNER ===",
    "Large premium banner — YOUR BEST COLOR DIRECTION:",
    `${final.primary.toUpperCase()}`,
    `+ ${final.secondary.toUpperCase()}`,
    `+ ${final.accent.toUpperCase()}`,
    `Confidence indicator: ${harmony}%  |  Color harmony score: ${harmony}/100`,
    "",
    "=== OUTPUT ===",
    "- Large vertical 4:5 aspect ratio, ultra HD, print-ready, luxury salon consultation report",
    "- Ultra-high detail hair rendering, professional colorist presentation",
    "- No watermarks, no markdown — render as one finished infographic image",
  ]
    .filter(Boolean)
    .join("\n");
}
