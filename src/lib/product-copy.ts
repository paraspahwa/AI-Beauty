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

/** User-facing studio tier names and comparison copy. */
export const STUDIO_EXPERIENCES = {
  compareTitle: "Which studio is right for you?",
  compareSubtitle: "Pick the path that matches what you need — you can switch anytime.",
  quickTry: {
    name: "Quick Try Studio",
    tagline: "Upload a selfie and try looks in seconds — no full report required.",
    bullets: [
      "Preset makeup, hair, and outfit modes",
      "Quick color scan and My Looks vault",
      `${PRODUCT_COPY.free.studioGensPerMonth} free try-ons per month`,
      "One tap with Surprise Me",
    ],
    cta: "Start Quick Try",
    ctaHref: "/studio",
  },
  advancedStudio: {
    name: "Advanced Studio",
    tagline: "Fine-tune the same canvas session with pro controls.",
    bullets: [
      "Granular makeup sliders (lip, eye, blush, and more)",
      "Hair inspo transfer and generation history",
      "Batch results and outfit builder on canvas",
      "Opens from your current Quick Try session",
    ],
    cta: "Open Advanced Studio",
  },
  reportTryOn: {
    name: "Report Try-On",
    tagline: "Try-ons personalized to your color season and face shape.",
    bullets: [
      "Uses your full beauty analysis context",
      "Clothing virtual try-on when report is unlocked",
      "AR try-on and shopping guide (paid report)",
      `${PRODUCT_COPY.report.studioGensIncluded} try-ons included with full report`,
    ],
    cta: "Open Report Try-On",
    ctaUpload: "Get Full Analysis",
    ctaUploadHref: "/upload",
  },
  canvasSessionHint: "You're in Quick Try — no full report required.",
  reportTryOnStrip:
    "Report Try-On uses your color season and face shape. For quick presets without a report, visit Quick Try Studio.",
  backToQuickTry: "Back to Quick Try",
} as const;

export function formatStudioQuota(tier: "free" | "report" | "studio_pro"): string {
  if (tier === "studio_pro") return `${PRODUCT_COPY.studioPro.studioGensPerMonth} generations / month`;
  if (tier === "report") return `${PRODUCT_COPY.report.studioGensIncluded} try-ons included`;
  return `${PRODUCT_COPY.free.studioGensPerMonth} free try-ons / month`;
}
