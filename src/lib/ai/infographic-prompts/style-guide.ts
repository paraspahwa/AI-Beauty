import type { ColorAnalysisResult, FaceShapeResult, FeatureBreakdown } from "@/types/report";
import { normalizeSeasonKey, SEASON_COLOR_PALETTES } from "@/lib/season-colors";

export const STYLE_GUIDE_PROMPT_VERSION = "style_guide_v1";

type Swatch = { name: string; hex: string };

const STYLE_CATEGORIES = [
  "Old Money",
  "Quiet Luxury",
  "Boho Chic",
  "Glamour",
  "Minimalist",
  "Classic Elegant",
  "Romantic",
  "Feminine Chic",
  "Street Style",
  "Sport Chic",
  "Casual Effortless",
  "Business Chic",
  "Edgy Avant-Garde",
  "Soft Girl / Coquette",
] as const;

const VIBE_TRAITS = [
  "Sophisticated",
  "Effortless",
  "Refined",
  "Feminine",
  "Modern",
  "Elegant",
  "Magnetic",
  "Confident",
  "Creative",
  "Soft",
  "Timeless",
] as const;

const WARDROBE_ESSENTIALS = [
  "Blazer",
  "Tailored Trousers",
  "Silk Top",
  "White Shirt",
  "Knitwear",
  "Trench Coat",
  "Jeans",
  "Midi Dress",
  "Leather Jacket",
  "Timeless Handbag",
] as const;

const OUTFIT_SIMULATIONS = [
  "Quiet Luxury Outfit",
  "Classic Elegant Outfit",
  "Feminine Chic Outfit",
  "Minimalist Outfit",
  "Soft Glam Outfit",
  "Business Chic Outfit",
  "Casual Luxury Outfit",
  "Evening Elegant Outfit",
] as const;

const CAPSULE_CONTEXTS = ["Work", "Casual", "Date Night", "Travel", "Weekend"] as const;

const SEASON_STYLE_RANK: Record<string, string[]> = {
  spring: ["Feminine Chic", "Romantic", "Casual Effortless", "Soft Girl / Coquette", "Classic Elegant"],
  summer: ["Quiet Luxury", "Romantic", "Classic Elegant", "Minimalist", "Feminine Chic"],
  autumn: ["Old Money", "Boho Chic", "Casual Effortless", "Classic Elegant", "Quiet Luxury"],
  winter: ["Glamour", "Business Chic", "Edgy Avant-Garde", "Classic Elegant", "Minimalist"],
};

const FACE_SILHOUETTES: Record<string, string[]> = {
  Oval: ["Balanced Proportions", "Relaxed Tailoring", "Soft Draping", "Fitted Waist"],
  "Soft Oval": ["Balanced Proportions", "Soft Draping", "Relaxed Tailoring", "Fitted Waist"],
  Round: ["Structured Tailoring", "Long Vertical Lines", "Relaxed Tailoring", "Balanced Proportions"],
  Square: ["Soft Draping", "Long Vertical Lines", "Relaxed Tailoring", "Fitted Waist"],
  Heart: ["Fitted Waist", "Soft Draping", "Balanced Proportions", "Long Vertical Lines"],
  Diamond: ["Structured Tailoring", "Fitted Waist", "Long Vertical Lines", "Balanced Proportions"],
  Oblong: ["Soft Draping", "Balanced Proportions", "Relaxed Tailoring", "Long Vertical Lines"],
  Triangle: ["Structured Tailoring", "Long Vertical Lines", "Balanced Proportions", "Relaxed Tailoring"],
};

function seasonFamily(season: string): string {
  const s = season.toLowerCase();
  if (s.includes("spring")) return "spring";
  if (s.includes("summer")) return "summer";
  if (s.includes("autumn")) return "autumn";
  if (s.includes("winter")) return "winter";
  return "autumn";
}

function rankStyles(color: ColorAnalysisResult, faceShape: FaceShapeResult): string[] {
  const base = [...(SEASON_STYLE_RANK[seasonFamily(color.season)] ?? SEASON_STYLE_RANK.autumn)];
  if (color.undertone === "Cool" && !base.includes("Minimalist")) {
    base.splice(3, 0, "Minimalist");
  }
  if (color.undertone === "Warm" && !base.includes("Old Money")) {
    base.splice(1, 0, "Old Money");
  }
  const shape = faceShape.shape;
  if (shape === "Square" || shape === "Oblong") {
    if (!base.includes("Business Chic")) base.push("Business Chic");
  }
  if (shape === "Round" || shape === "Heart") {
    if (!base.includes("Feminine Chic")) base.unshift("Feminine Chic");
  }
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const style of base) {
    const key = style.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(style);
    if (unique.length >= 5) break;
  }
  for (const cat of STYLE_CATEGORIES) {
    if (unique.length >= 5) break;
    if (!seen.has(cat.toLowerCase())) {
      seen.add(cat.toLowerCase());
      unique.push(cat);
    }
  }
  return unique.slice(0, 5);
}

