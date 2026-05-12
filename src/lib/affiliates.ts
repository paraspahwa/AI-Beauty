/**
 * Affiliate product recommendations for skincare routine steps.
 *
 * HOW TO EARN COMMISSION:
 * ──────────────────────────────────────────────────────────────
 * 1. Amazon Associates India → https://affiliate-program.amazon.in/
 *    Sign up → get your Associate Tag (e.g. "aibeauty-21")
 *    Replace AMAZON_TAG below with your tag.
 *
 * 2. Nykaa Affiliate → https://www.nykaa.com/affiliate
 *    Sign up → get your referral link → replace NYKAA_REF below.
 *
 * Commission rates (approx):
 *   Amazon India Beauty: 5–9%
 *   Nykaa Affiliate:     4–8%
 * ──────────────────────────────────────────────────────────────
 */

const AMAZON_TAG = "aibeauty-21"; // 🔴 Replace with your Amazon Associates tag
const NYKAA_REF  = "aibeauty";    // 🔴 Replace with your Nykaa affiliate ref

function amz(asin: string) {
  return `https://www.amazon.in/dp/${asin}?tag=${AMAZON_TAG}`;
}
function nyk(slug: string) {
  return `https://www.nykaa.com/p/${slug}?ref=${NYKAA_REF}`;
}

export interface AffiliateProduct {
  name: string;
  brand: string;
  priceINR: number;  // approx price for display
  url: string;
  badge?: string;    // e.g. "Best Seller", "Dermat Approved"
}

/**
 * Products keyed by routine step name (case-insensitive match).
 * Skin type can further filter — skinType key overrides default.
 */
