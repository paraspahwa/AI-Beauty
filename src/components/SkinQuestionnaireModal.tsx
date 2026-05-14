"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Sparkles } from "lucide-react";

export interface SkinContext {
  selfReportedFeeling?: string;
  primaryConcern?: string;
  ageRange?: string;
}

interface Props {
  open: boolean;
  onComplete: (ctx: SkinContext) => void;
  onSkip: () => void;
}

const FEELINGS = [
  { value: "shiny and oily", label: "Shiny & Oily" },
  { value: "tight and dry",  label: "Tight & Dry"  },
  { value: "normal",         label: "Normal"        },
  { value: "sensitive",      label: "Sensitive"     },
];

const CONCERNS = [
  { value: "acne",       label: "Acne"        },
  { value: "dark spots", label: "Dark Spots"  },
  { value: "dryness",    label: "Dryness"     },
  { value: "dullness",   label: "Dullness"    },
  { value: "redness",    label: "Redness"     },
  { value: "pores",      label: "Pores"       },
  { value: "wrinkles",   label: "Wrinkles"    },
  { value: "uneven tone",label: "Uneven Tone" },
];

const AGE_RANGES = [
  { value: "teens",   label: "Teens"  },
  { value: "20s",     label: "20s"    },
  { value: "30s",     label: "30s"    },
  { value: "40s",     label: "40s"    },
  { value: "50+",     label: "50+"    },
];

const CHIP_BASE: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid rgba(201,149,107,0.25)",
  background: "rgba(201,149,107,0.06)",
  color: "rgba(255,255,255,0.7)",
  transition: "all 0.15s",
  userSelect: "none",
};

const CHIP_ACTIVE: React.CSSProperties = {
  ...CHIP_BASE,
  background: "rgba(201,149,107,0.18)",
  border: "1px solid rgba(201,149,107,0.7)",
  color: "#E8C990",
};

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" style={active ? CHIP_ACTIVE : CHIP_BASE} onClick={onClick}>
      {label}
    </button>
  );
}

function Question({
  number,
  total,
  question,
  children,
}: {
  number: number;
  total: number;
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <p
        className="text-[10px] uppercase tracking-[0.2em] mb-1"
        style={{ color: "#C9956B" }}
      >
        {number} of {total}
      </p>
      <p className="text-sm font-medium mb-3" style={{ color: "rgba(255,255,255,0.85)" }}>
        {question}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function SkinQuestionnaireModal({ open, onComplete, onSkip }: Props) {
  const [feeling,  setFeeling]  = React.useState<string | undefined>();
  const [concern,  setConcern]  = React.useState<string | undefined>();
  const [ageRange, setAgeRange] = React.useState<string | undefined>();

  function handleDone() {
    onComplete({
      selfReportedFeeling: feeling,
      primaryConcern:      concern,
      ageRange,
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sq-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(5,5,10,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
        >
          <motion.div
            key="sq-panel"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative w-full max-w-sm rounded-3xl p-6"
            style={{
              background: "linear-gradient(145deg,#13131e,#1b1b2a)",
              border: "1px solid rgba(201,149,107,0.2)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: "#C9956B" }} />
                <p
                  className="text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color: "#C9956B" }}
                >
                  Personalize Your Analysis
                </p>
              </div>
              <button
                type="button"
                onClick={onSkip}
                style={{ color: "rgba(255,255,255,0.35)" }}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Questions */}
            <Question number={1} total={3} question="How does your skin feel by midday?">
              {FEELINGS.map((f) => (
                <Chip
                  key={f.value}
                  label={f.label}
                  active={feeling === f.value}
                  onClick={() => setFeeling((prev) => (prev === f.value ? undefined : f.value))}
                />
              ))}
            </Question>

            <Question number={2} total={3} question="Your main skin concern?">
              {CONCERNS.map((c) => (
                <Chip
                  key={c.value}
                  label={c.label}
                  active={concern === c.value}
                  onClick={() => setConcern((prev) => (prev === c.value ? undefined : c.value))}
                />
              ))}
            </Question>

            <Question number={3} total={3} question="Your age range?">
              {AGE_RANGES.map((a) => (
                <Chip
                  key={a.value}
                  label={a.label}
                  active={ageRange === a.value}
                  onClick={() => setAgeRange((prev) => (prev === a.value ? undefined : a.value))}
                />
              ))}
            </Question>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={onSkip}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg,#C9956B,#E8C990)",
                  color: "#0A0A0F",
                }}
              >
                Continue
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Fine print */}
            <p
              className="mt-4 text-center text-[9px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Optional — your answers help personalize your skincare routine.
              They are never stored or shared.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