function vibeTraits(color: ColorAnalysisResult, faceShape: FaceShapeResult): string[] {
  const traits: string[] = [];
  const season = color.season.toLowerCase();
  if (season.includes("soft")) traits.push("Soft", "Refined", "Elegant");
  if (season.includes("bright") || season.includes("deep")) traits.push("Confident", "Magnetic");
  if (season.includes("light")) traits.push("Effortless", "Feminine");
  if (color.undertone === "Warm") traits.push("Sophisticated", "Timeless");
  if (color.undertone === "Cool") traits.push("Modern", "Refined");
  if (faceShape.shape === "Oval") traits.push("Effortless", "Timeless");
  const unique = [...new Set(traits.filter((t) => VIBE_TRAITS.includes(t as (typeof VIBE_TRAITS)[number])))];
  const padded = [...unique];
  for (const t of VIBE_TRAITS) {
    if (padded.length >= 5) break;
    if (!padded.includes(t)) padded.push(t);
  }
  return padded.slice(0, 5);
}

function silhouettes(faceShape: FaceShapeResult): string[] {
  return FACE_SILHOUETTES[faceShape.shape] ?? [
    "Balanced Proportions",
    "Relaxed Tailoring",
    "Soft Draping",
    "Long Vertical Lines",
  ];
}

function colorGroups(color: ColorAnalysisResult) {
  const seasonKey = normalizeSeasonKey(color.season);
  const fallback = SEASON_COLOR_PALETTES[seasonKey];
  const best = color.palette.length ? color.palette : (fallback?.best ?? []);
  const avoid = color.avoidColors.length ? color.avoidColors : (fallback?.avoid ?? []);

  const neutrals = best.slice(0, 4);
  const accents = best.slice(4, 8).length ? best.slice(4, 8) : best.slice(0, 4);
  const seasonal = best.slice(0, 6);
  const statement = best.filter((c) =>
    ["burgundy", "emerald", "coral", "rust", "teal", "fuchsia"].some((k) =>
      c.name.toLowerCase().includes(k),
    ),
  );
  const stmt = statement.length ? statement.slice(0, 3) : accents.slice(0, 3);

  return { neutrals, accents, seasonal, statement: stmt, avoid: avoid.slice(0, 6) };
}

function styleNotes(
  color: ColorAnalysisResult,
  faceShape: FaceShapeResult,
  features: FeatureBreakdown,
): string[] {
  const undertone = color.undertone;
  return [
    `Best fabrics: ${undertone === "Warm" ? "cashmere, silk, linen, brushed cotton" : undertone === "Cool" ? "crisp cotton, silk crepe, fine wool, matte jersey" : "silk blends, soft wool, quality cotton, modal"}`,
    `Best outfit structure: ${faceShape.shape === "Oblong" ? "horizontal layering to add width" : faceShape.shape === "Round" ? "vertical lines and structured shoulders" : "balanced proportions with defined waist or clean drape"}`,
    `Ideal necklines: ${features.lips.shape.toLowerCase().includes("full") ? "V-neck, scoop, portrait collar" : "boat neck, soft square, classic crew"}`,
    "Ideal layering: lightweight base + structured outer layer + one statement accessory",
    `Recommended textures: ${undertone === "Warm" ? "warm matte, brushed, tactile knits" : "smooth, crisp, subtle sheen"}`,
    `Best accessory approach: ${color.metals[0] ?? "Gold"} metals, refined scale, one focal piece`,
  ];
}

function overallIdentity(topStyles: string[]): { label: string; description: string } {
  const primary = topStyles[0] ?? "Classic Elegant";
  const secondary = topStyles[1] ?? "Quiet Luxury";
  return {
    label: `${primary} + ${secondary}`,
    description: `A ${primary.toLowerCase()} foundation with ${secondary.toLowerCase()} influence — polished, intentional, and unmistakably yours.`,
  };
}

