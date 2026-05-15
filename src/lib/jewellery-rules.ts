/**
 * Jewellery recommendation rule engine — pure, client-safe, no API calls.
 * Runs entirely from existing report data (FaceShapeResult + ColorAnalysisResult).
 */

import type { FaceShape, ColorSeason } from "@/types/report";
import type {
  JewelleryGuide,
  JewelleryRecommendation,
  JewelleryProduct,
  JewelleryCategory,
  EarringStyle,
  NecklaceStyle,
  MetalTone,
} from "@/types/jewellery";
import type { FaceShapeResult, ColorAnalysisResult } from "@/types/report";
import { JEWELLERY_CATALOG } from "@/lib/jewellery-affiliates";

// ── Face shape → earring rules ────────────────────────────────────────────────

const FACE_EARRING_RULES: Record<FaceShape, {
  recommend: EarringStyle[];
  avoid: EarringStyle[];
  reason: string;
}> = {
  Oval:       { recommend: ["drops", "chandelier", "hoops", "jhumkas"], avoid: [],                     reason: "Oval faces are the most versatile — long or ornate earrings enhance your balanced proportions." },
  "Soft Oval":{ recommend: ["drops", "jhumkas", "studs"],               avoid: [],                     reason: "Your softly oval shape suits most styles; drops and jhumkas add graceful length." },
  Round:      { recommend: ["drops", "chandelier", "threader"],         avoid: ["studs", "hoops"],     reason: "Long drop earrings elongate a round face and draw the eye vertically." },
  Square:     { recommend: ["drops", "jhumkas", "threader"],            avoid: ["studs"],              reason: "Curved and elongated styles soften a strong, angular jawline." },
  Heart:      { recommend: ["drops", "chandelier", "jhumkas"],          avoid: ["studs"],              reason: "Earrings that widen at the base balance a narrower chin beautifully." },
  Diamond:    { recommend: ["studs", "hoops", "drops"],                 avoid: ["chandelier"],         reason: "Studs and modest hoops complement high cheekbones without adding width at the widest point." },
  Oblong:     { recommend: ["studs", "hoops", "chandelier"],            avoid: ["drops", "threader"],  reason: "Wide or short styles add width, balancing an elongated face." },
  Triangle:   { recommend: ["drops", "chandelier"],                     avoid: ["studs"],              reason: "Earrings that taper toward the top balance a wider jaw." },
};

// ── Face shape → necklace rules ───────────────────────────────────────────────

const FACE_NECKLACE_RULES: Record<FaceShape, {
  recommend: NecklaceStyle[];
  avoid: NecklaceStyle[];
  reason: string;
}> = {
  Oval:       { recommend: ["pendant", "layered", "princess"],     avoid: [],           reason: "Any length works beautifully; pendants draw attention to your balanced neckline." },
  "Soft Oval":{ recommend: ["pendant", "princess"],                avoid: [],           reason: "Princess-length and pendants are universally flattering on you." },
  Round:      { recommend: ["matinee", "pendant", "layered"],      avoid: ["choker"],   reason: "Longer chains create a vertical line that elongates the face." },
  Square:     { recommend: ["pendant", "matinee"],                 avoid: ["choker"],   reason: "V-shaped pendants soften angular features." },
  Heart:      { recommend: ["matinee", "layered", "choker"],       avoid: [],           reason: "Layered chains draw the eye downward and balance a wider forehead." },
  Diamond:    { recommend: ["princess", "pendant", "choker"],      avoid: ["matinee"],  reason: "Short-to-mid lengths highlight the jaw and minimise cheekbone width." },
  Oblong:     { recommend: ["choker", "princess"],                 avoid: ["matinee", "layered"], reason: "Short necklaces add perceived width, balancing facial length." },
  Triangle:   { recommend: ["choker", "princess", "layered"],      avoid: ["pendant"],  reason: "Short to mid-length styles shift attention upward." },
};

// ── Color season → gemstone color map ────────────────────────────────────────

const SEASON_GEMSTONES: Partial<Record<ColorSeason, string[]>> = {
  "Spring":         ["coral", "turquoise", "peach crystal", "citrine"],
  "Light Spring":   ["rose quartz", "peach crystal", "aquamarine", "warm pearl"],
  "Bright Spring":  ["red coral", "turquoise", "bright citrine", "hot pink crystal"],
  "Summer":         ["amethyst", "lavender", "powder blue", "rose pearl"],
  "Soft Summer":    ["rose quartz", "lavender amethyst", "dusty pink crystal", "soft moonstone"],
  "Light Summer":   ["lavender", "powder blue crystal", "soft amethyst", "blush pearl"],
  "Autumn":         ["amber", "topaz", "carnelian", "tiger eye"],
  "Soft Autumn":    ["peach moonstone", "rose quartz", "coral", "warm agate"],
  "Deep Autumn":    ["garnet", "amber", "dark coral", "smoky quartz"],
  "Winter":         ["garnet", "sapphire", "emerald", "onyx", "ruby"],
  "Deep Winter":    ["ruby", "garnet", "emerald", "black onyx", "dark sapphire"],
  "Bright Winter":  ["electric blue crystal", "fuchsia", "emerald", "clear rhinestone"],
};

// ── Undertone → metal tone ────────────────────────────────────────────────────

