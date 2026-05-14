"use client";

import { motion } from "framer-motion";
import { Camera, Sparkles, Palette, Glasses, FileText, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/animations";

/**
 * Steps mirror the actual server pipeline:
 * 1. AWS Rekognition — face landmark detection
 * 2. GPT — face shape + facial features mapping
 * 3. GPT — 12-season color analysis + undertone
 * 4. GPT — skin routine, glasses fit, hairstyle match
 * 5. GPT — summary compilation + report persistence
 */
const ANALYSIS_STEPS = [
  {
    icon: Camera,
    label: "Scanning your photo",
    description: "Detecting facial landmarks and proportions",
  },
  {
    icon: Sparkles,
    label: "Reading your features",
    description: "Classifying face shape, eyes, brows & more",
  },
  {
    icon: Palette,
    label: "Finding your colors",
    description: "Mapping your 12-season palette and undertone",
  },
  {
    icon: Glasses,
    label: "Building your style profile",
    description: "Personalising skin routine, glasses & hairstyles",
  },
  {
    icon: FileText,
    label: "Compiling your report",
    description: "Writing your personalised beauty guide",
  },
];

const FUN_FACTS = [
  "Color analysis originated from research on seasonal color theory in the 1980s",
  "Your undertone (warm, cool, or neutral) is determined by melanin and hemoglobin in your skin",
  "Face shapes are categorized into 8 main types, each with unique styling recommendations",
  "The golden ratio (1.618) is used to assess facial proportions and harmony",
  "Complementary colors can enhance or diminish your natural coloring based on your season",
];

interface AnalysisLoadingProps {
  currentStep?: number;
  progress?: number;
  remainingSeconds?: number;
}

function formatRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function AnalysisLoading({ currentStep = 0, progress = 0, remainingSeconds = 0 }: AnalysisLoadingProps) {
  const currentFact = FUN_FACTS[currentStep % FUN_FACTS.length];
  const countdownText =
    remainingSeconds > 0
      ? `${formatRemaining(remainingSeconds)} remaining`
      : "Finalizing your report...";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
      style={{ background: "rgba(10,10,15,0.97)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="container max-w-2xl px-6">
        <motion.div
          className="text-center"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={fadeUp} className="mb-12">
            <h2 className="text-3xl sm:text-4xl text-ink mb-3">
              Analyzing your beauty profile
            </h2>
            <p className="text-ink-stone">
              {countdownText}
            </p>
          </motion.div>

          {/* Progress steps */}
          <motion.div
            variants={staggerContainer}
            className="mb-10 space-y-4"
          >
            {ANALYSIS_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isComplete = currentStep > index;
              const isActive = currentStep === index;

              return (
                <motion.div
                  key={step.label}
                  variants={fadeUp}
                  className={`flex items-center gap-4 rounded-2xl p-4 transition-all ${
                    isActive
                      ? "scale-105"
                      : ""
                  }`}
                  style={{
                    background: isActive
                      ? "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))"
                      : isComplete
                      ? "rgba(123,110,158,0.08)"
                      : "rgba(255,247,251,0.85)",
                    border: isActive
                      ? "1px solid rgba(236,72,153,0.3)"
                      : "1px solid rgba(131,24,67,0.10)",
                    boxShadow: isActive ? "0 10px 24px rgba(131,24,67,0.16)" : "none",
                  }}
                >
                  {/* Icon */}
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${
                      isActive ? "animate-pulse-slow" : ""
                    }`}
                    style={{
                      background: isComplete
                        ? "rgba(123,110,158,0.8)"
                        : isActive
                        ? "linear-gradient(135deg,#EC4899,#8B5CF6)"
                        : "rgba(131,24,67,0.12)",
                      color: isComplete || isActive ? "#FFFFFF" : "rgba(131,24,67,0.45)",
                      boxShadow: isActive ? "0 0 20px rgba(236,72,153,0.3)" : "none",
                    }}
                  >
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      >
                        <Check className="h-6 w-6" />
                      </motion.div>
                    ) : (
                      <Icon className={`h-6 w-6 ${isActive ? "animate-pulse" : ""}`} />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-ink">{step.label}</p>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-ink-stone"
                      >
                        {step.description}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Progress bar */}
          <motion.div variants={fadeUp} className="mb-8">
            <Progress value={progress} className="h-2" />
          </motion.div>

          {/* Fun fact */}
          <motion.div
            variants={scaleIn}
            className="rounded-2xl p-6 backdrop-blur-sm"
            style={{ background: "rgba(255,247,251,0.9)", border: "1px solid rgba(131,24,67,0.14)" }}
          >
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "#EC4899" }}>
              Did you know?
            </p>
            <motion.p
              key={currentFact}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-sm text-ink-stone leading-relaxed"
            >
              {currentFact}
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
