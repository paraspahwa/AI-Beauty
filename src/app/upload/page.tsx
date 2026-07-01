"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");

  return (
    <OnboardingGate>
      <main className="page-bleed-x min-h-app-viewport flex flex-col py-8 sm:py-12">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center">

          <motion.header variants={blurIn} className="mb-8 text-center">
            {intent === "purchase" && (
              <motion.div
                variants={fadeUp}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-terracotta/30 bg-terracotta/10 px-4 py-2 text-sm font-semibold text-terracotta"
              >
                <Lock className="h-3.5 w-3.5" />
                You&apos;re purchasing the Complete Analysis — upload your selfie to continue
              </motion.div>
            )}
            <motion.span variants={springPop} className="foil-label mb-5 inline-flex">
              <Sparkles className="h-3 w-3" />
              Start your beauty analysis
            </motion.span>

            <h1 className="font-display text-4xl text-ink mb-4 sm:text-5xl">
              Upload your{" "}
              <span className="gradient-text italic">selfie</span>
            </h1>
            <p className="mx-auto max-w-md text-base text-ink-stone leading-relaxed">
              Upload your selfie for a free face-shape preview — then unlock six analysis infographics
              and a PDF. Optional Style Guide add-on after unlock.
            </p>
          </motion.header>

          <motion.div variants={fadeUp} className="upload-ring rounded-3xl">
            <ImageUploader
              onUploaded={(reportId) => {
                window.location.assign(`/report/${reportId}`);
              }}
            />
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-ink-stone">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-sage" /> Your photo is private, never sold</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-sage" /> Results in ~60 seconds</span>
            <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-sage" /> Digital product with instant delivery</span>
          </motion.div>

          <motion.div variants={cascadeContainer} className="mx-auto mt-14 max-w-md">
            <motion.h3 variants={fadeUp} className="foil-label mb-5 justify-center">
              Tips for best results
            </motion.h3>
            <motion.ul className="space-y-3">
              {TIPS.map((tip, index) => (
                <motion.li
                  key={index}
                  variants={fadeUp}
                  className="dossier-card flex items-start gap-3 !p-4 text-sm text-ink-stone"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
                  <span>{tip}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div variants={fadeUp} className="dossier-card mx-auto mt-8 max-w-md text-center">
            <ShieldCheck className="mx-auto mb-3 h-7 w-7 text-sage" />
            <p className="foil-label mb-2 justify-center border-none">Your Privacy Matters</p>
            <p className="text-sm text-ink-stone leading-relaxed">
              Your photo is encrypted and stored securely. Only you can access your report. We never
              share your data with third parties.
            </p>
          </motion.div>

        </motion.div>
      </main>
    </OnboardingGate>
  );
}
