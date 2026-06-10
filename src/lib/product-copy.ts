/** Canonical product naming — use everywhere for consistency. */

export const PRODUCT_COPY = {
  free: {
    name: "Free Preview",
    tagline: "Try a look free — no card required",
    studioGensPerMonth: 3,
  },
  report: {
    name: "Full Report",
    priceInr: 299,
    tagline: "Unlock your complete beauty analysis",
    studioGensIncluded: 5,
  },
  studioPro: {
    name: "Studio Pro",
    priceInr: 999,
    tagline: "150 try-ons per month plus full reports",
    studioGensPerMonth: 150,
  },
  myLooks: "My Looks",
  primaryCta: "Try a Look Free",
  secondaryCta: "Full Analysis",
} as const;

export function formatStudioQuota(tier: "free" | "report" | "studio_pro"): string {
  if (tier === "studio_pro") return `${PRODUCT_COPY.studioPro.studioGensPerMonth} generations / month`;
  if (tier === "report") return `${PRODUCT_COPY.report.studioGensIncluded} try-ons included`;
  return `${PRODUCT_COPY.free.studioGensPerMonth} free try-ons / month`;
}
