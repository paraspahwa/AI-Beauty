"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageUploader } from "@/components/ImageUploader";
import { ArrowRight, CheckCircle2, Clock, FileText, Lock, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { blurIn, cascadeContainer, fadeUp, springPop, staggerContainer } from "@/lib/animations";
import { OnboardingGate } from "@/components/OnboardingModal";

const TIPS = [
  "Look straight into the camera, hair off your forehead",
  "Use natural light — avoid heavy filters for accurate results",
  "One face per photo · you'll upload garment photos inside the try-on tab",
];

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent"); // "purchase" | "studio" | null

  return (
    <OnboardingGate>
      <main className="container max-w-4xl py-12 sm:py-20 min-h-screen">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">

          {/* ── Hero header ── */}
          <motion.header variants={blurIn} className="mb-8 text-center">
            {/* Intent-aware banner */}
            {intent === "purchase" && (
              <motion.div
                variants={fadeUp}
                className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.3)", color: "#EC4899" }}
              >
                <Lock className="h-3.5 w-3.5" />
                You’re purchasing the Complete Analysis — upload your selfie to continue
              </motion.div>
            )}
            {intent === "studio" && (
              <motion.div
                variants={fadeUp}
                className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#8B5CF6" }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Starting Studio Pro — upload your selfie to begin
              </motion.div>
            )}
            {/* Step badge */}
            <motion.span
              variants={springPop}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.25em] font-semibold mb-5 chrome-border"
              style={{ background: "rgba(201,149,107,0.08)", color: "#BE185D" }}
            >
              <Sparkles className="h-3 w-3" />
              Start your beauty analysis
            </motion.span>

            <h1 className="text-4xl sm:text-5xl text-ink mb-4">
              Upload your{" "}
              <span className="gradient-text font-bold">selfie</span>
            </h1>
            <p className="mx-auto max-w-md text-base text-ink-stone leading-relaxed">
              Upload your selfie for a free face shape overview — then unlock your complete skin
              routine, hairstyle guide, virtual try-ons, and more.
            </p>
          </motion.header>

          {/* ── Product choice cards ── */}
          <motion.div variants={fadeUp} className="mx-auto mb-8 max-w-2xl">
            <p className="text-center text-[11px] uppercase tracking-widest font-semibold mb-4" style={{ color: "#9C7D5B" }}>
              Choose your path
            </p>
            <div className="grid sm:grid-cols-2 gap-4">

              {/* Card A — Blueprint Report */}
              <button
                onClick={() => router.replace("?intent=purchase", { scroll: false })}
                className="group text-left rounded-2xl p-5 transition-all focus:outline-none"
                style={{
                  background: intent === "purchase" ? "rgba(236,72,153,0.08)" : "rgba(255,255,255,0.03)",
                  border: intent === "purchase" ? "2px solid rgba(236,72,153,0.45)" : "2px solid rgba(255,255,255,0.07)",
                  boxShadow: intent === "purchase" ? "0 0 0 4px rgba(236,72,153,0.08)" : undefined,
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-3" style={{ background: "rgba(236,72,153,0.12)" }}>
                  <FileText className="h-5 w-5" style={{ color: "#EC4899" }} />
                </div>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-ink text-base">Master Blueprint Report</h3>
                  {intent === "purchase" && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#EC4899" }} />
                  )}
                </div>
                <p className="text-xs text-ink-stone leading-relaxed mb-3">
                  One-time deep diagnostic. Face shape, skin routine, colour season, hairstyle guide &amp; spectacles — downloadable PDF.
                </p>
                <ul className="space-y-1.5 mb-4">
                  {["Skin routine (AM + PM)", "Color season palette", "Hairstyle guide", "Spectacles recommendations", "PDF download + style chat"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[11px]" style={{ color: "#9C7D5B" }}>
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#EC4899" }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(236,72,153,0.12)" }}>
                  <span className="text-sm font-bold" style={{ color: "#EC4899" }}>One-time · ₹299</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" style={{ color: "#EC4899" }} />
                </div>
              </button>

              {/* Card B — AI Studio Pro */}
              <button
                onClick={() => router.replace("?intent=studio", { scroll: false })}
                className="group text-left rounded-2xl p-5 transition-all focus:outline-none relative"
                style={{
                  background: intent === "studio" ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.03)",
                  border: intent === "studio" ? "2px solid rgba(139,92,246,0.5)" : "2px solid rgba(255,255,255,0.07)",
                  boxShadow: intent === "studio" ? "0 0 0 4px rgba(139,92,246,0.08)" : undefined,
                }}
              >
                {/* Badge */}
                <div className="absolute -top-3 right-4">
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: "linear-gradient(135deg,#8B5CF6,#6D28D9)" }}>
                    <Sparkles className="h-2.5 w-2.5" /> Best Value
                  </span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-3" style={{ background: "rgba(139,92,246,0.12)" }}>
                  <Zap className="h-5 w-5" style={{ color: "#8B5CF6" }} />
                </div>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-ink text-base">Full Interactive AI Studio</h3>
                  {intent === "studio" && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#8B5CF6" }} />
                  )}
                </div>
                <p className="text-xs text-ink-stone leading-relaxed mb-3">
                  Live virtual try-ons, hair &amp; makeup sandbox, wardrobe generation. 150 AI generations per month.
                </p>
                <ul className="space-y-1.5 mb-4">
                  {["Everything in Blueprint Report", "AI hair & makeup try-ons", "Wardrobe & clothing swatches", "150 AI generations / month", "Cancel anytime"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[11px]" style={{ color: "#9C7D5B" }}>
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#8B5CF6" }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
                  <span className="text-sm font-bold" style={{ color: "#8B5CF6" }}>Monthly · ₹999/mo</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" style={{ color: "#8B5CF6" }} />
                </div>
              </button>

            </div>
          </motion.div>

          {/* ── Upload zone with spinning ring ── */}
          <motion.div variants={fadeUp} className="upload-ring rounded-3xl">
            <ImageUploader onUploaded={(reportId) => router.push(`/report/${reportId}`)} />
          </motion.div>

          {/* ── Trust badges ── */}
          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-ink-stone">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-sage" /> Your photo is private, never sold</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-sage" /> Results in ~60 seconds</span>
            <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-sage" /> Digital product with instant delivery</span>
          </motion.div>

          {/* ── Tips ── */}
          <motion.div variants={cascadeContainer} className="mx-auto mt-14 max-w-md">
            <motion.h3
              variants={fadeUp}
              className="text-center text-xs font-semibold text-ink mb-5 uppercase tracking-[0.2em] section-label justify-center"
            >
              Tips for best results
            </motion.h3>
            <motion.ul className="space-y-3">
              {TIPS.map((tip, index) => (
                <motion.li
                  key={index}
                  variants={fadeUp}
                  className="card-beam flex items-start gap-3 text-sm text-ink-stone !p-4"
                >
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 mt-0.5 animate-glow-pulse"
                    style={{ color: "#EC4899" }}
                  />
                  <span>{tip}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          {/* ── Privacy card ── */}
          <motion.div
            variants={fadeUp}
            className="mx-auto mt-8 max-w-md aurora-card text-center"
          >
            <div className="relative z-10">
              <motion.div variants={springPop} className="inline-flex mb-3">
                <ShieldCheck className="h-7 w-7" style={{ color: "#7B6E9E" }} />
              </motion.div>
              <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "#7B6E9E" }}>
                Your Privacy Matters
              </p>
              <p className="text-sm text-ink-stone leading-relaxed">
                Your photo is encrypted and stored securely. Only you can access your report. We never
                share your data with third parties.
              </p>
            </div>
          </motion.div>

        </motion.div>
      </main>
    </OnboardingGate>
  );
}
