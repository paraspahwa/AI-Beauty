import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Droplets,
  Glasses,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Wand2,
    title: "AI Makeup Studio",
    description:
      "Preview lip, eye, blush, and contour combinations on your own face before buying products.",
  },
  {
    icon: Glasses,
    title: "Spectacles Guide",
    description:
      "Get frame shape, material, and color recommendations matched to your face shape and undertone.",
  },
  {
    icon: Scissors,
    title: "Hairstyle and Color",
    description:
      "Explore flattering cuts and color directions designed around your facial structure.",
  },
  {
    icon: Droplets,
    title: "Skin Routine",
    description:
      "Receive concern-based AM and PM routine suggestions with ingredient guidance.",
  },
];

const STEPS = [
  {
    title: "Upload a clear selfie",
    description: "Use a front-facing photo in natural light for the most accurate analysis.",
  },
  {
    title: "AI maps your features",
    description:
      "Face shape, season, undertone, and key style traits are analyzed in under a minute.",
  },
  {
    title: "Try styles virtually",
    description: "Test makeup and style directions safely before making any beauty purchases.",
  },
  {
    title: "Get your complete report",
    description:
      "Unlock your full style blueprint with personalized recommendations and a shareable summary.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah K.",
    tag: "Virtual Try-On",
    quote: "I tested looks in minutes and finally picked colors that actually suit me.",
  },
  {
    name: "Priya M.",
    tag: "Makeup Studio",
    quote: "The lip and blush previews looked surprisingly realistic and saved me money.",
  },
  {
    name: "Emma L.",
    tag: "Hair Guide",
    quote: "I changed my haircut confidently because I could preview the shape beforehand.",
  },
];

const FAQS = [
  {
    q: "How accurate is the analysis?",
    a: "Results are strongest with a clear front-facing image in balanced light. The system evaluates multiple visual traits to produce personalized recommendations.",
  },
  {
    q: "Is my photo private?",
    a: "Yes. Your image is processed securely and only accessible within your account workflows.",
  },
  {
    q: "What is included in free preview?",
    a: "The free preview includes core face-shape insights. Paid plans unlock full beauty and style recommendations.",
  },
  {
    q: "Can I request a refund?",
    a: "Yes. Paid plans are covered by a 30-day money-back guarantee.",
  },
];

