"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "renovaara_onboarded_v1";

const STEPS = [
  {
    icon: Eye,
    title: "Your beauty report starts here",
    body: "Upload one clear, front-facing selfie in natural light. Analysis takes about 60 seconds — unlock six analysis infographics and a PDF when you're ready.",
    accent: "#B8734A",
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
          className="relative w-full max-w-sm rounded-3xl border border-terracotta/20 bg-[var(--color-surface)] p-8 text-center shadow-premium"
        >
          {/* Dismiss */}
          <button
            onClick={onDone}
            aria-label="Skip onboarding"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-blush text-ink-mist transition-opacity hover:opacity-80"
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

          <h2 className="mb-3 font-display text-2xl text-ink">
            {current.title}
          </h2>

          <p className="mb-8 text-sm leading-relaxed text-ink-stone">
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
                  background: i === step ? current.accent : "var(--color-border)",
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
