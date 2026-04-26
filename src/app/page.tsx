"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Camera,
  Palette,
  Glasses,
  Scissors,
  ShieldCheck,
  Star,
  CheckCircle2,
  ArrowRight,
  ChevronDown
} from "lucide-react";
import { useState } from "react";
import { staggerContainer, fadeUp, slideIn, scaleIn } from "@/lib/animations";

const FEATURES = [
  {
    icon: Palette,
    title: "Color Season",
    body: "12-season analysis with a custom palette, metals, and makeup recommendations."
  },
  {
    icon: Sparkles,
    title: "Face Features",
    body: "Identify your shape and discover your most flattering characteristics."
  },
  {
    icon: Glasses,
    title: "Spectacles",
    body: "Perfect frame styles, fit guide, and colors tailored to your face."
  },
  {
    icon: Scissors,
    title: "Hairstyle",
    body: "Cuts, lengths, and colors specifically made for your unique features."
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah K.",
    season: "Soft Autumn",
    quote: "Finally understand which colors make me glow! This changed my entire wardrobe.",
    rating: 5,
  },
  {
    name: "Priya M.",
    season: "Deep Winter",
    quote: "The hairstyle recommendations were spot-on. Best $10 I've spent on myself.",
    rating: 5,
  },
  {
    name: "Emma L.",
    season: "Light Spring",
    quote: "My glasses shopping is so much easier now. I know exactly what to look for!",
    rating: 5,
  },
];

