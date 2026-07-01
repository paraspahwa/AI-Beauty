"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, ImageIcon, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { SkinQuestionnaireModal, type SkinContext } from "@/components/SkinQuestionnaireModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface ImageUploaderProps {
  onUploaded: (reportId: string) => void;
  className?: string;
}

const ESTIMATED_ANALYSIS_MS = 45000;

const STAGE_PROGRESS: Record<string, number> = {
  rekognition: 8,
  face_shape: 22,
  color_analysis: 40,
  skin_vision: 56,
  features: 70,
  skin_routine: 74,
  glasses: 84,
  hairstyle: 88,
  summary: 97,
};

interface AnalyzeEtaResponse {
  totalAvgMs?: number;
  p50Ms?: number;
  p75Ms?: number;
  p90Ms?: number;
  stageAvgMs?: Record<string, number>;
}

type AnalyzeStreamEvent =
  | { type: "accepted"; reportId: string }
  | { type: "cached"; reportId: string }
  | { type: "stage_started"; stage: string; variantId?: string }
  | { type: "stage_completed"; stage: string; durationMs?: number; degraded?: boolean; variantId?: string }
  | { type: "completed"; reportId: string; visualsPending: boolean }
  | { type: "failed"; message: string };

/**
 * Drag-and-drop selfie uploader with enhanced animations and premium design.
 * Posts the file as multipart/form-data to /api/analyze and reports progress.
 */
