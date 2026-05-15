import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Droplets,
  Glasses,
  Scissors,
  ShieldCheck,
  Star,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SampleShowcase } from "@/components/home/SampleShowcase";
import { DoAvoidEducationStrip } from "./DoAvoidEducationStrip";
import { StatsCounters, type StatItem } from "@/components/home/StatsCounters";
import { FAQAccordion, type FAQItem } from "@/components/home/FAQAccordion";
import { TestimonialsSection, type TestimonialItem } from "@/components/home/TestimonialsSection";
import { ActivityTicker } from "@/components/home/ActivityTicker";
import { HeroReportCard } from "@/components/home/HeroReportCard";
import { StickyMobileCta } from "@/components/home/StickyMobileCta";
import { HOME_CONTENT, toBeforeAfterItems } from "@/lib/home-content";

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

const TESTIMONIALS: TestimonialItem[] = [
  {
    id: "sarah",
    name: "Sarah K.",
    tag: "Virtual Try-On",
    quote: "I tested looks in minutes and finally picked colors that actually suit me.",
  },
  {
    id: "priya",
    name: "Priya M.",
    tag: "Makeup Studio",
    quote: "The lip and blush previews looked surprisingly realistic and saved me money.",
  },
  {
    id: "emma",
    name: "Emma L.",
    tag: "Hair Guide",
    quote: "I changed my haircut confidently because I could preview the shape beforehand.",
  },
  {
    id: "meera",
    name: "Meera R.",
    tag: "Skin Routine",
    quote: "I stopped buying the wrong foundations. My routine is down to 6 products that actually work for my skin.",
  },
];

const FAQS: FAQItem[] = [
  {
    id: "accuracy",
    question: "How accurate is the analysis?",
    answer:
      "Results are strongest with a clear front-facing image in balanced light. The system evaluates multiple visual traits to produce personalized recommendations.",
  },
  {
    id: "privacy",
    question: "Is my photo private?",
    answer: "Yes. Your image is processed securely and only accessible within your account workflows.",
  },
  {
    id: "free-preview",
    question: "What is included in free preview?",
    answer:
      "The free preview includes core face-shape insights. Paid plans unlock full beauty and style recommendations.",
  },
  {
    id: "refund",
    question: "Can I request a refund?",
    answer: "Yes. Paid plans are covered by a 30-day money-back guarantee.",
  },
];

const STATS: StatItem[] = HOME_CONTENT.stats;

const PLANS: {
  name: string;
  price: string;
  originalPrice?: string;
  note: string;
  cta: string;
  href: string;
  featured: boolean;
  items: string[];
}[] = [
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
    originalPrice: "Rs 599",
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
  const showcaseItems = toBeforeAfterItems();

  return (
    <main className="min-h-screen overflow-x-hidden">
      <ActivityTicker />
      <section className="container max-w-6xl pt-12 pb-14 sm:pt-16 sm:pb-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="section-label">{HOME_CONTENT.hero.badge}</span>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl text-ink leading-tight">
              {HOME_CONTENT.hero.title} <span className="text-iris">{HOME_CONTENT.hero.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg text-ink-stone leading-relaxed">
              {HOME_CONTENT.hero.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent" className="group cta-shimmer cta-glow">
                <Link href={HOME_CONTENT.hero.primaryCta.href}>
                  <Camera className="h-4 w-4" />
                  {HOME_CONTENT.hero.primaryCta.label}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={HOME_CONTENT.hero.secondaryCta.href}>{HOME_CONTENT.hero.secondaryCta.label}</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-ink-stone">
              <div className="flex -space-x-2">
                {["#EC4899", "#8B5CF6", "#F9A8D4", "#C4B5FD", "#FBCFE8"].map((c, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white ring-1 ring-terracotta/20"
                    style={{ background: `radial-gradient(circle at 35% 35%, ${c}55, ${c}cc)` }}
                  />
                ))}
              </div>
              <span className="font-medium text-ink">50,000+ analyses</span>
              <span className="text-ink-stone/40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> ~60 second results
              </span>
              <span className="text-ink-stone/40">·</span>
              <span>No card required</span>
            </div>
          </div>

          <HeroReportCard />
        </div>
      </section>

      <StatsCounters items={STATS} />

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
          <h2 className="text-2xl sm:text-3xl text-ink">{HOME_CONTENT.ctaBanner.title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-stone">
            {HOME_CONTENT.ctaBanner.description}
          </p>
          <div className="mt-6">
            <Button asChild size="lg" variant="accent" className="group">
              <Link href={HOME_CONTENT.ctaBanner.buttonHref}>
                {HOME_CONTENT.ctaBanner.buttonLabel}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>


      <SampleShowcase items={showcaseItems} tuning={HOME_CONTENT.showcase.tuning} />

      {/* MVP Do vs Avoid education strip */}
      <DoAvoidEducationStrip />

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
                <span className="absolute right-4 top-4 rounded-full bg-terracotta text-white px-3 py-1 text-xs font-semibold ring-2 ring-terracotta/30 ring-offset-1 animate-pulse">
                  Popular
                </span>
              ) : null}
              {plan.featured && (
                <span className="inline-flex items-center rounded-full bg-sage/20 px-2.5 py-0.5 text-xs text-sage">
                  Launch offer
                </span>
              )}
              <h3 className="mt-1 text-lg text-ink">{plan.name}</h3>
              {plan.originalPrice ? (
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-3xl text-ink">{plan.price}</p>
                  <s className="text-sm text-ink-mist">{plan.originalPrice}</s>
                </div>
              ) : (
                <p className="mt-1 text-3xl text-ink">{plan.price}</p>
              )}
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
        <div className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-sage/10 px-6 py-3 text-sm text-ink-stone">
          <ShieldCheck className="h-4 w-4 shrink-0 text-sage" />
          30-day money-back guarantee — no questions asked
        </div>
      </section>

      <TestimonialsSection items={TESTIMONIALS} />

      <section id="faq" className="container max-w-4xl py-16 scroll-mt-20">
        <h2 className="text-center text-3xl sm:text-4xl text-ink">Frequently asked questions</h2>
        <FAQAccordion items={FAQS} />
      </section>
      <StickyMobileCta />
    </main>
  );
}
