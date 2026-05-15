"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/ImageUploader";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { blurIn, cascadeContainer, fadeUp, springPop, staggerContainer } from "@/lib/animations";
import { OnboardingGate } from "@/components/OnboardingModal";

const TIPS = [
  "Look straight into the camera, hair off your forehead",
  "Use natural light — avoid heavy filters for accurate results",
  "One face per photo · you'll upload garment photos inside the try-on tab",
];

export default function UploadPage() {
  const router = useRouter();

  return (
    <OnboardingGate>
      <main className="container max-w-4xl py-12 sm:py-20 min-h-screen">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">

          {/* ── Hero header ── */}
          <motion.header variants={blurIn} className="mb-12 text-center">
            {/* Step badge */}
            <motion.span
              variants={springPop}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.25em] font-semibold mb-5 chrome-border"
              style={{ background: "rgba(201,149,107,0.08)", color: "#F9A8D4" }}
            >
              <Sparkles className="h-3 w-3" />
              Step 1 of 2
            </motion.span>

            <h1 className="text-4xl sm:text-5xl text-ink mb-4">
              Upload your{" "}
              <span className="gradient-text font-bold">selfie</span>
            </h1>
            <p className="mx-auto max-w-md text-base text-ink-stone leading-relaxed">
              One selfie unlocks your full AI beauty report — face shape, virtual clothing try-on,
              makeup try-on, spectacles, hairstyle guide, skin routine, and your Do vs Avoid Style Guide.
            </p>
          </motion.header>

          {/* ── Upload zone with spinning ring ── */}
          <motion.div variants={fadeUp} className="upload-ring rounded-3xl">
            <ImageUploader onUploaded={(reportId) => router.push(`/report/${reportId}`)} />
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
