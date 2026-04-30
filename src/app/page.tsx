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
  ChevronDown,
  Lock,
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

// Mock colour palette for the hero preview card
const MOCK_PALETTE = [
  { hex: "#C17A5F", label: "Terracotta" },
  { hex: "#C4A882", label: "Camel" },
  { hex: "#9CAF88", label: "Sage" },
  { hex: "#7A8450", label: "Olive" },
  { hex: "#D9C8A8", label: "Linen" },
  { hex: "#A85E47", label: "Rust" },
];

function MockReportCard() {
  return (
    <div
      className="relative rounded-4xl p-6 overflow-hidden chrome-border"
      style={{ background: "linear-gradient(145deg, #12121A, #1A1A26)" }}
    >
      {/* Subtle background shimmer */}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.03)_50%,transparent_60%)] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-terracotta to-camel text-white">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="font-serif text-sm text-ink">StyleAI Report</span>
        </div>
          <span className="text-xs rounded-full px-3 py-1 font-medium" style={{ background: "rgba(201,149,107,0.15)", color: "#E8C990", border: "1px solid rgba(201,149,107,0.25)" }}>
          Soft Autumn
          </span>
      </div>

      {/* Photo + face shape */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative shrink-0">
          <div className="h-20 w-20 rounded-full flex items-center justify-center border-2 shadow-card"
               style={{ background: "linear-gradient(135deg, rgba(201,149,107,0.3), rgba(123,110,158,0.2))", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <Camera className="h-7 w-7" style={{ color: "#C9956B" }} />
          </div>
          <div className="absolute -bottom-1 -right-1 rounded-full p-1 shadow-card border-2" style={{ background: "#7B6E9E", borderColor: "rgba(26,26,38,1)" }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink mb-1">Face shape</p>
          <div className="flex flex-wrap gap-1.5">
            {["Oval", "Balanced", "Symmetrical"].map((t) => (
              <span key={t} className="pill text-xs">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Colour palette */}
      <div className="mb-5">
        <p className="text-xs uppercase tracking-widest text-ink-mist font-medium mb-2.5">
          Your colour palette
        </p>
        <div className="flex gap-2">
          {MOCK_PALETTE.map((c) => (
            <motion.div
              key={c.hex}
              whileHover={{ y: -4, scale: 1.1 }}
              transition={{ duration: 0.2 }}
              title={c.label}
              className="flex-1 aspect-square rounded-xl shadow-card border-2 border-white/80"
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      {/* Locked premium sections */}
      <div className="space-y-2">
        {["Skin Analysis", "Spectacles Guide", "Hairstyle Guide"].map((section) => (
          <div
            key={section}
            className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span className="text-sm text-ink-stone">{section}</span>
            <Lock className="h-3.5 w-3.5" style={{ color: "#C9956B" }} />
          </div>
        ))}
      </div>

      {/* Unlock hint */}
      <div className="mt-4 rounded-xl px-4 py-3 text-center" style={{ background: "linear-gradient(135deg, rgba(201,149,107,0.1), rgba(232,201,144,0.08))", border: "1px solid rgba(201,149,107,0.2)" }}>
        <p className="text-xs font-medium" style={{ color: "#E8C990" }}>✦ Unlock the full report for $9.99</p>
      </div>

      {/* Floating stat badges */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-4 top-1/4 rounded-2xl shadow-premium px-3 py-2 text-center min-w-[80px]"
        style={{ background: "linear-gradient(145deg, #1A1A26, #12121A)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="font-bold text-lg leading-none" style={{ color: "#C9956B" }}>50k+</p>
        <p className="text-ink-mist text-xs mt-0.5">Analyses</p>
      </motion.div>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -left-4 bottom-1/4 rounded-2xl shadow-premium px-3 py-2 text-center min-w-[72px]"
        style={{ background: "linear-gradient(145deg, #1A1A26, #12121A)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="font-bold text-lg leading-none" style={{ color: "#B8C4CC" }}>4.9★</p>
        <p className="text-ink-mist text-xs mt-0.5">Rating</p>
      </motion.div>
    </div>
  );
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="container max-w-3xl py-24">
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
              className="rounded-2xl overflow-hidden"
              style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
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
      {/* Animated gradient background — obsidian with chrome/iris orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, #C9956B 0%, transparent 60%)" }}
          animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #7B6E9E 0%, transparent 70%)" }}
          animate={{ y: [0, -40, 0], x: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/3 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #E8C990 0%, transparent 70%)" }}
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Hero Section ── */}
      <section className="container max-w-6xl pt-10 pb-16 sm:pt-16 sm:pb-24">
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
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-widest font-medium chrome-border"
              style={{ color: "#E8C990", background: "rgba(201,149,107,0.08)" }}
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
                    <Star key={i} className="h-4 w-4" style={{ fill: "#E8C990", color: "#E8C990" }} />
                  ))}
                </div>
                <span className="text-ink-stone">4.9/5 rating</span>
              </div>
              <div className="flex items-center gap-2 text-ink-stone">
                <CheckCircle2 className="h-4 w-4" style={{ color: "#B8C4CC" }} />
                50,000+ analyses
              </div>
              <div className="flex items-center gap-2 text-ink-stone">
                <ShieldCheck className="h-4 w-4" style={{ color: "#B8C4CC" }} />
                30-day guarantee
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Mock Report Preview */}
          <motion.div
            variants={slideIn("right")}
            initial="hidden"
            animate="visible"
            className="relative px-8 lg:px-4"
          >
            <MockReportCard />
            {/* Decorative blur glows */}
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-terracotta/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-sage/15 blur-2xl pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section id="how" className="container max-w-6xl py-20 scroll-mt-16">
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
                  <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-obsidian shadow-glow"
                    style={{ background: "linear-gradient(135deg, #C9956B, #E8C990)" }}
                  >
                    <item.icon className="h-8 w-8" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-card"
                    style={{ background: "#1A1A26", border: "1px solid rgba(201,149,107,0.3)", color: "#C9956B" }}
                  >
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

      {/* ── Features Grid ── */}
      <section id="features" className="container max-w-6xl py-20 scroll-mt-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeUp} className="text-center text-3xl sm:text-4xl text-ink mb-4">
            Everything you need to look your best
          </motion.h2>
          <motion.p variants={fadeUp} className="text-center text-ink-stone mb-12 max-w-xl mx-auto">
            One selfie. A complete style blueprint personalised to your unique features.
          </motion.p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="card-soft text-center cursor-pointer group"
              >
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full group-hover:scale-110 transition-transform"
                  style={{ background: "linear-gradient(135deg, rgba(201,149,107,0.15), rgba(123,110,158,0.15))", color: "#C9956B" }}
                >
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="font-serif text-xl text-ink mb-2">{feature.title}</h3>
                <p className="text-sm text-ink-stone leading-relaxed">{feature.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Testimonials ── */}
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
                    <Star key={i} className="h-4 w-4" style={{ fill: "#E8C990", color: "#E8C990" }} />
                  ))}
                </div>
                <p className="text-sm text-ink-stone leading-relaxed mb-4">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-obsidian text-sm font-bold"
                    style={{ background: "linear-gradient(135deg, #C9956B, #E8C990)" }}
                  >
                    {testimonial.name[0]}
                  </div>
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

      {/* ── Pricing ── */}
      <section id="pricing" className="container max-w-4xl py-20 scroll-mt-16">
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
            Try it free, upgrade when you&apos;re ready
          </motion.p>

          <div className="grid gap-6 md:grid-cols-2">
            <motion.div variants={fadeUp} className="card-soft">
              <p className="text-xs uppercase tracking-widest text-ink-mist mb-2">Free preview</p>
              <p className="font-serif text-5xl text-ink mb-6">$0</p>
              <ul className="space-y-3 text-sm text-ink-stone mb-6">
                {["Color season + custom palette", "Face shape identification", "Personalized introduction"].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/upload">Try for free</Link>
              </Button>
            </motion.div>

            <motion.div
              variants={scaleIn}
              className="card-soft border-0 relative overflow-hidden chrome-border"
            >
              <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full" style={{ background: "linear-gradient(135deg, #C9956B, #E8C990)", color: "#0A0A0F" }}>
                BEST VALUE
              </div>
              <p className="text-xs uppercase tracking-widest text-terracotta mb-2">Full report</p>
              <div className="flex items-baseline gap-2 mb-6">
                <p className="font-serif text-5xl text-ink">$9.99</p>
                <p className="text-sm text-ink-mist line-through">$29.99</p>
              </div>
              <ul className="space-y-3 text-sm text-ink-stone mb-6">
                {[
                  "Everything in Free, plus:",
                  "Skin analysis & custom routine",
                  "Spectacles guide",
                  "Hairstyle recommendations",
                  "Downloadable PDF report",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
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

      {/* ── FAQ ── */}
      <FAQ />

      {/* ── Final CTA ── */}
      <section className="container max-w-3xl py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center rounded-4xl p-12 chrome-border"
          style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.98), rgba(26,26,38,0.95))" }}
        >
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl text-ink mb-4">
            Ready to discover your style?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-ink-stone mb-8 max-w-xl mx-auto">
            Join thousands who&apos;ve already unlocked their perfect colors, styles, and confidence.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Button asChild size="lg" variant="accent" className="text-lg px-10 h-14 group">
              <Link href="/upload">
                <Camera className="h-5 w-5" />
                Start your free analysis
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-cream-200 bg-white/50">
        <div className="container max-w-6xl py-12">
          <div className="grid gap-8 md:grid-cols-4 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-terracotta to-camel text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="font-serif text-lg text-ink">StyleAI</span>
              </div>
              <p className="text-sm text-ink-stone leading-relaxed max-w-xs">
                Your AI-powered personal stylist. Discover the colors, cuts, and styles that make
                you look and feel your best.
              </p>
            </div>

            {/* Product links */}
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-mist font-medium mb-4">Product</p>
              <ul className="space-y-2.5 text-sm text-ink-stone">
                {[
                  { href: "/#how", label: "How it works" },
                  { href: "/#features", label: "Features" },
                  { href: "/#pricing", label: "Pricing" },
                  { href: "/upload", label: "Get started" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-ink transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal links */}
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-mist font-medium mb-4">Legal</p>
              <ul className="space-y-2.5 text-sm text-ink-stone">
                {[
                  { href: "#", label: "Privacy Policy" },
                  { href: "#", label: "Terms of Service" },
                  { href: "#", label: "Refund Policy" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-ink transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-mist">
            <p>© {new Date().getFullYear()} StyleAI. All rights reserved.</p>
            <p>Crafted with care · Powered by GPT-4o &amp; AWS Rekognition</p>
          </div>
        </div>
      </footer>
    </main>
  );
}