import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Droplets,
  Glasses,
  Scissors,
  ShieldCheck,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SampleShowcase } from "@/components/home/SampleShowcase";
import { StatsCounters, type StatItem } from "@/components/home/StatsCounters";
import { FAQAccordion, type FAQItem } from "@/components/home/FAQAccordion";
import { TestimonialsSection, type TestimonialItem } from "@/components/home/TestimonialsSection";
import { ActivityTicker } from "@/components/home/ActivityTicker";
import { HeroReportCard } from "@/components/home/HeroReportCard";
import { StickyMobileCta } from "@/components/home/StickyMobileCta";
import { HOME_CONTENT, toBeforeAfterItems } from "@/lib/home-content";
import { HeroText } from "@/components/home/HeroText";
import { RevealSection } from "@/components/home/RevealSection";
import { AiStoryPanels } from "@/components/home/AiStoryPanels";
import styles from "./home.module.css";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Face & Feature Analysis",
    description: "AI maps your face shape and key features to guide every recommendation.",
  },
  {
    icon: Glasses,
    title: "Spectacles Guide",
    description:
      "Frame shape, material, and colour recommendations matched to your face and undertone.",
  },
  {
    icon: Scissors,
    title: "Hairstyle & Hair Colour",
    description:
      "Flattering cuts, lengths, and colour directions with photorealistic preview images.",
  },
  {
    icon: Droplets,
    title: "Skin Routine",
    description:
      "Concern-based AM and PM routine suggestions tailored to your skin type.",
  },
  {
    icon: BookOpen,
    title: "Personal Style Guide",
    description:
      "Wardrobe direction, silhouettes, and colour accents aligned with your season and vibe.",
  },
];

const STEPS = [
  {
    title: "Upload a selfie",
    description: "Use natural light and a clear front-facing photo for the best analysis.",
  },
  {
    title: "Preview your face analysis",
    description: "See your face shape and a teaser of your report before you unlock.",
  },
  {
    title: "Unlock the full report",
    description: "One-time payment unlocks all seven sections plus preview images and PDF.",
  },
  {
    title: "Keep it forever",
    description: "Download your PDF and revisit your report anytime from your dashboard.",
  },
];

const TESTIMONIALS: TestimonialItem[] = [
  {
    id: "sarah",
    name: "Sarah K.",
    tag: "Colour Guide",
    quote: "Finally understood my season — the palette section alone was worth it.",
  },
  {
    id: "priya",
    name: "Priya M.",
    tag: "Spectacles",
    quote: "The frame recommendations actually suited my face. No more guesswork at the optician.",
  },
  {
    id: "emma",
    name: "Emma L.",
    tag: "Hair Guide",
    quote: "I changed my haircut confidently because the previews showed what would work.",
  },
  {
    id: "meera",
    name: "Meera R.",
    tag: "Skin Routine",
    quote: "My AM/PM routine is down to products that actually work for my skin type.",
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
    answer: "Yes. Your image is processed securely and only accessible within your account.",
  },
  {
    id: "free-preview",
    question: "What is included in the free preview?",
    answer:
      "You get face-shape analysis and a teaser of your report. Unlock once to access skin, colour, hairstyle, hair colour, spectacles, style guide, preview images, and PDF download.",
  },
  {
    id: "style-guide",
    question: "What is the Style Guide section?",
    answer:
      "A personalized wardrobe direction built from your face shape, colour season, and features — including silhouettes, essentials, and accent colours.",
  },
  {
    id: "payment",
    question: "Is it a subscription?",
    answer: "No. Renovaara is a one-time report unlock per analysis. Pay once, keep that report forever.",
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
    price: "₹0",
    note: "No card required",
    cta: "Start free analysis",
    href: "/upload",
    featured: false,
    items: ["Face shape analysis", "Report teaser", "No card required"],
  },
  {
    name: "Full Report",
    price: "₹299",
    originalPrice: "₹599",
    note: "One-time payment",
    cta: "Unlock Full Report — ₹299",
    href: "/upload?intent=purchase",
    featured: true,
    items: [
      "All 7 report sections",
      "Hairstyle, hair colour & glasses previews",
      "Full colour season & skin analysis",
      "Spectacles and hairstyle guide",
      "Personal style guide",
      "Downloadable PDF",
    ],
  },
];

