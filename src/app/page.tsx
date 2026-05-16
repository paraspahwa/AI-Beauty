import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
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
import { VisitorChatWidget } from "@/components/VisitorChatWidget";
import { StatsCounters, type StatItem } from "@/components/home/StatsCounters";
import { FAQAccordion, type FAQItem } from "@/components/home/FAQAccordion";
import { TestimonialsSection, type TestimonialItem } from "@/components/home/TestimonialsSection";
import { ActivityTicker } from "@/components/home/ActivityTicker";
import { HeroReportCard } from "@/components/home/HeroReportCard";
import { StickyMobileCta } from "@/components/home/StickyMobileCta";
import { HOME_CONTENT, toBeforeAfterItems } from "@/lib/home-content";
import { HeroText } from "@/components/home/HeroText";
import { RevealSection } from "@/components/home/RevealSection";

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
  {
    icon: BookOpen,
    title: "Do vs Avoid Style Guide",
    description:
      "See what silhouettes, necklines, and bottoms to embrace or skip — backed by reference images for every rule.",
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
    title: "Explore your Style Guide",
    description:
      "Browse Do vs Avoid rules for tops, bottoms, and necklines — with reference images for every recommendation.",
  },
  {
    title: "Try styles and get your report",
    description:
      "Test makeup, hairstyles, and clothing virtually, then unlock your full personalized blueprint.",
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
  {
    id: "style-guide",
    question: "What is the Do vs Avoid Style Guide?",
    answer:
      "The Style Guide is a visual education module showing which silhouettes, necklines, and bottoms flatter most body types — and which to skip. It lives on the homepage and in the Style Guide tab of every report, and it's free to browse.",
  },
  {
    id: "chat",
    question: "Can I ask follow-up questions about my report?",
    answer:
      "Yes. Every report includes an AI style consultant chat. Ask anything about your color season, hairstyle, frames, skin routine, or what to wear for a specific occasion — your full report is already loaded as context.",
  },
  {
    id: "visitor-chat",
    question: "I have questions before signing up — can I get help?",
    answer:
      "Absolutely. Use the chat bubble in the bottom-right corner to talk to Aria, our pre-sales assistant. She can answer questions about features, pricing, privacy, and anything else about Renovaara.",
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
      "Style Guide — Do vs Avoid module",
      "AI style consultant chat",
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
      "Unlimited consultant chat sessions",
    ],
  },
];

export default function HomePage() {
  const showcaseItems = toBeforeAfterItems();

  return (
    <main className="min-h-screen overflow-x-hidden">
      <ActivityTicker />
      {/* Hero section — full-width ambient glow wrapper */}
      <div className="relative overflow-hidden">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="glow-orb absolute -top-40 -left-40 h-[650px] w-[650px] opacity-80" style={{ background: "rgba(236,72,153,0.36)" }} />
          <div className="glow-orb absolute -top-20 right-[-10%] h-[520px] w-[520px] opacity-70" style={{ background: "rgba(139,92,246,0.30)" }} />
          <div className="glow-orb absolute bottom-0 left-1/2 -translate-x-1/2 h-96 w-[700px] opacity-60" style={{ background: "rgba(249,168,212,0.50)" }} />
        </div>
      <section className="container max-w-6xl pt-12 pb-14 sm:pt-16 sm:pb-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <HeroText />

          <HeroReportCard />
        </div>
      </section>
      </div>{/* end hero glow wrapper */}

      <RevealSection>
        <StatsCounters items={STATS} />
      </RevealSection>

      <section id="features" className="container max-w-6xl py-16 scroll-mt-20">
        <RevealSection>
          <div className="text-center">
            <span className="section-label">Features</span>
            <h2 className="mt-3 text-4xl sm:text-5xl text-ink font-bold tracking-tight">Everything in one <span className="gradient-text">beauty workflow</span></h2>
            <p className="mx-auto mt-3 max-w-2xl text-ink-stone">
              Move from confusion to clarity with recommendations you can use immediately.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[minmax(160px,auto)]">
            {FEATURES.map(({ icon: Icon, title, description }, index) => {
              const isFeatured = index === 0;
              const hasBeam = index === 1 || index === 2;
              const articleClass = isFeatured
                ? "col-span-2 md:col-span-2 aurora-card chrome-border"
                : hasBeam
                ? "col-span-1 card-soft card-beam"
                : index === 3 || index === 4
                ? "col-span-1 md:col-span-2 card-soft"
                : "col-span-1 card-soft";
              return (
                <article key={title} className={articleClass}>
                  <div className={`mb-4 inline-flex items-center justify-center rounded-xl bg-terracotta/15 text-terracotta ${isFeatured ? "h-12 w-12" : "h-10 w-10"}`}>
                    <Icon className={isFeatured ? "h-6 w-6" : "h-5 w-5"} />
                  </div>
                  <h3 className={`text-ink ${isFeatured ? "text-xl" : "text-lg"}`}>{title}</h3>
                  <p className="mt-2 text-sm text-ink-stone leading-relaxed">{description}</p>
                </article>
              );
            })}
          </div>
        </RevealSection>
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
        <RevealSection>
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
        </RevealSection>
      </section>

      <section id="pricing" className="container max-w-6xl py-16 scroll-mt-20">
        <RevealSection>
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl text-ink">Simple pricing</h2>
            <p className="mx-auto mt-3 max-w-2xl text-ink-stone">Choose the depth that matches your beauty goals.</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={plan.featured ? "card-soft chrome-border relative scale-[1.05] z-10 shadow-2xl shadow-pink-200/60 ring-2 ring-pink-300/40" : "card-soft"}
              >
                {plan.featured ? (
                  <span className="pill absolute -top-3 left-1/2 -translate-x-1/2">
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
        </RevealSection>
      </section>

      <TestimonialsSection items={TESTIMONIALS} />

      <section id="faq" className="container max-w-4xl py-16 scroll-mt-20">
        <RevealSection>
          <h2 className="text-center text-3xl sm:text-4xl text-ink">Frequently asked questions</h2>
          <FAQAccordion items={FAQS} />
        </RevealSection>
      </section>
      <StickyMobileCta />
      <VisitorChatWidget />
    </main>
  );
}
