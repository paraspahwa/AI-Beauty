"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const CHIP_BASE =
  "rounded-full border border-terracotta/25 bg-blush px-3.5 py-1.5 text-xs font-semibold text-ink-stone transition-all hover:border-terracotta/40";

const CHIP_ACTIVE =
  "rounded-full border border-terracotta bg-terracotta/15 px-3.5 py-1.5 text-xs font-semibold text-ink transition-all";

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
    <button type="button" className={active ? CHIP_ACTIVE : CHIP_BASE} onClick={onClick}>
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
      <p className="foil-label mb-1">
        {number} of {total}
      </p>
      <p className="mb-3 text-sm font-medium text-ink">{question}</p>
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
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
        >
          <motion.div
            key="sq-panel"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative w-full max-w-sm rounded-3xl border border-terracotta/20 bg-[var(--color-surface)] p-6 shadow-premium"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-terracotta" />
                <p className="foil-label">Personalize Your Analysis</p>
              </div>
              <button
                type="button"
                onClick={onSkip}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-blush text-ink-mist transition-opacity hover:opacity-80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={onSkip}
                className="text-xs text-ink-mist transition-opacity hover:opacity-70"
              >
                Skip
              </button>
              <Button variant="accent" size="sm" onClick={handleDone}>
                Continue
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <p className="mt-4 text-center text-[9px] leading-relaxed text-ink-mist">
              Optional — your answers help personalize your skincare routine.
              They are never stored or shared.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