const PLANS = [
  {
    name: "Free Preview",
    price: "Rs 0",
    note: "No card required",
    cta: "Try for free",
    href: "/upload",
    featured: false,
    items: ["Face shape overview", "Starter style summary", "Shareable report link"],
  },
  {
    name: "Full Report",
    price: "Rs 299",
    note: "One-time payment",
    cta: "Get my report",
    href: "/upload",
    featured: true,
    items: [
      "Everything in Free",
      "AI Makeup Studio access",
      "Virtual clothing try-on",
      "Spectacles and hairstyle guide",
      "Skin routine recommendations",
    ],
  },
  {
    name: "Studio Pro",
    price: "Rs 999/mo",
    note: "Cancel anytime",
    cta: "Start Studio Pro",
    href: "/upload",
    featured: false,
    items: [
      "Everything in Full Report",
      "Higher generation limits",
      "Priority processing",
      "Continuous style tracking",
    ],
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <section className="container max-w-6xl pt-12 pb-14 sm:pt-16 sm:pb-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="section-label">AI Personal Stylist</span>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl text-ink leading-tight">
              Beauty guidance that feels <span className="text-iris">made for you</span>
            </h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg text-ink-stone leading-relaxed">
              Upload one selfie and get your personalized beauty report with makeup, hairstyle,
              spectacles, and skin recommendations tailored to your unique features.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent" className="group">
                <Link href="/upload">
                  <Camera className="h-4 w-4" />
                  Start free analysis
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how">How it works</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-ink-stone">
              <span className="inline-flex items-center gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-terracotta text-terracotta" />
                ))}
                4.9 average rating
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-sage" />
                50,000+ analyses
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sage" />
                30-day guarantee
              </span>
            </div>
          </div>

          <div className="card-soft relative">
            <div className="absolute right-4 top-4 rounded-full bg-terracotta/15 px-3 py-1 text-xs font-semibold text-terracotta">
              Sample Report
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-stone">
              <Sparkles className="h-4 w-4 text-terracotta" />
              Renovaara preview
            </div>
            <h2 className="mt-3 text-2xl text-ink">Soft Autumn profile</h2>
            <p className="mt-2 text-sm text-ink-stone">
              Warm undertone, balanced oval face shape, medium contrast features.
            </p>
            <div className="mt-5 space-y-2">
              {[
                "Top lipstick families",
                "Best frame geometry",
                "Hair length recommendations",
                "AM and PM skin routine",
              ].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-terracotta/20 bg-white/70 px-4 py-2.5">
                  <span className="text-sm text-ink-stone">{item}</span>
                  <CheckCircle2 className="h-4 w-4 text-terracotta" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="container max-w-6xl py-16 scroll-mt-20">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl text-ink">Everything in one beauty workflow</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-stone">
            Move from confusion to clarity with recommendations you can use immediately.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <article key={title} className="card-soft">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta/15 text-terracotta">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg text-ink">{title}</h3>
              <p className="mt-2 text-sm text-ink-stone leading-relaxed">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container max-w-6xl py-8 sm:py-12">
        <div className="rounded-3xl border border-iris/20 bg-[linear-gradient(135deg,rgba(249,168,212,0.25),rgba(196,181,253,0.25))] px-6 py-10 text-center shadow-card sm:px-10">
          <h2 className="text-2xl sm:text-3xl text-ink">Start with one selfie and see your best look</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-stone">
            Above-fold CTA intentionally places the first action immediately while keeping privacy and trust signals visible.
          </p>
          <div className="mt-6">
            <Button asChild size="lg" variant="accent" className="group">
              <Link href="/upload">
                Get my personalized report
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="how" className="container max-w-6xl py-16 scroll-mt-20">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl text-ink">How it works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-stone">Four quick steps from upload to confidence.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <article key={step.title} className="card-soft">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-terracotta/15 text-xs font-semibold text-terracotta">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-lg text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-stone">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="container max-w-6xl py-16 scroll-mt-20">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl text-ink">Simple pricing</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-stone">Choose the depth that matches your beauty goals.</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={plan.featured ? "card-soft relative border-2 border-terracotta/50" : "card-soft"}
            >
              {plan.featured ? (
                <span className="absolute right-4 top-4 rounded-full bg-terracotta text-white px-3 py-1 text-xs font-semibold">
                  Popular
                </span>
              ) : null}
              <h3 className="text-lg text-ink">{plan.name}</h3>
              <p className="mt-1 text-3xl text-ink">{plan.price}</p>
              <p className="mt-1 text-xs text-ink-stone">{plan.note}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-stone">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" variant={plan.featured ? "accent" : "outline"} className="mt-8 w-full">
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </article>
          ))}
        </div>
      </section>

      <section className="container max-w-6xl py-16">
        <h2 className="text-center text-3xl sm:text-4xl text-ink">Loved by thousands</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <article key={item.name} className="card-soft">
              <div className="mb-3 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-terracotta text-terracotta" />
                ))}
              </div>
              <p className="text-sm text-ink-stone leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-4">
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-ink-mist">{item.tag}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="container max-w-4xl py-16 scroll-mt-20">
        <h2 className="text-center text-3xl sm:text-4xl text-ink">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="card-soft group">
              <summary className="list-none flex items-center justify-between text-left">
                <span className="font-medium text-ink">{faq.q}</span>
                <span className="text-terracotta text-sm">Open</span>
              </summary>
              <p className="mt-3 text-sm text-ink-stone leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
