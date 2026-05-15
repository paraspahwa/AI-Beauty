/**
 * Artificial Jewellery Affiliate Catalog
 *
 * HOW TO EARN COMMISSION:
 * ─────────────────────────────────────────────────────────────────────
 * 1. Amazon India Associates → https://affiliate-program.amazon.in/
 *    Replace AMAZON_TAG below with your Associate tag (e.g. "aibeauty-21")
 *
 * 2. Myntra Affiliate → https://affiliate.myntra.com/
 *    Sign up → get affiliate param → replace MYNTRA_REF below.
 *
 * Commission rates (approx):
 *   Amazon India Fashion Jewellery: 5–9%
 *   Myntra Affiliate:               6–10%
 *
 * ASIN sourcing guide:
 *   amazon.in → Jewellery → Fashion Jewellery → filter by rating (4+) and
 *   review count (100+). Update ASINs below before launch.
 * ─────────────────────────────────────────────────────────────────────
 */

import type { JewelleryProduct, JewelleryCategory, MetalTone } from "@/types/jewellery";

const AMAZON_TAG = "aibeauty-21"; // 🔴 Replace with your Amazon Associates tag
const MYNTRA_REF = "aibeauty";    // 🔴 Replace with your Myntra affiliate ref

function amz(asin: string): string {
  return `https://www.amazon.in/dp/${asin}?tag=${AMAZON_TAG}`;
}
function myn(slug: string): string {
  return `https://www.myntra.com/${slug}?utm_source=affiliate&ref=${MYNTRA_REF}`;
}