const FAQS = [
  {
    q: "How accurate is the AI analysis?",
    a: "Our AI combines AWS Rekognition for facial detection with GPT-4 for color and style analysis. While highly accurate, results work best with clear, well-lit front-facing photos."
  },
  {
    q: "Is my photo stored or shared?",
    a: "Your privacy is paramount. Photos are encrypted, stored securely, and only accessible to you. We never share your data with third parties."
  },
  {
    q: "What's included in the free preview?",
    a: "You'll get your color season analysis with a custom palette, face shape identification, and personalized intro. Upgrade unlocks skin analysis, spectacles guide, hairstyles, and PDF download."
  },
  {
    q: "Can I get a refund?",
    a: "Yes! We offer a 30-day money-back guarantee. If you're not satisfied with your full report, contact us for a full refund."
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="container max-w-3xl py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <motion.h2 variants={fadeUp} className="text-center text-3xl sm:text-4xl text-ink mb-12">
          Frequently asked questions
        </motion.h2>

        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <motion.div
              key={index}
              variants={fadeUp}
              className="rounded-2xl bg-white/80 backdrop-blur-sm border border-cream-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-cream-50 transition-colors"
              >
                <span className="font-medium text-ink pr-4">{faq.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-terracotta transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-6 pb-6"
                >
                  <p className="text-sm text-ink-stone leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #D9A08A 0%, transparent 70%)",
          }}
          animate={{
            y: [0, 30, 0],
            x: [0, -20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 -left-40 w-96 h-96 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #9CAF88 0%, transparent 70%)",
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, 30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Hero Section - Split Layout */}
      <section className="container max-w-6xl pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Headline + Value Prop */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center lg:text-left"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full bg-terracotta/10 px-4 py-2 text-xs uppercase tracking-widest text-terracotta font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" /> AI Personal Stylist
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-4xl sm:text-5xl lg:text-6xl text-ink leading-tight"
            >
              Discover the styles that{" "}
              <span className="gradient-text font-bold">flatter you</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-base sm:text-lg text-ink-stone leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Upload a selfie and unlock a personalized beauty report: face shape, color season,
              skin care, glasses, and hairstyle recommendations—all powered by AI.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
              <Button asChild size="lg" variant="accent" className="group">
                <Link href="/upload">
                  <Camera className="h-4 w-4" />
                  Upload your selfie
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#how">How it works</Link>
              </Button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-wrap gap-8 justify-center lg:justify-start text-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-terracotta text-terracotta" />
                  ))}
                </div>
                <span className="text-ink-stone">4.9/5 rating</span>
              </div>
              <div className="flex items-center gap-2 text-ink-stone">
                <CheckCircle2 className="h-4 w-4 text-sage" />
                50,000+ analyses
              </div>
              <div className="flex items-center gap-2 text-ink-stone">
                <ShieldCheck className="h-4 w-4 text-sage" />
                30-day guarantee
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Upload Card Preview */}
          <motion.div
            variants={slideIn("right")}
            initial="hidden"
            animate="visible"
            className="relative"
          >
            <div className="relative rounded-4xl bg-white shadow-premium p-8 border-2 border-cream-200">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-sage/20 via-camel/20 to-terracotta/20 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-16 w-16 text-terracotta mx-auto mb-4" />
                  <p className="text-ink-stone font-medium">Your beauty analysis</p>
                  <p className="text-sm text-ink-mist mt-1">starts here</p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-xs text-ink-mist">
                  Clear, front-facing photo • Natural lighting • One face
                </p>
              </div>
            </div>

            {/* Floating accent elements */}
            <motion.div
              className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-terracotta/10 blur-2xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-sage/10 blur-2xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="container max-w-6xl py-20 bg-gradient-to-b from-transparent via-cream-50 to-transparent">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl text-ink mb-4">How StyleAI works</h2>
            <p className="text-ink-stone max-w-2xl mx-auto">
              Three simple steps to unlock your personalized beauty profile
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Upload", desc: "Take or upload a clear selfie", icon: Camera },
              { step: "02", title: "AI Analyzes", desc: "Our AI studies your features", icon: Sparkles },
              { step: "03", title: "Get Report", desc: "Receive your personalized guide", icon: Palette },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="relative text-center group"
              >
                <div className="card-soft hover:shadow-premium transition-all duration-300 group-hover:-translate-y-2">
                  <div className="mb-6 relative">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-terracotta to-camel flex items-center justify-center text-white shadow-card">
                      <item.icon className="h-8 w-8" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-card flex items-center justify-center text-terracotta font-bold text-sm">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-xl text-ink mb-2">{item.title}</h3>
                  <p className="text-sm text-ink-stone">{item.desc}</p>
                </div>

                {/* Connecting line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/3 left-full w-full h-0.5 bg-gradient-to-r from-terracotta/30 to-transparent -z-10" />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="container max-w-6xl py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="text-center text-3xl sm:text-4xl text-ink mb-12">
            Everything you need to look your best
          </motion.h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="card-soft text-center cursor-pointer group"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-terracotta/20 to-sage/20 text-terracotta group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="font-serif text-xl text-ink mb-2">{feature.title}</h3>
                <p className="text-sm text-ink-stone leading-relaxed">{feature.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="container max-w-6xl py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="text-center text-3xl sm:text-4xl text-ink mb-12">
            Loved by thousands
          </motion.h2>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className="card-soft"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-terracotta text-terracotta" />
                  ))}
                </div>
                <p className="text-sm text-ink-stone leading-relaxed mb-4">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sage to-camel" />
                  <div>
                    <p className="font-medium text-ink text-sm">{testimonial.name}</p>
                    <p className="text-xs text-ink-mist">{testimonial.season}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Pricing */}
      <section className="container max-w-4xl py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="text-center text-3xl sm:text-4xl text-ink mb-4">
            Simple, honest pricing
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-ink-stone mb-12">
            Try it free, upgrade when you're ready
          </motion.p>

          <div className="grid gap-6 md:grid-cols-2">
            <motion.div variants={fadeUp} className="card-soft">
              <p className="text-xs uppercase tracking-widest text-ink-mist mb-2">Free preview</p>
              <p className="font-serif text-5xl text-ink mb-6">$0</p>
              <ul className="space-y-3 text-sm text-ink-stone mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                  Color season + custom palette
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                  Face shape identification
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                  Personalized introduction
                </li>
              </ul>
            </motion.div>

            <motion.div
              variants={scaleIn}
              className="card-soft border-2 border-terracotta/40 bg-white relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 bg-terracotta text-white text-xs font-bold px-3 py-1 rounded-full">
                BEST VALUE
              </div>
              <p className="text-xs uppercase tracking-widest text-terracotta mb-2">Full report</p>
              <div className="flex items-baseline gap-2 mb-6">
                <p className="font-serif text-5xl text-ink">$9.99</p>
                <p className="text-sm text-ink-mist line-through">$29.99</p>
              </div>
              <ul className="space-y-3 text-sm text-ink-stone mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                  Everything in Free, plus:
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                  Skin analysis & custom routine
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                  Spectacles guide
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                  Hairstyle recommendations
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                  Downloadable PDF report
                </li>
              </ul>
              <Button asChild variant="accent" size="lg" className="w-full">
                <Link href="/upload">Get my full report</Link>
              </Button>
            </motion.div>
          </div>

          <motion.p
            variants={fadeUp}
            className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-mist"
          >
            <ShieldCheck className="h-4 w-4" />
            Your selfie stays private — only you can view your report
          </motion.p>
        </motion.div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Final CTA */}
      <section className="container max-w-3xl py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center rounded-4xl bg-gradient-to-br from-terracotta/10 via-camel/10 to-sage/10 p-12 border border-cream-200"
        >
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl text-ink mb-4">
            Ready to discover your style?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-ink-stone mb-8 max-w-xl mx-auto">
            Join thousands who've already unlocked their perfect colors, styles, and confidence.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Button asChild size="lg" variant="accent" className="text-lg px-10 h-14">
              <Link href="/upload">
                <Camera className="h-5 w-5" />
                Start your free analysis
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="container max-w-6xl py-12 text-center border-t border-cream-200">
        <p className="text-sm text-ink-mist">
          © {new Date().getFullYear()} StyleAI · Crafted with care
        </p>
      </footer>
    </main>
  );
}
