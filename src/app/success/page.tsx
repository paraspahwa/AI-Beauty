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
  "Hairstyle guide with cut & color ideas",
  "Downloadable PDF to keep forever",
];

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(8);

  const reportId = searchParams.get("reportId");
  const reportHref = reportId ? `/report/${reportId}` : "/dashboard";

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown === 0) router.push(reportHref);
  }, [countdown, router, reportHref]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-gradient-to-br from-cream via-cream-100 to-sage/10">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative max-w-lg w-full text-center"
      >
        <motion.div variants={scaleIn} className="mx-auto mb-8">
          <div className="relative inline-block">
            <motion.div
              className="w-24 h-24 rounded-full bg-gradient-to-br from-terracotta to-camel flex items-center justify-center mx-auto shadow-premium"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <CheckCircle2 className="h-12 w-12 text-white" />
            </motion.div>
            <motion.div
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-sage flex items-center justify-center shadow-card"
              animate={{ rotate: [0, 20, -20, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-3 mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl text-ink">{"You're all set! ✨"}</h1>
          <p className="text-ink-stone leading-relaxed">
            {"Your full StyleAI report is now unlocked. Here's everything you get:"}
          </p>
        </motion.div>

        <motion.ul variants={staggerContainer} className="text-left space-y-3 mb-8">
          {PERKS.map((perk, i) => (
            <motion.li
              key={i}
              variants={fadeUp}
              className="flex items-start gap-3 bg-white/70 backdrop-blur-sm rounded-2xl px-5 py-3.5 border border-cream-200"
            >
              <CheckCircle2 className="h-5 w-5 text-sage shrink-0 mt-0.5" />
              <span className="text-sm text-ink-stone">{perk}</span>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div variants={fadeUp} className="space-y-4">
          <Button asChild variant="accent" size="lg" className="w-full group">
            <Link href={reportHref}>
              <FileText className="h-4 w-4" />
              View my full report
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          {countdown > 0 && (
            <p className="text-sm text-ink-mist">
              Redirecting in <span className="font-medium text-terracotta">{countdown}s</span>…
            </p>
          )}
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
