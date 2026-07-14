import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What Is My Face Shape? Complete Guide to 8 Types | Renovaara",
  description:
    "Learn how to identify your face shape using AI. Oval, round, square, heart, diamond, oblong, triangle, and soft oval — our complete guide to finding yours.",
  openGraph: {
    title: "What Is My Face Shape? Complete Guide to 8 Types",
    description: "Identify your face shape with AI analysis. The complete guide to all 8 face shape types.",
  },
};

export default function FaceShapePost() {
  return (
    <article className="min-h-screen bg-[var(--color-background)]">
      <div className="page-bleed-x py-14 sm:py-20">
        <div className="mx-auto w-full max-w-2xl">
          <p className="foil-label mb-3">Face Shape</p>
          <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl sm:leading-tight">
            What Is My Face Shape? A Complete Guide to 8 Types
          </h1>
          <p className="mt-4 text-sm text-ink-mist">July 10, 2026 · 8 min read</p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-stone">
            <p>
              Knowing your face shape is the first step to choosing hairstyles, glasses, makeup
              techniques, and even jewellery that truly flatter you. While there are traditional
              manual methods (measuring your forehead, cheekbones, and jawline with a tape measure),
              AI-powered face shape analysis is now the fastest and most accurate way.
            </p>

            <h2 className="font-display text-xl text-ink">The 8 Face Shape Types</h2>

            <h3 className="font-display text-lg text-ink">1. Oval</h3>
            <p>
              The forehead is slightly wider than the chin, with prominent cheekbones. The face
              length is about 1.5 times the width. Oval faces suit almost any hairstyle and
              glasses frame — the most versatile shape.
            </p>

            <h3 className="font-display text-lg text-ink">2. Round</h3>
            <p>
              The width and length are nearly equal, with full cheeks and a rounded chin.
              Angular frames and long, layered hairstyles help add definition.
            </p>

            <h3 className="font-display text-lg text-ink">3. Square</h3>
            <p>
              A strong jawline, broad forehead, and similar width at the forehead, cheeks, and
              jaw. Soft, layered styles and rounded glasses frames soften angular features.
            </p>

            <h3 className="font-display text-lg text-ink">4. Heart</h3>
            <p>
              A wide forehead that tapers to a narrow, pointed chin. Chin-length bobs and
              frames that are wider at the bottom balance the silhouette.
            </p>

            <h3 className="font-display text-lg text-ink">5. Diamond</h3>
            <p>
              Narrow forehead and jawline with wide, prominent cheekbones. Cat-eye glasses and
              side-swept bangs highlight the cheekbones beautifully.
            </p>

            <h3 className="font-display text-lg text-ink">6. Oblong</h3>
            <p>
              The face is significantly longer than it is wide, with a straight cheek line.
              Full, voluminous hairstyles and oversized frames add width.
            </p>

            <h3 className="font-display text-lg text-ink">7. Triangle</h3>
            <p>
              A narrow forehead that widens toward the jawline. Styles that add volume at the
              temples and temples-heavy glasses create balance.
            </p>

            <h3 className="font-display text-lg text-ink">8. Soft Oval</h3>
            <p>
              Similar to oval but with slightly softer, rounder contours. A gentle mix that
              combines the versatility of oval with the softness of round.
            </p>

            <div className="rounded-2xl border border-terracotta/20 bg-blush/50 p-6 not-prose">
              <h3 className="font-display text-lg text-ink">Find yours with AI</h3>
              <p className="mt-1 text-sm text-ink-stone">
                Upload a selfie and get your face shape identified in seconds — plus colour season, skin
                analysis, and style recommendations.
              </p>
              <Link
                href="/upload"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-2.5 text-sm font-semibold text-[var(--btn-fg)]"
              >
                Upload your selfie →
              </Link>
            </div>

            <h2 className="font-display text-xl text-ink">How AI Determines Face Shape</h2>
            <p>
              AI face shape analysis uses computer vision (AWS Rekognition) to detect 68 facial
              landmarks — from brow line to jaw contour. It then measures ratios between your
              forehead width, cheekbone width, jawline width, and face length to classify your
              shape with confidence scoring.
            </p>
            <p>
              Unlike manual measurements with a mirror and tape, AI analysis is objective,
              consistent, and takes seconds. It&apos;s the same technology used by professional
              stylists, now available to everyone.
            </p>

            <p className="pt-4 text-xs text-ink-mist">
              Disclaimer: Results are for informational purposes. For medical or surgical decisions about
              your face, consult a qualified professional.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