function resolveMetalTone(undertone: "Warm" | "Cool" | "Neutral"): MetalTone {
  if (undertone === "Warm") return "warm";
  if (undertone === "Cool") return "cool";
  return "both";
}

// ── Metal hex map ─────────────────────────────────────────────────────────────

const METAL_HEX: Record<string, string> = {
  "Gold":      "#D4AF37",
  "Silver":    "#A8A9AD",
  "Rose Gold": "#B76E79",
  "Bronze":    "#CD7F32",
  "Platinum":  "#E5E4E2",
};

// ── Product picker ────────────────────────────────────────────────────────────

function pickProducts(
  category: JewelleryCategory,
  tone: MetalTone,
  gems: string[],
  maxItems: number,
): JewelleryProduct[] {
  const pool: JewelleryProduct[] = [
    ...(JEWELLERY_CATALOG[category][tone] ?? []),
    // For warm/cool, also include "both" tone items
    ...(tone !== "both" ? (JEWELLERY_CATALOG[category].both ?? []) : []),
  ];

  // Score items by gemstone color overlap with the user's season gems
  const scored = pool.map((p) => ({
    p,
    score: (p.gemColors ?? []).filter((g) => gems.some((sg) => sg.includes(g) || g.includes(sg))).length,
  }));
  scored.sort((a, b) => b.score - a.score || (a.p.priceINR < b.p.priceINR ? -1 : 1));

  return scored.map((s) => s.p).slice(0, maxItems);
}

// ── Personalized reason builder ───────────────────────────────────────────────

export function buildProductReason(
  product: JewelleryProduct,
  colorAnalysis: ColorAnalysisResult,
): string {
  const gems = SEASON_GEMSTONES[colorAnalysis.season] ?? [];
  const gemMatch = (product.gemColors ?? []).find((g) =>
    gems.some((sg) => sg.includes(g) || g.includes(sg))
  );
  if (gemMatch) {
    return `${gemMatch.charAt(0).toUpperCase() + gemMatch.slice(1)} tones align perfectly with your ${colorAnalysis.season} palette.`;
  }
  if (product.metalTone === "warm" && colorAnalysis.undertone === "Warm") {
    return `Gold tones complement your warm undertone, making your complexion glow.`;
  }
  if (product.metalTone === "cool" && colorAnalysis.undertone === "Cool") {
    return `Silver tones harmonise with your cool undertone for a polished look.`;
  }
  return `Chosen for your ${colorAnalysis.season} season and ${colorAnalysis.undertone.toLowerCase()} undertone.`;
}

// ── Main recommendation function ──────────────────────────────────────────────

export function getJewelleryRecommendations(
  shape: FaceShapeResult,
  colors: ColorAnalysisResult,
): JewelleryGuide {
  const tone = resolveMetalTone(colors.undertone);
  const gems = SEASON_GEMSTONES[colors.season] ?? [];
  const earRule = FACE_EARRING_RULES[shape.shape] ?? FACE_EARRING_RULES["Oval"];
  const nkRule  = FACE_NECKLACE_RULES[shape.shape] ?? FACE_NECKLACE_RULES["Oval"];

  const metalBadges = colors.metals.map((m) => ({
    metal: m,
    hex: METAL_HEX[m] ?? "#999",
  }));

  const toneLabel =
    tone === "warm" ? "gold and bronze" :
    tone === "cool" ? "silver and platinum" :
    "gold or silver";

  const earrings: JewelleryRecommendation = {
    category: "earrings",
    faceReason: earRule.reason,
    colorReason: gems.length > 0
      ? `Your ${colors.season} season pairs with ${gems.slice(0, 2).join(" and ")} tones in ${toneLabel} settings.`
      : `${toneLabel.charAt(0).toUpperCase() + toneLabel.slice(1)} settings complement your ${colors.season} palette.`,
    recommended: pickProducts("earrings", tone, gems, 4),
    avoid: earRule.avoid,
  };

  const necklace: JewelleryRecommendation = {
    category: "necklace",
    faceReason: nkRule.reason,
    colorReason: `${toneLabel.charAt(0).toUpperCase() + toneLabel.slice(1)} chains align with your ${colors.undertone.toLowerCase()} undertone.`,
    recommended: pickProducts("necklace", tone, gems, 3),
    avoid: nkRule.avoid,
  };

  const rings: JewelleryRecommendation = {
    category: "rings",
    faceReason: "Rings are metal-tone and gemstone driven — face shape is not a key factor.",
    colorReason: gems.length > 0
      ? `${gems.slice(0, 2).join(", ")} stones in ${toneLabel} settings align with your seasonal palette.`
      : `${toneLabel.charAt(0).toUpperCase() + toneLabel.slice(1)} settings suit your ${colors.season} season.`,
    recommended: pickProducts("rings", tone, gems, 3),
    avoid: [],
  };

  const bangles: JewelleryRecommendation = {
    category: "bangles",
    faceReason: "Bangle style is driven by metal tone and occasion, not face shape.",
    colorReason: tone === "warm"
      ? `Gold and bronze bangles harmonise with your warm ${colors.undertone.toLowerCase()} undertone.`
      : tone === "cool"
      ? `Silver and oxidised metal bangles complement your cool undertone.`
      : `Both gold and silver bangles suit your neutral undertone — layer them freely.`,
    recommended: pickProducts("bangles", tone, gems, 3),
    avoid: [],
  };

  return { earrings, necklace, rings, bangles, metalBadges };
}
