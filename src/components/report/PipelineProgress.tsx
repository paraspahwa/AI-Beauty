"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Eye, Palette, Scissors, Droplets, Glasses, CheckCircle2, Loader2 } from "lucide-react";

interface Stage {
  id: string;
  label: string;
  icon: typeof Sparkles;
  status: "pending" | "active" | "done";
}

interface Props {
  /** SSE event stream text to parse stage updates */
  sseText?: string;
  /** Manual stage override */
  currentStageIndex?: number;
}

const STAGES: Stage[] = [
  { id: "rekognition", label: "Face detection", icon: Eye, status: "pending" },
  { id: "faceShape", label: "Face shape analysis", icon: Sparkles, status: "pending" },
  { id: "colorSeason", label: "Colour season analysis", icon: Palette, status: "pending" },
  { id: "skinAnalysis", label: "Skin analysis", icon: Droplets, status: "pending" },
  { id: "hairstyle", label: "Hairstyle matching", icon: Scissors, status: "pending" },
  { id: "glasses", label: "Spectacles guide", icon: Glasses, status: "pending" },
  { id: "summary", label: "Building your report", icon: CheckCircle2, status: "pending" },
];

export function PipelineProgress({ sseText, currentStageIndex }: Props) {
  const [activeIndex, setActiveIndex] = React.useState(currentStageIndex ?? -1);

  // Parse SSE text to find which stage is active
  React.useEffect(() => {
    if (!sseText) return;
    const lower = sseText.toLowerCase();
    const findStage = (keywords: string[], index: number): boolean =>
      keywords.some((k) => lower.includes(k));
    if (findStage(["face landmark", "rekognition", "detect"], 0)) setActiveIndex(0);
    else if (findStage(["face shape", "shape"], 1)) setActiveIndex(1);
    else if (findStage(["color season", "colour season", "color analysis"], 2)) setActiveIndex(2);
    else if (findStage(["skin", "skin analysis"], 3)) setActiveIndex(3);
    else if (findStage(["hairstyle", "hair"], 4)) setActiveIndex(4);
    else if (findStage(["spectacles", "glasses"], 5)) setActiveIndex(5);
    else if (findStage(["summary", "building", "report"], 6)) setActiveIndex(6);
  }, [sseText]);

  React.useEffect(() => {
    if (currentStageIndex !== undefined) setActiveIndex(currentStageIndex);
  }, [currentStageIndex]);

  const stages = STAGES.map((stage, i) => ({
    ...stage,
    status: i < activeIndex ? "done" as const : i === activeIndex ? "active" as const : "pending" as const,
  }));

  return (
    <div className="w-full">
      <div className="space-y-2">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all ${
              stage.status === "active"
                ? "bg-terracotta/10 border border-terracotta/20"
                : stage.status === "done"
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border border-transparent"
                  : "opacity-40 border border-transparent"
            }`}
          >
            {stage.status === "done" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : stage.status === "active" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-terracotta" />
            ) : (
              <stage.icon className="h-4 w-4 shrink-0 text-ink-mist" />
            )}
            <span
              className={`text-sm ${
                stage.status === "active"
                  ? "font-semibold text-ink"
                  : stage.status === "done"
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-ink-mist"
              }`}
            >
              {stage.status === "done" && "✓ "}
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
