"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Eye, Lock, Sparkles, Shield, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "renovaara_onboarded_v1";

const STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to Renovaara ✨",
    body: "Your personal AI stylist — upload one selfie and get an instant face shape overview, completely free.",
    accent: "#EC4899",
  },
  {
    icon: Lock,
    title: "What's free · what's paid",
    body: null, // rendered as a custom free/paid grid
    accent: "#A69CC4",
  },
  {
    icon: Eye,
    title: "One clear selfie is all it takes",
    body: "Front-facing, natural light, hair off your forehead. No filters needed. Results in ~30 seconds.",
    accent: "#7DBEAA",
  },
  {
    icon: Shield,
    title: "Your photo is private",
    body: "Photos are encrypted at rest. Only you can access your report. We never sell your data.",
    accent: "#EC4899",
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
            border: "1px solid rgba(131,24,67,0.18)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
        >
          {/* Dismiss */}
          <button
            onClick={onDone}
            aria-label="Skip onboarding"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full transition-opacity hover:opacity-80"
            style={{ background: "rgba(131,24,67,0.14)", color: "rgba(131,24,67,0.5)" }}
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

          {/* Step 1 — free/paid grid instead of body text */}
          {current.body === null ? (
            <div className="mb-8 grid grid-cols-2 gap-2 text-left">
              <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#6b7280" }}>Free</p>
                {["Face shape analysis", "Starter style summary"].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "#22c55e" }} />
                    <span className="text-[11px]" style={{ color: "rgba(240,232,216,0.65)" }}>{item}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-3" style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.18)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#EC4899" }}>Unlock — ₹299</p>
                {["Skin routine", "Spectacles guide", "Hairstyle guide", "AI try-ons", "PDF + chat"].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "#EC4899" }} />
                    <span className="text-[11px]" style={{ color: "rgba(240,232,216,0.65)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mb-8 text-sm leading-relaxed" style={{ color: "rgba(240,232,216,0.65)" }}>
              {current.body}
            </p>
          )}

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
