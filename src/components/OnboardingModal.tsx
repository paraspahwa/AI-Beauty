"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Zap, Sparkles, Shield, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "styleai_onboarded_v1";

const STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to StyleAI ✨",
    body: "Your personal AI stylist — ready to analyse your face shape, color season, skin type, and give you a complete style guide. Let's show you how it works.",
    accent: "#C9956B",
  },
  {
    icon: Eye,
    title: "Upload one selfie",
    body: "A clear, front-facing, well-lit photo is all it takes. Hair off your forehead gives the most accurate face-shape reading. No filters needed.",
    accent: "#A69CC4",
  },
  {
    icon: Zap,
    title: "AI analyses in ~30 seconds",
    body: "Our pipeline runs face-shape detection, 12-season color analysis, skin assessment, and generates spectacles + hairstyle recommendations — all in one go.",
    accent: "#7DBEAA",
  },
  {
    icon: Shield,
    title: "Your report is private",
    body: "Photos are encrypted at rest and only you can access your report. You choose if and when to share it. We never sell your data.",
    accent: "#C9956B",
  },
];

interface Props {
  /** Called when the user dismisses or finishes the onboarding flow */
  onDone: () => void;
}

export function OnboardingModal({ onDone }: Props) {
  const [step, setStep] = React.useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  function advance() {
    if (isLast) {
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-sm rounded-3xl p-8 text-center"
          style={{
            background: "linear-gradient(160deg, #0E0E18 0%, #16162A 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
        >
          {/* Dismiss */}
          <button
            onClick={onDone}
            aria-label="Skip onboarding"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full transition-opacity hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(240,232,216,0.4)" }}
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Icon */}
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: `rgba(${hexToRgb(current.accent)},0.15)` }}
          >
            <Icon className="h-8 w-8" style={{ color: current.accent }} />
          </div>

          <h2 className="mb-3 font-serif text-2xl" style={{ color: "#F0E8D8" }}>
            {current.title}
          </h2>
          <p className="mb-8 text-sm leading-relaxed" style={{ color: "rgba(240,232,216,0.65)" }}>
            {current.body}
          </p>

          {/* Step dots */}
          <div className="mb-6 flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === step ? "2rem" : "0.5rem",
                  background: i === step ? current.accent : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>

          <Button variant="accent" size="md" className="w-full" onClick={advance}>
            {isLast ? "Get started" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Render the modal only on first visit — persists in localStorage */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      // localStorage blocked (private browsing) — skip
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* noop */ }
    setShow(false);
  }

  return (
    <>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OnboardingModal onDone={dismiss} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Minimal hex → "r,g,b" helper for rgba() background */
function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r},${g},${b}`;
}
