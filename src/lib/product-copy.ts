/** Canonical product naming — use everywhere for consistency. */

export const PRODUCT_COPY = {
  free: {
    name: "Free Preview",
    tagline: "Face-shape preview — no card required",
  },
  report: {
    name: "Full Report",
    priceInr: 299,
    tagline: "Unlock your complete 7-section beauty analysis",
    sections: [
      "Face analysis",
      "Skin analysis",
      "Colour guide",
      "Hairstyle guide",
      "Hair colour guide",
      "Spectacles guide",
      "Style guide",
    ],
  },
  primaryCta: "Get my report",
  secondaryCta: "New analysis",
} as const;
