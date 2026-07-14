import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Star,
  Camera,
  Palette,
  Eye,
  Scissors,
  Glasses,
  Droplets,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Renovaara — AI Beauty Analysis | Product Hunt",
  description:
    "Upload a selfie. Get 6 AI-powered beauty infographics: face shape, colour season, skin analysis, hairstyle guide, spectacles guide, and style direction.",
  openGraph: {
    title: "Renovaara — One selfie. Instant beauty analysis.",
    description:
      "Upload a selfie. AI analyzes face shape, colour season, skin, hairstyle, glasses, and style in 60 seconds.",
    images: [{ url: "/1779024315.png", width: 1456, height: 816 }],
  },
};

const FEATURES = [
  { icon: Eye, title: "Face Shape Analysis", desc: "8 face shape classifications with AI confidence scoring" },
  { icon: Palette, title: "Colour Season Analysis", desc: "12-season system with palette, metals, and avoid colours" },
  { icon: Droplets, title: "Skin Analysis", desc: "Type, concerns, zones, and personalized AM/PM routine" },
  { icon: Scissors, title: "Hairstyle & Hair Colour", desc: "5 flattering cuts + 5 shades matched to your features" },
  { icon: Glasses, title: "Spectacles Guide", desc: "Frame shapes, colours, and fits that balance your face" },
  { icon: Sparkles, title: "Try-on Previews", desc: "AI-generated images of you with new hairstyles and glasses" },
];

const COMPARISONS = [
  { app: "L'Oréal Beauty Genius", limit: "L'Oréal products only", renovaara: "Brand-agnostic — works for anyone" },
  { app: "MyAvana", limit: "$29/session, hair only", renovaara: "₹299 one-time = 6 analysis types" },
  { app: "YouCam Makeup", limit: "$5.99/month subscription", renovaara: "One purchase, lifetime access" },
  { app: "Lóvi", limit: "$14.99/month, skin only", renovaara: "Face + hair + glasses + style in one report" },
];

const REVIEWS = [
  { text: "Finally an AI beauty tool that doesn't try to sell me products. Just pure analysis.", author: "Verified user" },
  { text: "The colour season analysis was spot on. Matched what my stylist told me.", author: "Verified user" },
  { text: "Tried 5 hairstyles virtually before my salon visit. Game changer.", author: "Verified user" },
];

export default function ProductHuntPage() {
  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <div className="page-bleed-x py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200/50 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            Launching on Product Hunt
          </div>

          {/* Hero */}
          <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl sm:leading-tight lg:text-6xl lg:leading-tight">
            One selfie.
            <br />
            <span className="text-terracotta">Your complete beauty profile.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-ink-stone sm:text-lg">
            Upload a photo. AI analyzes your face shape, colour season, skin, hairstyle, glasses, and
            personal style — 6 infographics in under 60 seconds.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/upload"
              className="group inline-flex items-center gap-2 rounded-full bg-espresso px-8 py-3.5 text-sm font-semibold text-[var(--btn-fg)] shadow-lg transition hover:opacity-90"
            >
              <Camera className="h-4 w-4" />
              Upload your selfie — it&apos;s free
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-terracotta/20 bg-terracotta/10 px-8 py-3.5 text-sm font-semibold text-terracotta"
            >
              See the demo
            </Link>
          </div>

          {/* Key metrics */}
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: "50K+", label: "Analyses completed" },
              { value: "4.9", label: "Average rating" },
              { value: "60s", label: "Analysis time" },
              { value: "6", label: "Infographic types" },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="font-display text-2xl text-terracotta">{m.value}</p>
                <p className="mt-1 text-xs text-ink-stone">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Features grid */}
          <div className="mt-20">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">What you get</h2>
            <p className="mt-2 text-sm text-ink-stone">6 AI-generated infographics from a single photo</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-terracotta/10 bg-blush/30 p-5 text-left transition hover:border-terracotta/25"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-terracotta/10">
                    <f.icon className="h-5 w-5 text-terracotta" />
                  </div>
                  <h3 className="font-display text-base text-ink">{f.title}</h3>
                  <p className="mt-1 text-xs text-ink-stone">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison table */}
          <div className="mt-20">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">How we compare</h2>
            <p className="mt-2 text-sm text-ink-stone">vs other AI beauty apps</p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-terracotta/10">
                    <th className="px-4 py-3 font-semibold text-ink">App</th>
                    <th className="px-4 py-3 font-semibold text-ink">Limitation</th>
                    <th className="px-4 py-3 font-semibold text-terracotta">Renovaara</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISONS.map((c) => (
                    <tr key={c.app} className="border-b border-[var(--color-border)]">
                      <td className="px-4 py-3 text-ink">{c.app}</td>
                      <td className="px-4 py-3 text-ink-mist">{c.limit}</td>
                      <td className="px-4 py-3 text-sage">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {c.renovaara}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reviews */}
          <div className="mt-20">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">What users say</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {REVIEWS.map((r) => (
                <div key={r.text} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left">
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-ink">&ldquo;{r.text}&rdquo;</p>
                  <p className="mt-2 text-xs text-ink-mist">— {r.author}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-20 rounded-3xl border border-terracotta/20 bg-blush/50 p-10 sm:p-16">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">Ready to discover yourself?</h2>
            <p className="mt-3 text-sm text-ink-stone">
              Free face shape preview. ₹299 full report. No subscription. No spam.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link
                href="/upload"
                className="group inline-flex items-center gap-2 rounded-full bg-espresso px-8 py-3.5 text-sm font-semibold text-[var(--btn-fg)] shadow-lg"
              >
                <Camera className="h-4 w-4" />
                Upload your selfie
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-8 text-xs text-ink-mist">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span className="mx-2">·</span>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
