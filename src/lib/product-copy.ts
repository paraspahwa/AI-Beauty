/** Canonical product naming — use everywhere for consistency. */

export const PRODUCT_COPY = {
  free: {
    name: "Free Preview",
    tagline: "Face-shape infographic — no card required",
    items: [
      "Face shape preview infographic",
      "Report teaser",
      "No card required",
    ],
  },
  report: {
    name: "Full Report",
    priceInr: 299,
    strikeInr: 599,
    tagline: "Six luxury analysis infographics from one selfie",
    items: [
      "Face features infographic",
      "Skin analysis infographic",
      "Colour season infographic",
      "Hairstyle guide infographic",
      "Spectacles guide infographic",
      "Hair colour infographic",
      "Downloadable analysis PDF",
    ],
  },
  styleGuide: {
    name: "Style Guide Add-on",
    priceInr: 99,
    tagline: "Optional wardrobe infographic after you unlock",
    items: [
      "Full-body photo upload",
      "Personal style guide infographic",
      "Downloadable style guide PDF",
      "Requires Full Report unlock",
    ],
  },
  primaryCta: "Get my report",
  secondaryCta: "New analysis",
} as const;
