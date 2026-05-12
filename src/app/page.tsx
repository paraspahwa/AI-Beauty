"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Camera,
  Glasses,
  Scissors,
  ShieldCheck,
  Star,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  Lock,
  ShoppingBag,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { staggerContainer, fadeUp, slideIn, scaleIn, blurIn, springPop } from "@/lib/animations";

const FEATURES = [
  {
    icon: ShoppingBag,
    title: "Virtual Clothing Try-On",
    body: "Upload any flat-lay or mannequin photo of a garment and see it draped on your body instantly — selfie or full-body mode.",
  },
  {
    icon: Wand2,
    title: "Makeup Studio",
    body: "Control lip colour, eyeshadow palette, blush, foundation shade, contour, and eyeliner — then generate a photorealistic preview on your face.",
  },
  {
    icon: Glasses,
    title: "Spectacles Guide",
    body: "Frame shapes, metals, and colours matched to your face shape and undertone — with a personalised fit guide.",
  },
  {
    icon: Scissors,
    title: "Hairstyle & Hair Color",
    body: "Cuts, lengths, and AI hair-color previews — matched to your face shape, skin tone, and eye colour.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah K.",
    tag: "Virtual Try-On",
    quote: "I tried on 10 outfits without leaving my house. The try-on is shockingly accurate!",
    rating: 5,
  },
  {
    name: "Priya M.",
    tag: "Makeup Studio",
    quote: "Picking my exact lip shade and eyeliner style then seeing it on MY face — absolute game changer before buying anything.",
    rating: 5,
  },
  {
    name: "Emma L.",
    tag: "Hairstyle Guide",
    quote: "The AI hairstyle previews saved me from a bad cut. Best $10 I've spent on myself.",
    rating: 5,
  },
];

