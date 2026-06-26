"use client";

import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { CheckCircle2, Clock, Lock, ShieldCheck, Sparkles, Star } from "lucide-react";
import { blurIn, cascadeContainer, fadeUp, springPop, staggerContainer } from "@/lib/animations";
import { OnboardingGate } from "@/components/OnboardingModal";

const TIPS = [
  "Look straight into the camera, hair off your forehead",
  "Use natural light — avoid heavy filters for accurate results",
  "One face per photo for the most accurate analysis",
];

export default function UploadPage() {
  return (
    <Suspense>
      <UploadPageContent />
    </Suspense>
  );
}

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");

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
                style={{ background: "rgba(17,24,39,0.12)", border: "1px solid rgba(17,24,39,0.3)", color: "#111827" }}
              >
                <Lock className="h-3.5 w-3.5" />
                You’re purchasing the Complete Analysis — upload your selfie to continue
              </motion.div>
            )}
            {/* Step badge */}
            <motion.span
              variants={springPop}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.25em] font-semibold mb-5 chrome-border"
              style={{ background: "rgba(17,24,39,0.08)", color: "#111827" }}
            >
              <Sparkles className="h-3 w-3" />
              Start your beauty analysis
            </motion.span>

            <h1 className="text-4xl sm:text-5xl text-ink mb-4">
              Upload your{" "}
              <span className="gradient-text font-bold">selfie</span>
            </h1>
            <p className="mx-auto max-w-md text-base text-ink-stone leading-relaxed">
              Upload your selfie for a free face-shape preview — then unlock your complete skin
              routine, colour guide, hairstyle previews, spectacles guide, and style direction.
            </p>
          </motion.header>

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
                    style={{ color: "#111827" }}
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
