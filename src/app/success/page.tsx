"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, ArrowRight, FileText } from "lucide-react";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/animations";
import { NextStepHint } from "@/components/ui/NextStepHint";
import type { JourneyHint } from "@/lib/report/journey-hints";

const UNLOCK_NEXT_HINT: JourneyHint = {
  id: "success-next",
  step: "Step 1 of 3",
  title: "Next: generate your chapter boards",
  body: "Your full face features board starts automatically. Tap Generate on Skin, Colour, Hairstyle, and the rest — each saves to your Vault.",
  tone: "action",
};

const PERKS = [
  "Full color season report with custom palette",
  "Skin analysis & personalized care routine",
  "Spectacles guide with frame recommendations",
  "Hairstyle & hair colour guides with previews",
  "Personal style guide for wardrobe direction",
  "Downloadable PDF to keep forever",
];

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  const reportId = searchParams.get("reportId");
  const reportHref = reportId ? `/report/${reportId}` : "/dashboard";

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown === 0) router.push(reportHref);
  }, [countdown, router, reportHref]);

  return (
    <div className="min-h-app-viewport flex items-center justify-center bg-[var(--color-background)] p-6">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative w-full max-w-lg text-center lg:max-w-xl"
      >
        <motion.div variants={scaleIn} className="mx-auto mb-8">
          <div className="relative inline-block">
            <motion.div
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-espresso cta-glow"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <CheckCircle2 className="h-12 w-12 text-[var(--btn-fg)]" />
            </motion.div>
            <motion.div
              className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-terracotta shadow-md"
              animate={{ rotate: [0, 20, -20, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="h-4 w-4 text-[var(--btn-fg)]" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-8 space-y-3">
          <span className="foil-label">Unlocked</span>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">You&apos;re all set!</h1>
          <p className="text-ink-stone leading-relaxed">
            Your full Renovaara report is now unlocked. Here&apos;s everything you get:
          </p>
        </motion.div>

        <motion.ul variants={staggerContainer} className="mb-8 space-y-3 text-left">
          {PERKS.map((perk, i) => (
            <motion.li
              key={i}
              variants={fadeUp}
              className="dossier-card flex items-start gap-3 !px-5 !py-3.5"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
              <span className="text-sm text-ink-stone">{perk}</span>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div variants={fadeUp} className="mb-6 text-left">
          <NextStepHint hint={UNLOCK_NEXT_HINT} />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Button asChild variant="accent" size="lg" className="group w-full cta-shimmer">
            <Link href={reportHref}>
              <FileText className="h-4 w-4" />
              View my full report
              {countdown > 0 && <span className="ml-1 text-xs opacity-60">({countdown}s)</span>}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