export const AFFILIATE_PRODUCTS: Record<string, {
  default: AffiliateProduct[];
  Oily?:   AffiliateProduct[];
  Dry?:    AffiliateProduct[];
  Sensitive?: AffiliateProduct[];
}> = {
  Cleanser: {
    default: [
      { name: "CeraVe Foaming Facial Cleanser", brand: "CeraVe",    priceINR: 899,  url: amz("B01MSSDEPK"), badge: "Dermat Approved" },
      { name: "Cetaphil Gentle Skin Cleanser",  brand: "Cetaphil",  priceINR: 345,  url: amz("B003QO4HJG"), badge: "Best Seller" },
    ],
    Oily: [
      { name: "Minimalist 2% Salicylic Acid Cleanser", brand: "Minimalist", priceINR: 299, url: nyk("minimalist-2-salicylic-acid-face-wash"), badge: "Acne Control" },
      { name: "CeraVe Foaming Facial Cleanser",        brand: "CeraVe",     priceINR: 899, url: amz("B01MSSDEPK"), badge: "Dermat Approved" },
    ],
    Dry: [
      { name: "Cetaphil Gentle Skin Cleanser",   brand: "Cetaphil",   priceINR: 345, url: amz("B003QO4HJG"), badge: "Best Seller" },
      { name: "La Roche-Posay Hydrating Cleanser", brand: "La Roche-Posay", priceINR: 1199, url: nyk("la-roche-posay-hydrating-gentle-cleanser"), badge: "Hydrating" },
    ],
    Sensitive: [
      { name: "Cetaphil Gentle Skin Cleanser",     brand: "Cetaphil",     priceINR: 345,  url: amz("B003QO4HJG"), badge: "Ultra Gentle" },
      { name: "Bioderma Sensibio H2O Micellar Water", brand: "Bioderma",  priceINR: 799,  url: nyk("bioderma-sensibio-h2o"), badge: "Fragrance Free" },
    ],
  },

  Toner: {
    default: [
      { name: "Minimalist PHA 3% Toner",        brand: "Minimalist", priceINR: 349,  url: nyk("minimalist-pha-3-face-toner"), badge: "Gentle" },
      { name: "Plum Green Tea Alcohol Free Toner", brand: "Plum",    priceINR: 295,  url: nyk("plum-green-tea-alcohol-free-toner"), badge: "Best Seller" },
    ],
    Oily: [
      { name: "Minimalist Niacinamide 10% + Zinc Toner", brand: "Minimalist", priceINR: 389, url: nyk("minimalist-niacinamide-10-zinc-face-serum"), badge: "Pore Reducing" },
      { name: "Plum Green Tea Alcohol Free Toner",       brand: "Plum",       priceINR: 295, url: nyk("plum-green-tea-alcohol-free-toner"),          badge: "Best Seller" },
    ],
    Dry: [
      { name: "Klairs Supple Preparation Facial Toner", brand: "Klairs", priceINR: 1699, url: nyk("klairs-supple-preparation-facial-toner"), badge: "Hydrating" },
      { name: "Minimalist PHA 3% Toner",                brand: "Minimalist", priceINR: 349, url: nyk("minimalist-pha-3-face-toner"),          badge: "Gentle" },
    ],
  },

  Serum: {
    default: [
      { name: "Minimalist Vitamin C 10%",         brand: "Minimalist", priceINR: 599,  url: nyk("minimalist-vitamin-c-10-face-serum"),  badge: "Brightening" },
      { name: "Dot & Key Vitamin C Serum",        brand: "Dot & Key",  priceINR: 695,  url: nyk("dot-key-vitamin-c-serum"),             badge: "Glow" },
    ],
    Oily: [
      { name: "Minimalist Niacinamide 10% + Zinc", brand: "Minimalist", priceINR: 389, url: nyk("minimalist-niacinamide-10-zinc-face-serum"), badge: "Pore Control" },
      { name: "Retinol 0.3% + B5 Serum",          brand: "Minimalist", priceINR: 699, url: nyk("minimalist-retinol-03-b5-face-serum"),        badge: "Anti-Acne" },
    ],
    Dry: [
      { name: "Hyaluronic Acid 2% + B5",          brand: "Minimalist", priceINR: 399, url: nyk("minimalist-hyaluronic-acid-2-b5-face-serum"), badge: "Deep Hydration" },
      { name: "The Ordinary Lactic Acid 5% + HA", brand: "The Ordinary", priceINR: 700, url: nyk("the-ordinary-lactic-acid-5-ha"),             badge: "Gentle Exfoliant" },
    ],
  },

  Moisturizer: {
    default: [
      { name: "Neutrogena Hydro Boost Water Gel",   brand: "Neutrogena", priceINR: 879,  url: amz("B00NR1YQHM"), badge: "Lightweight" },
      { name: "CeraVe Moisturising Cream",          brand: "CeraVe",     priceINR: 1399, url: amz("B00TTD9BRC"), badge: "Dermat Approved" },
    ],
    Oily: [
      { name: "Neutrogena Hydro Boost Water Gel", brand: "Neutrogena", priceINR: 879, url: amz("B00NR1YQHM"), badge: "Oil-Free" },
      { name: "Minimalist Peptide Moisturiser",   brand: "Minimalist", priceINR: 549, url: nyk("minimalist-peptide-moisturizer"),     badge: "Non-Comedogenic" },
    ],
    Dry: [
      { name: "CeraVe Moisturising Cream",           brand: "CeraVe",    priceINR: 1399, url: amz("B00TTD9BRC"), badge: "Rich Moisture" },
      { name: "Kama Ayurveda Nourishing Face Cream", brand: "Kama",      priceINR: 945,  url: nyk("kama-ayurveda-rejuvenating-and-brightening-ayurvedic-night-cream"), badge: "Natural" },
    ],
    Sensitive: [
      { name: "CeraVe Moisturising Cream",          brand: "CeraVe",    priceINR: 1399, url: amz("B00TTD9BRC"), badge: "Fragrance Free" },
      { name: "La Roche-Posay Toleriane Double Repair", brand: "La Roche-Posay", priceINR: 1450, url: nyk("la-roche-posay-toleriane-double-repair"), badge: "Sensitive Skin" },
    ],
  },

  Sunscreen: {
    default: [
      { name: "Minimalist SPF 50 Sunscreen",       brand: "Minimalist", priceINR: 349,  url: nyk("minimalist-spf-50-pa-sunscreen"),    badge: "Best Seller" },
      { name: "Neutrogena Ultra Sheer SPF 50+",    brand: "Neutrogena", priceINR: 399,  url: amz("B07CQFD6TF"),                        badge: "Lightweight" },
    ],
  },

  "Eye Cream": {
    default: [
      { name: "Mamaearth Bye Bye Dark Circles Eye Cream", brand: "Mamaearth", priceINR: 549, url: nyk("mamaearth-bye-bye-dark-circles-under-eye-cream"), badge: "Dark Circles" },
      { name: "Dot & Key Eye Cream",                      brand: "Dot & Key", priceINR: 595, url: nyk("dot-key-under-eye-recovery-concentrate"),          badge: "Depuffing" },
    ],
  },

  Exfoliator: {
    default: [
      { name: "Minimalist AHA BHA 25% Peeling Solution", brand: "Minimalist", priceINR: 699, url: nyk("minimalist-aha-bha-25-peeling-solution"), badge: "Weekly Use" },
      { name: "Plum 1% BHA Face Scrub",                  brand: "Plum",       priceINR: 395, url: nyk("plum-1-bha-exfoliating-face-scrub"),      badge: "Gentle" },
    ],
  },
};

/**
 * Get affiliate products for a given routine step and skin type.
 * Returns up to 2 products, preferring skin-type specific ones.
 */
export function getAffiliateProducts(step: string, skinType: string): AffiliateProduct[] {
  const normalised = Object.keys(AFFILIATE_PRODUCTS).find(
    (k) => k.toLowerCase() === step.toLowerCase()
  );
  if (!normalised) return [];

  const entry = AFFILIATE_PRODUCTS[normalised];
  const skinKey = skinType as keyof typeof entry;
  return (entry[skinKey] ?? entry.default ?? []).slice(0, 2);
}
