"use client";

import { motion } from "framer-motion";
import { Camera, Sparkles, Palette, FileText, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/animations";

const ANALYSIS_STEPS = [
  {
    icon: Camera,
    label: "Detecting face",
    description: "Finding your facial features",
    duration: 3000,
  },
  {
    icon: Sparkles,
    label: "Analyzing features",
    description: "Mapping your unique characteristics",
    duration: 6000,
  },
  {
    icon: Palette,
    label: "Matching colors",
    description: "Finding your perfect palette",
    duration: 10000,
  },
  {
    icon: FileText,
    label: "Generating report",
    description: "Creating your personalized guide",
    duration: 15000,
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
}

export function AnalysisLoading({ currentStep = 0, progress = 0 }: AnalysisLoadingProps) {
  const currentFact = FUN_FACTS[currentStep % FUN_FACTS.length];
  const elapsedTime = Math.floor((progress / 100) * 20);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cream/95 backdrop-blur-md"
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
              About {Math.max(20 - elapsedTime, 1)} seconds remaining
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
                      ? "bg-white shadow-card scale-105"
                      : isComplete
                      ? "bg-sage/10"
                      : "bg-cream-100"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${
                      isComplete
                        ? "bg-sage text-white"
                        : isActive
                        ? "bg-terracotta text-white animate-pulse-slow"
                        : "bg-cream-200 text-ink-mist"
                    }`}
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
            className="rounded-2xl bg-white/60 backdrop-blur-sm border border-cream-200 p-6"
          >
            <p className="text-xs uppercase tracking-widest text-terracotta mb-2">
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