export default function HomePage() {
  const showcaseItems = toBeforeAfterItems();

  return (
    <main className="min-h-screen overflow-x-hidden">
      <ActivityTicker />
      {/* Hero section — full-width ambient glow wrapper */}
      {/* `isolate` creates a stacking context so negative z-indexes are scoped here, not falling behind the body background */}
      <div className="relative isolate overflow-hidden">
        {/* Hero background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover"
          src="/Website%20Hero%20Background.mp4"
        />
        {/* Gradient overlay — keeps text readable over the video */}
        <div
          className={`pointer-events-none absolute inset-0 -z-10 ${styles.heroOverlay}`}
          aria-hidden
        />
        {/* Ambient orbs — kept at reduced opacity to blend with video */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className={`glow-orb absolute -top-40 -left-40 h-[650px] w-[650px] opacity-40 ${styles.orbDark}`} />
          <div className={`glow-orb absolute -top-20 right-[-10%] h-[520px] w-[520px] opacity-35 ${styles.orbDarkSoft}`} />
          <div className={`glow-orb absolute bottom-0 left-1/2 -translate-x-1/2 h-96 w-[700px] opacity-30 ${styles.orbRose}`} />
        </div>
        <div className="container max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:px-8 lg:pb-12">
          <div className={`relative ${styles.heroShell}`}>
            <section className={`${styles.heroInner} px-6 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14`}>
              <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                <HeroText />
                <HeroReportCard />
              </div>
              <div className={styles.heroMeta}>
                <span className={styles.heroMetaItem}>Private uploads</span>
                <span className={styles.heroMetaItem}>Fast AI guidance</span>
                <span className={styles.heroMetaItem}>Upload → analyze → unlock</span>
              </div>
            </section>
          </div>
        </div>
      </div>{/* end hero glow wrapper */}

      <RevealSection>
        <StatsCounters items={STATS} />
      </RevealSection>

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

      <RevealSection>
        <AiStoryPanels />
      </RevealSection>

      {/* Report showcase video — warm flatlay with Colour Season + Skin Routine + Style Guide */}
      <section className="container max-w-4xl py-8">
        <RevealSection>
          <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-terracotta/20">
            <video
              src="/e6672f79-03ed-48f9-8259-eacd582aba8d.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              className="w-full h-auto block"
            />
          </div>
        </RevealSection>
      </section>

      <section className="container max-w-6xl py-8 sm:py-12">
        <div className={`rounded-3xl border border-iris/20 overflow-hidden shadow-card ${styles.ctaBand}`}>
          <div className="grid md:grid-cols-2 items-center">
            {/* Text side */}
            <div className="px-8 py-10 sm:px-12 sm:py-12 text-left">
              <h2 className="text-2xl sm:text-3xl text-ink leading-snug">{HOME_CONTENT.ctaBanner.title}</h2>
              <p className="mt-3 text-ink-stone leading-relaxed">
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
            {/* Promo image side */}
            <div className="relative hidden md:block h-full min-h-[280px]">
              <Image
                src="/1779024309.png"
                alt="Stop guessing. Start knowing — Renovaara beauty analysis preview"
                fill
                className="object-cover object-left"
                sizes="(max-width: 768px) 0vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Color Season Spotlight */}
      <section className="container max-w-6xl py-12 sm:py-16">
        <RevealSection>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Lifestyle image */}
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-card">
              <Image
                src="/1779024304.png"
                alt="Renovaara colour season palette — terracotta, rust and warm gold on iPhone"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            {/* Text */}
            <div>
              <span className="section-label">Colour Analysis</span>
              <h2 className="mt-3 text-3xl sm:text-4xl text-ink leading-tight">
                Know exactly which <span className="gradient-text">colours light you up</span>
              </h2>
              <p className="mt-4 text-ink-stone leading-relaxed">
                Your colour season tells you which shades of clothing, makeup, and metals make you glow — and which ones wash you out. Renovaara identifies your season from a single selfie and builds a curated palette around it.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Warm Autumn", "Soft Summer", "Clear Spring", "True Winter", "Deep Autumn", "Light Spring"].map((s) => (
                  <span key={s} className="rounded-full border border-terracotta/30 bg-terracotta/10 px-3 py-1 text-xs text-terracotta">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      <SampleShowcase items={showcaseItems} tuning={HOME_CONTENT.showcase.tuning} />

      {/* Report spotlight */}
      <section className="relative isolate overflow-hidden py-24 sm:py-32">
        <Image
          src="/1779024298.png"
          alt=""
          fill
          aria-hidden
          className="object-cover object-center -z-20"
          sizes="100vw"
        />
        <div
          className={`pointer-events-none absolute inset-0 -z-10 ${styles.darkOverlay}`}
          aria-hidden
        />
        <div className="container max-w-6xl text-center">
          <RevealSection>
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm">
              Seven-section report
            </span>
            <h2 className="mt-5 text-3xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
              Everything you need in{" "}
              <span className="bg-gradient-to-r from-pink-300 to-violet-300 bg-clip-text text-transparent">
                one unlock
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/70 text-base sm:text-lg leading-relaxed">
              Skin, colour, hairstyle, hair colour, spectacles, and a personal style guide — with photorealistic preview images generated from your selfie.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" variant="accent" className="group cta-shimmer">
                <Link href="/upload">
                  Get My Report
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </RevealSection>
        </div>
      </section>

      <section id="pricing" className="container max-w-6xl py-16 scroll-mt-20">
        <RevealSection>
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl text-ink">Simple pricing</h2>
            <p className="mx-auto mt-3 max-w-2xl text-ink-stone">Choose the depth that matches your beauty goals.</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
            {PLANS.map((plan) => (
              <article
                key={plan.name}
                className={plan.featured ? "card-soft chrome-border relative md:scale-[1.05] z-10 shadow-2xl shadow-pink-200/60 ring-2 ring-pink-300/40" : "card-soft"}
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
            Secure checkout and instant report delivery
          </div>
        </RevealSection>
      </section>

      <TestimonialsSection items={TESTIMONIALS} />

      {/* Brand cinematic — Seedance promo */}
      <section className="container max-w-3xl py-16">
        <RevealSection>
          <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-terracotta/20">
            <video
              src="/Seedance Prompt3.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              className="w-full h-auto block"
            />
          </div>
          <p className="mt-4 text-center text-sm text-ink-mist tracking-wide">
            Where beauty meets intelligence — powered by AI
          </p>
        </RevealSection>
      </section>

      <section id="faq" className="container max-w-4xl py-16 scroll-mt-20">
        <RevealSection>
          <h2 className="text-center text-3xl sm:text-4xl text-ink">Frequently asked questions</h2>
          <FAQAccordion items={FAQS} />
        </RevealSection>
      </section>
      {/* Structured data — SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Renovaara",
            applicationCategory: "LifestyleApplication",
            operatingSystem: "Web",
            url: "https://renovaara.in",
            description:
              "AI-powered beauty report: face shape, colour season, skin analysis, hairstyle guide, spectacles guide, style guide, and photorealistic preview images — all from one selfie.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "INR",
              description: "Free preview — paid full report from Rs 299",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              bestRating: "5",
              ratingCount: "50000",
            },
          }),
        }}
      />
      {/* Structured data — FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }),
        }}
      />
      <StickyMobileCta />
    </main>
  );
}
