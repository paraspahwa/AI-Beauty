import { FAQAccordion } from "@/components/home/FAQAccordion";
import { TestimonialsSection, type TestimonialItem } from "@/components/home/TestimonialsSection";
import { StickyMobileCta } from "@/components/home/StickyMobileCta";
import { LandingHero } from "@/components/home/LandingHero";
import { ProofStrip } from "@/components/home/ProofStrip";
import { ReportSampleGallery } from "@/components/home/ReportSampleGallery";
import { JourneyTimeline } from "@/components/home/JourneyTimeline";
import { ChapterSpreads } from "@/components/home/ChapterSpreads";
import { LandingPricing } from "@/components/home/LandingPricing";
import { FinalCta } from "@/components/home/FinalCta";
import { RevealSection } from "@/components/home/RevealSection";
import { HOME_CONTENT } from "@/lib/home-content";
import { getLandingPlans, fmtInr } from "@/lib/landing-pricing";
import { LANDING_STEPS, getLandingFaqs } from "@/lib/landing-content";
import { publicEnv } from "@/lib/public-env";

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

const FAQS = getLandingFaqs();

export default function HomePage() {
  const plans = getLandingPlans();
  const reportPriceLabel = fmtInr(publicEnv.razorpay.priceINR);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--color-background)]">
      <LandingHero />

      <ProofStrip stats={HOME_CONTENT.stats} />

      <RevealSection>
        <ReportSampleGallery />
      </RevealSection>

      <RevealSection>
        <JourneyTimeline steps={LANDING_STEPS} />
      </RevealSection>

      <RevealSection>
        <ChapterSpreads />
      </RevealSection>

      <RevealSection>
        <LandingPricing plans={plans} reportPriceLabel={reportPriceLabel} />
      </RevealSection>

      <RevealSection>
        <TestimonialsSection items={TESTIMONIALS} />
      </RevealSection>

      <section id="faq" className="container max-w-4xl scroll-mt-20 py-16 sm:py-20">
        <RevealSection>
          <div className="text-center">
            <span className="foil-label">Questions</span>
            <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <FAQAccordion items={FAQS} />
        </RevealSection>
      </section>

      <FinalCta />

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