export function ImageUploader({ onUploaded, className }: ImageUploaderProps) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [remainingSeconds, setRemainingSeconds] = React.useState(0);
  const [currentStage, setCurrentStage] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [skinContext, setSkinContext] = React.useState<SkinContext | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = React.useState(false);
  const countdownTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const analysisStartedAtRef = React.useRef<number>(0);
  const etaMsRef = React.useRef<number>(ESTIMATED_ANALYSIS_MS);
  const stageAvgMsRef = React.useRef<Record<string, number>>({});

  const currentStep = React.useMemo(() => {
    if (currentStage === "rekognition" || currentStage === "face_shape") return 0;
    if (currentStage === "color_analysis") return 1;
    if (currentStage === "skin_vision") return 2;
    if (currentStage === "features" || currentStage === "skin_routine" || currentStage === "glasses" || currentStage === "hairstyle") return 3;
    if (currentStage === "summary") return 4;
    return Math.min(4, Math.floor(progress / 20));
  }, [currentStage, progress]);

  const onDrop = React.useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    // Skin questionnaire deferred until user unlocks full analysis (studio-first funnel).
  }, []);

  const onDropRejected = React.useCallback((rejections: FileRejection[]) => {
    if (rejections.length > 1) {
      setError("Please upload one photo at a time.");
      return;
    }
    const firstCode = rejections[0]?.errors[0]?.code;
    if (firstCode === "too-many-files") {
      setError("Please upload one photo at a time.");
    } else if (firstCode === "file-too-large") {
      setError("File is too large. Maximum size is 8 MB.");
    } else if (firstCode === "file-invalid-type") {
      setError("Unsupported file type. Please upload a JPG, PNG or WEBP image.");
    } else {
      setError(rejections[0]?.errors[0]?.message ?? "File rejected. Please try another photo.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    multiple: false,
    maxSize: 8 * 1024 * 1024,
  });

  React.useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  React.useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  async function handleSubmit() {
    if (!file) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.push(`/auth?redirect=${encodeURIComponent("/upload")}`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent("/upload")}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setCurrentStage(null);

    let initialEtaMs = ESTIMATED_ANALYSIS_MS;
    let stageAvgMs: Record<string, number> = {};
    try {
      const etaRes = await fetch("/api/analyze", { method: "GET" });
      if (etaRes.ok) {
        const etaJson = (await etaRes.json()) as AnalyzeEtaResponse;
        // Use p75 (conservative) so the countdown rarely runs out early.
        const chosen = etaJson.p75Ms ?? etaJson.totalAvgMs;
        if (typeof chosen === "number" && chosen > 0) {
          initialEtaMs = chosen;
        }
        if (etaJson.stageAvgMs && typeof etaJson.stageAvgMs === "object") {
          stageAvgMs = etaJson.stageAvgMs;
        }
      }
    } catch {
      // Fallback silently to default ETA.
    }

    analysisStartedAtRef.current = Date.now();
    etaMsRef.current = initialEtaMs;
    stageAvgMsRef.current = stageAvgMs;
    setProgress(0);
    setRemainingSeconds(Math.ceil(initialEtaMs / 1000));

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    countdownTimerRef.current = setInterval(() => {
      const elapsedMs = Date.now() - analysisStartedAtRef.current;
      const nextRemainingMs = Math.max(etaMsRef.current - elapsedMs, 0);
      const nextRemainingSeconds = Math.ceil(nextRemainingMs / 1000);
      setRemainingSeconds(nextRemainingSeconds);

      // Keep progress moving smoothly while waiting for server response.
      const nextProgress = Math.min((elapsedMs / Math.max(etaMsRef.current, 1)) * 100, 99);
      setProgress(nextProgress);
    }, 250);

    try {
      const form = new FormData();
      form.append("image", file);
      if (skinContext && Object.keys(skinContext).length > 0) {
        form.append("skinContext", JSON.stringify(skinContext));
      }

      const res = await fetch("/api/analyze?stream=1", { method: "POST", body: form });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.push(`/auth?redirect=${encodeURIComponent("/upload")}`);
          return;
        }
        throw new Error(body?.error ?? `Upload failed (${res.status})`);
      }

      const decoder = new TextDecoder();
      const reader = res.body.getReader();
      let bufferText = "";
      let finalReportId: string | null = null;

      const applyRemainingFromEta = () => {
        const elapsedMs = Date.now() - analysisStartedAtRef.current;
        const nextRemainingMs = Math.max(etaMsRef.current - elapsedMs, 0);
        setRemainingSeconds(Math.ceil(nextRemainingMs / 1000));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bufferText += decoder.decode(value, { stream: true });
        const lines = bufferText.split("\n");
        bufferText = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let event: AnalyzeStreamEvent;
          try {
            event = JSON.parse(trimmed) as AnalyzeStreamEvent;
          } catch {
            continue;
          }

          if (event.type === "failed") {
            if (event.message === "Unauthorized") {
              router.push(`/auth?redirect=${encodeURIComponent("/upload")}`);
              return;
            }
            throw new Error(event.message || "Analysis failed. Please try again.");
          }

          if (event.type === "stage_started") {
            setCurrentStage(event.stage);
            const stageProgress = STAGE_PROGRESS[event.stage];
            if (typeof stageProgress === "number") {
              setProgress((prev) => Math.max(prev, stageProgress));
            }
            continue;
          }

          if (event.type === "stage_completed") {
            const avgMs = stageAvgMsRef.current[event.stage];
            if (typeof avgMs === "number" && typeof event.durationMs === "number") {
              etaMsRef.current = Math.max(etaMsRef.current + (event.durationMs - avgMs), 1000);
            }
            const stageProgress = STAGE_PROGRESS[event.stage];
            if (typeof stageProgress === "number") {
              setProgress((prev) => Math.max(prev, stageProgress));
            }
            applyRemainingFromEta();
            continue;
          }

          if (event.type === "cached") {
            finalReportId = event.reportId;
            setProgress(100);
            setRemainingSeconds(0);
            break;
          }

          if (event.type === "completed") {
            finalReportId = event.reportId;
            setProgress(100);
            setRemainingSeconds(0);
            break;
          }
        }

        if (finalReportId) break;
      }

      if (!finalReportId) {
        throw new Error("Analysis finished but no report ID was returned.");
      }

      onUploaded(finalReportId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      className={cn("w-full max-w-xl mx-auto", className)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Full-screen analysis overlay when submitting */}
      <AnimatePresence>
        {submitting && (
          <AnalysisLoading currentStep={currentStep} progress={progress} remainingSeconds={remainingSeconds} />
        )}
      </AnimatePresence>

      {/* Skin personalization questionnaire — shown once after photo selection */}
      <SkinQuestionnaireModal
        open={showQuestionnaire}
        onComplete={(ctx) => { setSkinContext(ctx); setShowQuestionnaire(false); }}
        onSkip={() => { setSkinContext({}); setShowQuestionnaire(false); }}
      />
      <motion.div variants={fadeUp}>
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-4 rounded-4xl border-2 transition-all",
            file ? "px-8 py-8 text-center cursor-default" : "px-8 py-16 text-center cursor-pointer",
            "hover:scale-[1.01]",
            isDragActive
              ? "border-solid scale-[1.02]"
              : file
              ? "border-solid"
              : "border-dashed"
          )}
          style={{
            background: isDragActive
              ? "rgba(184, 115, 74, 0.06)"
              : "linear-gradient(145deg, var(--color-surface), var(--blush))",
            borderColor: isDragActive
              ? "var(--terracotta)"
              : file
              ? "var(--terracotta)"
              : "var(--color-border)",
            boxShadow: isDragActive
              ? "0 0 40px rgba(184, 115, 74, 0.15), inset 0 1px 0 rgba(255,255,255,0.5)"
              : "0 8px 32px rgba(44, 24, 16, 0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          <input {...getInputProps()} />

          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview"
                  className="h-56 w-56 rounded-3xl object-cover"
                  style={{ boxShadow: "0 8px 40px rgba(44,24,16,0.2)", border: "3px solid var(--terracotta)" }}
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="absolute -top-2 -right-2 rounded-full bg-espresso p-2 text-[var(--btn-fg)] shadow-md"
                >
                  <CheckCircle2 className="h-5 w-5" />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative"
              >
                <motion.div
                  animate={
                    isDragActive
                      ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
                      : {}
                  }
                  transition={{ duration: 0.5 }}
                  className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-full transition-all",
                  )}
                  style={{
                    background: isDragActive ? "var(--terracotta)" : "rgba(184, 115, 74, 0.12)",
                    color: isDragActive ? "var(--btn-fg)" : "var(--terracotta)",
                    boxShadow: isDragActive ? "0 0 30px rgba(184, 115, 74, 0.3)" : "none",
                  }}
                >
                  <ImageIcon className="h-10 w-10" />
                </motion.div>

                {/* Animated rings */}
                {isDragActive && (
                  <>
                    <motion.div
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.4, opacity: 0 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                      className="absolute inset-0 rounded-full border-2 border-terracotta"
                    />
                    <motion.div
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 0.3,
                      }}
                      className="absolute inset-0 rounded-full border-2 border-terracotta"
                    />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <motion.p
              animate={{ opacity: isDragActive ? 1 : 0.9 }}
              className="font-display text-2xl text-ink"
            >
              {isDragActive
                ? "Drop your photo here"
                : file
                ? file.name
                : "Drop your selfie here"}
            </motion.p>
            <p className="text-sm text-ink-stone max-w-md">
              {isDragActive
                ? "Release to upload"
                : file
                ? "Looking good! Hit Analyze to get your results."
                : "JPG, PNG or WEBP • up to 8 MB • clear, well-lit, front-facing"}
            </p>
          </div>

          {/* Inline action buttons — visible immediately when file is chosen */}
          {file && !isDragActive && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="outline"
                onClick={() => { setFile(null); setPreview(null); setError(null); setSkinContext(null); }}
                disabled={submitting}
                className="w-full sm:w-auto min-w-[130px]"
              >
                Choose another
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                variant="accent"
                size="lg"
                className="w-full sm:flex-1 relative overflow-hidden group"
              >
                {submitting && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Analyzing…</>
                  ) : (
                    <><Upload className="h-4 w-4" />Analyze my photo</>
                  )}
                </span>
              </Button>
            </motion.div>
          )}

          {/* Decorative gradient border animation */}
          {isDragActive && (
            <motion.div
              className="absolute inset-0 rounded-4xl opacity-50 pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(193, 122, 95, 0.3), transparent)",
              }}
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}
        </div>
      </motion.div>



      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 rounded-2xl p-4 text-sm"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171" }}
            >
              <XCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
