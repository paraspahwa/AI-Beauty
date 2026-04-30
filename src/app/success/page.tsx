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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6" style={{ background: "linear-gradient(145deg, #0A0A0F 0%, #12121A 50%, #1A1226 100%)" }}>
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
              style={{ background: "linear-gradient(135deg, #C9956B, #E8C990)", boxShadow: "0 0 40px rgba(201,149,107,0.4), 0 0 80px rgba(201,149,107,0.15)" }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <CheckCircle2 className="h-12 w-12 text-obsidian" />
            </motion.div>
            <motion.div
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(123,110,158,0.9)", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
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
              className="flex items-start gap-3 rounded-2xl px-5 py-3.5"
              style={{ background: "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#C9956B" }} />
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
              Redirecting in <span className="font-medium" style={{ color: "#C9956B" }}>{countdown}s</span>…
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