export function buildStyleGuideInfographicPrompt(
  color: ColorAnalysisResult,
  faceShape: FaceShapeResult,
  features: FeatureBreakdown,
  summary?: string,
): string {
  const topStyles = rankStyles(color, faceShape);
  const vibes = vibeTraits(color, faceShape);
  const sils = silhouettes(faceShape);
  const colors = colorGroups(color);
  const notes = styleNotes(color, faceShape, features);
  const identity = overallIdentity(topStyles);
  const metals = color.metals.length ? color.metals : ["Gold", "Rose Gold", "Silver"];

  const categoryLines = STYLE_CATEGORIES.map((c) => {
    const rank = topStyles.indexOf(c);
    const mark = rank === 0 ? " ★ PRIMARY" : rank > 0 ? ` (Top ${rank + 1})` : "";
    return `  - ${c}${mark} — fashion inspiration thumbnail`;
  });

  const vibeLines = VIBE_TRAITS.map((t) => {
    const mark = vibes.includes(t) ? " ★ HIGHLIGHT" : "";
    return `  - ${t}${mark}`;
  });

  const rankLines = topStyles.map((s, i) => {
    const labels = [
      "Primary Style Identity",
      "Secondary Style Identity",
      "Third Style Influence",
      "Fourth Style Influence",
      "Fifth Style Influence",
    ];
    return `  ${i + 1}. ${labels[i]}: ${s} — representative outfit imagery`;
  });

  const outfitLines = OUTFIT_SIMULATIONS.map(
    (o, i) =>
      `  ${i + 1}. ${o} — same person, photorealistic styling, preserve identity exactly`,
  );

  const capsuleLines = CAPSULE_CONTEXTS.map(
    (ctx) => `  - ${ctx}: 4–5 coordinated pieces in recommended palette`,
  );

  const swatchBlock = (label: string, swatches: Swatch[]) =>
    swatches.length
      ? [`${label}:`, ...swatches.map((c) => `  - ${c.name} (${c.hex})`)]
      : [];

  return [
    "Transform the uploaded photo into a luxury personal style analysis board — a premium fashion stylist consultation infographic.",
    "",
    "CRITICAL: Preserve the person's facial identity exactly in the hero image and every outfit simulation. Fashion photography quality.",
    "Do NOT re-analyze coloring or face shape — use pipeline data below. Layout and photorealistic styling visualization only.",
    "",
    "=== PIPELINE DATA (authoritative) ===",
    `Face shape: ${faceShape.shape}`,
    faceShape.traits.length ? `Proportions: ${faceShape.traits.join("; ")}` : "",
    `Seasonal coloring: ${color.season} (${color.undertone} undertone)`,
    color.description ? `Color harmony: ${color.description}` : "",
    color.clothingObservation
      ? `Current clothing harmony: ${color.clothingObservation.color} — ${color.clothingObservation.effect}`
      : "",
    summary ? `Stylist summary: ${summary}` : "",
    `Eyes: ${features.eyes.shape} | Lips: ${features.lips.shape} | Cheeks: ${features.cheeks.shape}`,
    "",
    "=== DESIGN STYLE ===",
    "- Editorial fashion magazine quality, Vogue-inspired styling board",
    "- Soft beige background #F5F0EA, cream, ivory, warm neutral palette",
    "- Elegant serif title, sophisticated typography, thin dividers, rounded cards, subtle shadows",
    "- Clean grid-based infographic, premium Pinterest aesthetic, high-end visual merchandising",
    "",
    "=== MAIN TITLE ===",
    "- Style Analysis Board",
    "- Subtitle: Timeless • Refined • Confident",
    "",
    "=== STYLE CATEGORIES ===",
    "Fourteen fashion inspiration thumbnails:",
    ...categoryLines,
    "",
    "=== YOUR VIBE ===",
    "Personalized style personality — highlight strongest traits:",
    ...vibeLines,
    "",
    "=== BEST STYLE MATCHES ===",
    "Rank top five styles with outfit imagery:",
    ...rankLines,
    "",
    "=== MAIN HERO IMAGE ===",
    `Center the user prominently — transform clothing into luxury editorial look aligned with "${topStyles[0]}".`,
    "Maintain facial identity exactly. Fashion photography lighting and quality.",
    "",
    "=== COLOR PALETTE ===",
    ...swatchBlock("Neutrals", colors.neutrals),
    ...swatchBlock("Accent colors", colors.accents),
    ...swatchBlock("Seasonal colors", colors.seasonal),
    ...swatchBlock("Statement colors", colors.statement),
    "",
    "Colors To Avoid:",
    ...colors.avoid.map((c) => `  - ${c.name} (${c.hex})`),
    "",
    "=== BODY SILHOUETTE GUIDE ===",
    "Elegant fashion illustrations for recommended silhouettes:",
    ...sils.map((s) => `  - ${s}`),
    "",
    "=== KEY WARDROBE PIECES ===",
    "Realistic product-style visuals:",
    ...WARDROBE_ESSENTIALS.map((p) => `  - ${p}`),
    "",
    "=== YOU IN YOUR STYLES ===",
    "Eight photorealistic outfit simulations — same person:",
    ...outfitLines,
    "",
    "=== ACCESSORIES ===",
    `Jewelry (${metals.join(", ")} metals), Watches, Sunglasses, Belts, Handbags, Shoes — luxury accessory visuals`,
    "",
    "=== CAPSULE WARDROBE ===",
    ...capsuleLines,
    "",
    "=== STYLE NOTES ===",
    ...notes.map((n) => `  - ${n}`),
    "",
    "=== OVERALL STYLE IDENTITY ===",
    `Final luxury summary: "${identity.label}"`,
    identity.description,
    "",
    "=== OUTPUT ===",
    "- Large vertical infographic, high resolution, poster quality, print-ready",
    "- Luxury fashion consultant report, ultra-detailed clothing rendering",
    "- No watermarks, no markdown — render as one finished infographic image",
  ]
    .filter(Boolean)
    .join("\n");
}
