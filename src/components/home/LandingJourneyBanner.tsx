"use client";

import { motion } from "framer-motion";
import { useJourneySnapshot } from "@/hooks/use-journey-snapshot";
import { getLandingJourneyHint } from "@/lib/report/journey-hints";
import { NextStepHint } from "@/components/ui/NextStepHint";
import { fadeUp } from "@/lib/animations";

export function LandingJourneyBanner() {
  const snapshot = useJourneySnapshot();
  const hint = !snapshot.loading ? getLandingJourneyHint(snapshot) : null;

  if (!hint) return null;

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="mb-6 px-2 sm:px-4"
    >
      <NextStepHint hint={hint} />
    </motion.div>
  );
}
