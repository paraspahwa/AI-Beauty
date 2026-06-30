import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SampleShowcase } from "@/components/home/SampleShowcase";
import { StatsCounters, type StatItem } from "@/components/home/StatsCounters";
import { FAQAccordion } from "@/components/home/FAQAccordion";
import { TestimonialsSection, type TestimonialItem } from "@/components/home/TestimonialsSection";
import { ActivityTicker } from "@/components/home/ActivityTicker";
import { HeroReportCard } from "@/components/home/HeroReportCard";
import { StickyMobileCta } from "@/components/home/StickyMobileCta";
import { HOME_CONTENT, toBeforeAfterItems } from "@/lib/home-content";
import { getLandingPlans, fmtInr } from "@/lib/landing-pricing";
import { LANDING_FEATURES, LANDING_STEPS, getLandingFaqs } from "@/lib/landing-content";
import { publicEnv } from "@/lib/public-env";
import { HeroText } from "@/components/home/HeroText";
import { RevealSection } from "@/components/home/RevealSection";
import { AiStoryPanels } from "@/components/home/AiStoryPanels";
import styles from "./home.module.css";

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

const STATS: StatItem[] = HOME_CONTENT.stats;

const FAQS = getLandingFaqs();

export default function HomePage() {
  const showcaseItems = toBeforeAfterItems();
  const plans = getLandingPlans();
  const reportPriceLabel = fmtInr(publicEnv.razorpay.priceINR);

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Hero section — full-width ambient glow wrapper */}
      {/* `isolate` creates a stacking context so negative z-indexes are scoped here, not falling behind the body background */}
      <div className="relative isolate overflow-hidden min-h-app-viewport flex flex-col">
        <ActivityTicker />
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
        <div className="page-bleed-x relative z-10 flex flex-1 flex-col pb-8 pt-4 sm:pb-10 sm:pt-6 lg:pb-12">
          <div className={`relative flex flex-1 flex-col ${styles.heroShell}`}>
            <section className={`${styles.heroInner} flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12`}>
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12 xl:gap-16">
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
            <p className="mx-auto mt-3 max-w-2xl text-ink-stone">Five steps from free preview to your complete beauty profile.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {LANDING_STEPS.map((step, index) => (
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
              Six luxury analysis infographics from one selfie, plus an optional Style Guide add-on.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LANDING_FEATURES.map(({ icon: Icon, title, description }, index) => {
              const isFeatured = index === 0;
              const articleClass = isFeatured
                ? "sm:col-span-2 lg:col-span-1 aurora-card chrome-border"
                : "card-soft";
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
              Six analysis infographics
            </span>
            <h2 className="mt-5 text-3xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
              Everything you need in{" "}
              <span className="bg-gradient-to-r from-pink-300 to-violet-300 bg-clip-text text-transparent">
                one unlock
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/70 text-base sm:text-lg leading-relaxed">
              Face features, skin, colour, hairstyle, spectacles, and hair colour — each delivered as a luxury infographic from your selfie, plus a PDF you can download and share.
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
            <p className="mx-auto mt-3 max-w-2xl text-ink-stone">
              Free face-shape preview, Full Report with six infographics at {reportPriceLabel}, or add a Style Guide after unlock.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={plan.featured ? "card-soft chrome-border relative md:scale-[1.03] z-10 shadow-2xl shadow-terracotta/10 dark:shadow-black/40 ring-2 ring-terracotta/20 dark:ring-white/10" : "card-soft"}
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
          <div className="mt-8 flex flex-col items-center justify-center gap-2 rounded-2xl bg-sage/10 px-6 py-3 text-sm text-ink-stone text-center">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-sage" />
              Secure checkout and instant infographic delivery
            </div>
            <p className="text-xs text-ink-mist">
              Style Guide is purchased separately after Full Report unlock — not included in the main report price.
            </p>
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
              "AI-powered beauty report: face shape preview, six analysis infographics (skin, colour, hairstyle, spectacles, hair colour), PDF download, and optional Style Guide add-on — all from one selfie.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "INR",
              description: `Free preview — Full Report from ${reportPriceLabel}`,
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
