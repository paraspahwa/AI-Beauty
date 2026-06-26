"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, ArrowRight, FileText } from "lucide-react";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/animations";

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
    <div
      className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6"
      style={{ background: "linear-gradient(145deg, #fffafc 0%, #fffafc 50%, #fffafc 100%)" }}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative max-w-lg w-full text-center"
      >
        <motion.div variants={scaleIn} className="mx-auto mb-8">
          <div className="relative inline-block">
            <motion.div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
              style={{
                background: "#111827",
                boxShadow: "0 0 40px rgba(17,24,39,0.4), 0 0 80px rgba(17,24,39,0.15)",
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <CheckCircle2 className="h-12 w-12 text-obsidian" />
            </motion.div>
            <motion.div
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(17,24,39,0.9)", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
              animate={{ rotate: [0, 20, -20, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-3 mb-8">
          <h1 className="font-sans text-3xl sm:text-4xl text-ink">You&apos;re all set!</h1>
          <p className="text-ink-stone leading-relaxed">
            Your full Renovaara report is now unlocked. Here&apos;s everything you get:
          </p>
        </motion.div>

        <motion.ul variants={staggerContainer} className="text-left space-y-3 mb-8">
          {PERKS.map((perk, i) => (
            <motion.li
              key={i}
              variants={fadeUp}
              className="flex items-start gap-3 rounded-2xl px-5 py-3.5"
              style={{
                background: "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))",
                border: "1px solid rgba(17,24,39,0.14)",
              }}
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#111827" }} />
              <span className="text-sm text-ink-stone">{perk}</span>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div variants={fadeUp} className="space-y-4">
          <Button asChild variant="accent" size="lg" className="w-full group">
            <Link href={reportHref}>
              <FileText className="h-4 w-4" />
              View my full report
              {countdown > 0 && <span className="opacity-60 text-xs ml-1">({countdown}s)</span>}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
