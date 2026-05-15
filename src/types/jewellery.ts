import type { FaceShape, ColorSeason } from "./report";

export type JewelleryCategory = "earrings" | "necklace" | "rings" | "bangles";
export type EarringStyle = "studs" | "drops" | "hoops" | "chandelier" | "jhumkas" | "threader";
export type NecklaceStyle = "choker" | "princess" | "matinee" | "pendant" | "layered";
export type MetalTone = "warm" | "cool" | "both";
export type PriceRange = "budget" | "mid" | "premium"; // <299 / 299–999 / 999+

/** Extends the existing AffiliateProduct pattern with jewellery-specific dimensions. */
export interface JewelleryProduct {
  name: string;
  brand: string;
  priceINR: number;
  url: string;
  badge?: string;
  category: JewelleryCategory;
  style: EarringStyle | NecklaceStyle | string;
  metalTone: MetalTone;
  priceRange: PriceRange;
  gemColors?: string[];       // e.g. ["coral","ruby"] — for season color matching
  hypoallergenic?: boolean;
  imageUrl?: string;          // product image (optional, Phase 2+)
}

/** Output of the rule engine — one entry per category. */
export interface JewelleryRecommendation {
  category: JewelleryCategory;
  /** Why this earring/necklace style suits this face shape. */
  faceReason: string;
  /** Why the metal/gem color works for this color season. */
  colorReason: string;
  recommended: JewelleryProduct[];
  avoid: string[];
}

/** Full set returned by getJewelleryRecommendations(). */
export interface JewelleryGuide {
  earrings: JewelleryRecommendation;
  necklace: JewelleryRecommendation;
  rings: JewelleryRecommendation;
  bangles: JewelleryRecommendation;
  metalBadges: { metal: string; hex: string }[];
}

// Re-export for convenience
export type { FaceShape, ColorSeason };