export const JEWELLERY_CATALOG: Record<JewelleryCategory, Record<MetalTone, JewelleryProduct[]>> = {
  earrings: {
    warm: [
      {
        name: "Zaveri Pearls Gold Drop Earrings",
        brand: "Zaveri Pearls",
        priceINR: 299,
        url: amz("B07V3R6MDY"),
        badge: "AI Pick",
        category: "earrings",
        style: "drops",
        metalTone: "warm",
        priceRange: "budget",
        hypoallergenic: true,
        gemColors: ["amber", "golden"],
      },
      {
        name: "Shining Diva Gold Chandelier Earrings",
        brand: "Shining Diva",
        priceINR: 449,
        url: amz("B07TLXLJYG"),
        badge: "Best Seller",
        category: "earrings",
        style: "chandelier",
        metalTone: "warm",
        priceRange: "budget",
        gemColors: ["topaz", "amber"],
      },
      {
        name: "YouBella Rose Gold Jhumka Earrings",
        brand: "YouBella",
        priceINR: 599,
        url: amz("B07P8F7YWS"),
        badge: "Ethnic Favourite",
        category: "earrings",
        style: "jhumkas",
        metalTone: "warm",
        priceRange: "mid",
        gemColors: ["coral", "ruby"],
      },
      {
        name: "Yellow Chimes Gold Thread Drop Earrings",
        brand: "Yellow Chimes",
        priceINR: 379,
        url: myn("yellow-chimes-gold-thread-earrings-23456789"),
        category: "earrings",
        style: "threader",
        metalTone: "warm",
        priceRange: "budget",
      },
    ],
    cool: [
      {
        name: "Peora Silver Drop Earrings",
        brand: "Peora",
        priceINR: 399,
        url: amz("B08CLDTBBG"),
        badge: "AI Pick",
        category: "earrings",
        style: "drops",
        metalTone: "cool",
        priceRange: "budget",
        hypoallergenic: true,
        gemColors: ["sapphire", "amethyst"],
      },
      {
        name: "Jewels Galaxy Silver Chandelier Earrings",
        brand: "Jewels Galaxy",
        priceINR: 499,
        url: amz("B085VMLPXJ"),
        category: "earrings",
        style: "chandelier",
        metalTone: "cool",
        priceRange: "mid",
        gemColors: ["amethyst", "lavender"],
      },
      {
        name: "Ferosh Silver Stud Earrings",
        brand: "Ferosh",
        priceINR: 649,
        url: myn("ferosh-silver-studs-34567890"),
        category: "earrings",
        style: "studs",
        metalTone: "cool",
        priceRange: "mid",
        gemColors: ["sapphire", "blue topaz"],
      },
      {
        name: "Accessorize Silver Threader Earrings",
        brand: "Accessorize",
        priceINR: 799,
        url: myn("accessorize-silver-threader-45678901"),
        category: "earrings",
        style: "threader",
        metalTone: "cool",
        priceRange: "mid",
        hypoallergenic: true,
      },
    ],
    both: [
      {
        name: "Accessorize Rose Gold Hoop Earrings",
        brand: "Accessorize",
        priceINR: 799,
        url: myn("accessorize-rose-gold-hoops-56789012"),
        badge: "Trending",
        category: "earrings",
        style: "hoops",
        metalTone: "both",
        priceRange: "mid",
        hypoallergenic: true,
      },
      {
        name: "Shining Diva Oxidised Jhumka",
        brand: "Shining Diva",
        priceINR: 299,
        url: amz("B07DMHBMTZ"),
        category: "earrings",
        style: "jhumkas",
        metalTone: "both",
        priceRange: "budget",
        gemColors: ["coral", "turquoise"],
      },
    ],
  },

  necklace: {
    warm: [
      {
        name: "Zaveri Pearls Gold Pendant Necklace",
        brand: "Zaveri Pearls",
        priceINR: 399,
        url: amz("B07R4NMSJD"),
        badge: "AI Pick",
        category: "necklace",
        style: "pendant",
        metalTone: "warm",
        priceRange: "budget",
        gemColors: ["amber", "topaz"],
      },
      {
        name: "Yellow Chimes Layered Gold Necklace",
        brand: "Yellow Chimes",
        priceINR: 699,
        url: amz("B09X72KFWP"),
        badge: "Best Seller",
        category: "necklace",
        style: "layered",
        metalTone: "warm",
        priceRange: "mid",
      },
      {
        name: "Shining Diva Gold Matinee Necklace",
        brand: "Shining Diva",
        priceINR: 549,
        url: amz("B07TLLHPYP"),
        category: "necklace",
        style: "matinee",
        metalTone: "warm",
        priceRange: "mid",
        gemColors: ["coral", "carnelian"],
      },
    ],
    cool: [
      {
        name: "Peora Silver Pendant Necklace",
        brand: "Peora",
        priceINR: 499,
        url: amz("B07YFLCJNZ"),
        badge: "AI Pick",
        category: "necklace",
        style: "pendant",
        metalTone: "cool",
        priceRange: "mid",
        hypoallergenic: true,
        gemColors: ["amethyst", "sapphire"],
      },
      {
        name: "Ferosh Silver Layered Necklace",
        brand: "Ferosh",
        priceINR: 799,
        url: myn("ferosh-silver-layered-necklace-67890123"),
        category: "necklace",
        style: "layered",
        metalTone: "cool",
        priceRange: "mid",
      },
      {
        name: "Accessorize Silver Choker",
        brand: "Accessorize",
        priceINR: 999,
        url: myn("accessorize-silver-choker-78901234"),
        badge: "Trending",
        category: "necklace",
        style: "choker",
        metalTone: "cool",
        priceRange: "mid",
        hypoallergenic: true,
      },
    ],
    both: [
      {
        name: "DressBerry Minimal Chain Necklace",
        brand: "DressBerry",
        priceINR: 349,
        url: myn("dressberry-chain-necklace-89012345"),
        badge: "Versatile Pick",
        category: "necklace",
        style: "princess",
        metalTone: "both",
        priceRange: "budget",
      },
    ],
  },

  rings: {
    warm: [
      {
        name: "YouBella Gold Adjustable Ring",
        brand: "YouBella",
        priceINR: 249,
        url: amz("B07LCNPKM4"),
        badge: "AI Pick",
        category: "rings",
        style: "cocktail",
        metalTone: "warm",
        priceRange: "budget",
        gemColors: ["amber", "topaz"],
      },
      {
        name: "Shining Diva Gold Stackable Ring Set",
        brand: "Shining Diva",
        priceINR: 399,
        url: amz("B07YD9WP4F"),
        category: "rings",
        style: "stackable",
        metalTone: "warm",
        priceRange: "budget",
      },
    ],
    cool: [
      {
        name: "Peora Silver Crystal Ring",
        brand: "Peora",
        priceINR: 349,
        url: amz("B085D4XMNR"),
        badge: "AI Pick",
        category: "rings",
        style: "cocktail",
        metalTone: "cool",
        priceRange: "budget",
        hypoallergenic: true,
        gemColors: ["sapphire", "amethyst"],
      },
      {
        name: "Ferosh Silver Stackable Ring Set",
        brand: "Ferosh",
        priceINR: 499,
        url: myn("ferosh-silver-rings-90123456"),
        category: "rings",
        style: "stackable",
        metalTone: "cool",
        priceRange: "mid",
      },
    ],
    both: [
      {
        name: "DressBerry Oxidised Midi Ring Set",
        brand: "DressBerry",
        priceINR: 299,
        url: myn("dressberry-midi-rings-01234567"),
        badge: "Trending",
        category: "rings",
        style: "midi",
        metalTone: "both",
        priceRange: "budget",
      },
    ],
  },

  bangles: {
    warm: [
      {
        name: "Zaveri Pearls Gold Bangle Set",
        brand: "Zaveri Pearls",
        priceINR: 499,
        url: amz("B07VHQTKGL"),
        badge: "AI Pick",
        category: "bangles",
        style: "bangle-set",
        metalTone: "warm",
        priceRange: "mid",
        gemColors: ["amber", "coral"],
      },
      {
        name: "Yellow Chimes Gold Cuff Bracelet",
        brand: "Yellow Chimes",
        priceINR: 349,
        url: amz("B08GXHF94V"),
        category: "bangles",
        style: "cuff",
        metalTone: "warm",
        priceRange: "budget",
      },
    ],
    cool: [
      {
        name: "Peora Silver Bangle Set",
        brand: "Peora",
        priceINR: 599,
        url: amz("B085F3VQZR"),
        badge: "AI Pick",
        category: "bangles",
        style: "bangle-set",
        metalTone: "cool",
        priceRange: "mid",
        hypoallergenic: true,
      },
      {
        name: "Ferosh Silver Cuff Bracelet",
        brand: "Ferosh",
        priceINR: 449,
        url: myn("ferosh-silver-cuff-12345678"),
        category: "bangles",
        style: "cuff",
        metalTone: "cool",
        priceRange: "mid",
      },
    ],
    both: [
      {
        name: "DressBerry Oxidised Bangle Set",
        brand: "DressBerry",
        priceINR: 299,
        url: myn("dressberry-oxidised-bangles-23456789"),
        badge: "Boho Pick",
        category: "bangles",
        style: "bangle-set",
        metalTone: "both",
        priceRange: "budget",
      },
    ],
  },
};