const FAQS = [
  {
    q: "How accurate is the AI analysis?",
    a: "Our AI combines AWS Rekognition for facial detection with GPT-4o for color, skin, and style analysis. Results work best with a clear, well-lit, front-facing photo with no sunglasses."
  },
  {
    q: "Is my photo stored or shared?",
    a: "Your privacy is paramount. Photos are encrypted, stored securely, and only accessible to you. We never share your data with third parties."
  },
  {
    q: "What's included in the free preview?",
    a: "You'll get face shape identification and a personalized introduction — completely free, no card required. The full report unlocks skin analysis, spectacles guide, hairstyle guide, AI Beauty Studio (makeup, clothing try-on, hair color), and a downloadable PDF."
  },
  {
    q: "How does the AI Makeup Studio work?",
    a: "Choose your exact lip colour, eyeshadow palette, blush shade and intensity, foundation tone, contour toggle, and eyeliner style — then hit 'Apply Makeup' to generate a photorealistic preview on your actual photo. Each unique combination is cached so re-generating is instant."
  },
  {
    q: "How does Virtual Clothing Try-On work?",
    a: "Upload a flat-lay or mannequin photo of any garment. For the best draping results, switch to Full Body mode and upload a standing photo. Our AI uses fal-ai's virtual try-on model to place the garment on you realistically."
  },
  {
    q: "Can I share my report?",
    a: "Yes — hit 'Share' on your report to generate a public link anyone can view (read-only). You can revoke it any time."
  },
  {
    q: "Can I get a refund?",
    a: "Yes! We offer a 30-day money-back guarantee. If you're not satisfied with your full report, contact us for a full refund — no questions asked."
  },
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
        <div className="flex items-center gap-2">
          <span className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "#888", border: "1px solid rgba(255,255,255,0.08)" }}>
            Sample
          </span>
          <span className="text-xs rounded-full px-3 py-1 font-medium" style={{ background: "rgba(201,149,107,0.15)", color: "#E8C990", border: "1px solid rgba(201,149,107,0.25)" }}>
          Soft Autumn
          </span>
        </div>
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

      {/* Virtual Try-On teaser */}
      <div className="mb-4 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <ShoppingBag className="h-3.5 w-3.5" style={{ color: "#C9956B" }} />
          <p className="text-xs font-medium" style={{ color: "#E8C990" }}>Virtual Try-On</p>
          <span className="ml-auto text-[10px] rounded-full px-2 py-0.5 font-medium" style={{ background: "rgba(201,149,107,0.15)", color: "#C8A96E" }}>Premium</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(201,149,107,0.12)" }}>
            <Camera className="h-5 w-5" style={{ color: "#C9956B" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-2 w-3/4 rounded-full mb-1.5" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-2 w-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
          </div>
          <Wand2 className="h-4 w-4 shrink-0" style={{ color: "#C8A96E" }} />
        </div>
      </div>

      {/* Locked premium sections */}
      <div className="space-y-2">
        {["AI Makeup Studio", "Spectacles Guide", "Hairstyle & Hair Color", "Skin Analysis"].map((section) => (
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
        <p className="text-xs font-medium" style={{ color: "#E8C990" }}>✦ Unlock full report — $9.99 · ₹399</p>
      </div>

      {/* Floating stat badges */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-4 top-1/4 stat-badge min-w-[80px]"
      >
        <p className="font-bold text-lg leading-none" style={{ color: "#C9956B" }}>50k+</p>
        <p className="text-ink-mist text-xs mt-0.5">Analyses</p>
      </motion.div>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -left-4 bottom-1/4 stat-badge min-w-[72px]"
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
              variants={springPop}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-widest font-medium chrome-border"
              style={{ color: "#E8C990", background: "rgba(201,149,107,0.08)" }}
            >
              <Sparkles className="h-3.5 w-3.5" /> AI Personal Stylist
            </motion.span>

            <motion.h1
              variants={blurIn}
              className="mt-6 text-4xl sm:text-5xl lg:text-6xl text-ink leading-tight"
            >
              Discover the styles that{" "}
              <span className="gradient-text font-bold">flatter you</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-base sm:text-lg text-ink-stone leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Upload a selfie and get a full beauty report: face shape analysis, AI Makeup Studio
              with granular controls, virtual clothing try-on, spectacles guide, hairstyle
              recommendations, skin routine — all powered by AI.
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
              One selfie. Four steps. A complete personal style profile in minutes.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                icon: Camera,
                title: "Upload your selfie",
                desc: "Take or upload a clear, well-lit front-facing photo. No account needed to start.",
                accent: "#C9956B",
              },
              {
                step: "02",
                icon: Sparkles,
                title: "AI reads your features",
                desc: "Face shape, skin tone, undertone, eye shape, and 20+ unique traits analysed by GPT-4o and AWS Rekognition.",
                accent: "#7B6E9E",
              },
              {
                step: "03",
                icon: Wand2,
                title: "Try on looks in the Studio",
                desc: "Pick your lip colour, eyeshadow, blush, and eyeliner — or upload a garment — and generate photorealistic AI previews on your photo.",
                accent: "#C9956B",
              },
              {
                step: "04",
                icon: Scissors,
                title: "Download your blueprint",
                desc: "Full spectacles guide, hairstyle recommendations, skin routine, hair-color previews, and a shareable/downloadable PDF.",
                accent: "#7B6E9E",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="relative group"
              >
                <div className="card-soft h-full hover:shadow-premium transition-all duration-300 group-hover:-translate-y-2">
                  {/* Step number + icon */}
                  <div className="mb-5 relative">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-glow"
                      style={{ background: `linear-gradient(135deg, ${item.accent}22, ${item.accent}44)`, border: `1px solid ${item.accent}44` }}
                    >
                      <item.icon className="h-6 w-6" style={{ color: item.accent }} />
                    </div>
                    <div
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-card"
                      style={{ background: "#1A1A26", border: "1px solid rgba(201,149,107,0.3)", color: "#C9956B" }}
                    >
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-ink mb-2">{item.title}</h3>
                  <p className="text-sm text-ink-stone leading-relaxed">{item.desc}</p>
                </div>

                {/* Connecting arrow — hidden on mobile */}
                {i < 3 && (
                  <div className="hidden lg:flex absolute top-1/3 -right-3 z-10 items-center justify-center w-6 h-6 rounded-full"
                    style={{ background: "#1A1A26", border: "1px solid rgba(201,149,107,0.2)" }}
                  >
                    <ArrowRight className="h-3 w-3" style={{ color: "#C9956B" }} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA nudge */}
          <motion.div variants={fadeUp} className="mt-12 text-center">
            <Button asChild size="lg" variant="accent" className="group">
              <Link href="/upload">
                <Camera className="h-4 w-4" />
                Try it free — no card needed
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </motion.div>
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
                className="card-beam text-center cursor-pointer group"
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
                    <p className="text-xs text-ink-mist">{testimonial.tag}</p>
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
            Try it free, upgrade when you&apos;re ready · No subscription, no hidden fees
          </motion.p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Free */}
            <motion.div variants={fadeUp} className="card-soft">
              <p className="text-xs uppercase tracking-widest text-ink-mist mb-2">Free preview</p>
              <p className="font-serif text-5xl text-ink mb-1">$0</p>
              <p className="text-xs text-ink-mist mb-6">No card required · Free forever</p>
              <ul className="space-y-3 text-sm text-ink-stone mb-8">
                {[
                  "Face shape identification",
                  "20+ unique facial trait breakdown",
                  "Personalized style introduction",
                  "Shareable report link",
                ].map((item) => (
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

            {/* Full report */}
            <motion.div
              variants={scaleIn}
              className="card-soft border-0 relative overflow-hidden chrome-border"
            >
              <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full" style={{ background: "linear-gradient(135deg, #C9956B, #E8C990)", color: "#0A0A0F" }}>
                BEST VALUE
              </div>
              <p className="text-xs uppercase tracking-widest text-terracotta mb-2">Full report</p>
              <div className="flex items-baseline gap-3 mb-1">
                <p className="font-serif text-5xl text-ink">$9.99</p>
                <p className="text-sm text-ink-mist line-through">$29.99</p>
              </div>
              <p className="text-xs text-ink-mist mb-6">One-time · ₹399 for India · 30-day guarantee</p>
              <ul className="space-y-3 text-sm text-ink-stone mb-8">
                {[
                  "Everything in Free, plus:",
                  "💄 Makeup Studio — lip, eyeshadow, blush, foundation, contour & eyeliner",
                  "👗 Virtual Clothing Try-On (selfie + full-body mode)",
                  "💇 AI Hair Color & Hairstyle previews",
                  "👓 Spectacles guide — frames, metals & colours for your face",
                  "🧴 Skin analysis & personalized routine",
                  "📄 Downloadable PDF report",
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
            Your selfie stays private — encrypted, only you can view your report · 30-day money-back guarantee
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
            <p>Powered by GPT-4o · AWS Rekognition · FAL AI (makeup, try-on, hair)</p>
          </div>
        </div>
      </footer>
    </main>
  );
}