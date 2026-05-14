"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, ImageIcon, Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { fadeUp, staggerContainer, cascadeContainer, springPop } from "@/lib/animations";
import { SkinQuestionnaireModal, type SkinContext } from "@/components/SkinQuestionnaireModal";

export interface ImageUploaderProps {
  onUploaded: (reportId: string) => void;
  className?: string;
}

const SAMPLE_PHOTOS = [
  { src: "/samples/sample-1.jpg", label: "Sample 1", hint: "Woman, warm skin tone" },
  { src: "/samples/sample-2.jpg", label: "Sample 2", hint: "Woman, cool undertone" },
  { src: "/samples/sample-3.jpg", label: "Sample 3", hint: "Man, olive skin" },
  { src: "/samples/sample-4.jpg", label: "Sample 4", hint: "Man, fair skin" },
];

/**
 * Convert a public-path URL to a File object (for sample photo injection).
 */
async function urlToFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

/**
 * Drag-and-drop selfie uploader with enhanced animations and premium design.
 * Posts the file as multipart/form-data to /api/analyze and reports progress.
 */
export function ImageUploader({ onUploaded, className }: ImageUploaderProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [loadingSample, setLoadingSample] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [skinContext, setSkinContext] = React.useState<SkinContext | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = React.useState(false);

  async function handleSampleClick(sample: typeof SAMPLE_PHOTOS[0]) {
    setLoadingSample(sample.src);
    setError(null);
    try {
      const f = await urlToFile(sample.src, sample.label.replace(" ", "-").toLowerCase() + ".jpg");
      setFile(f);
      setPreview(URL.createObjectURL(f));
      if (!skinContext) setShowQuestionnaire(true);
    } catch {
      setError("Could not load sample photo. Please upload your own.");
    } finally {
      setLoadingSample(null);
    }
  }

  // Derived step for AnalysisLoading (5 steps, equally spaced across 0-100%)
  const currentStep = Math.min(4, Math.floor(progress / 20));

  const onDrop = React.useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!skinContext) setShowQuestionnaire(true);
  }, [skinContext]);

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

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setProgress(10);

    try {
      const form = new FormData();
      form.append("image", file);
      if (skinContext && Object.keys(skinContext).length > 0) {
        form.append("skinContext", JSON.stringify(skinContext));
      }

      // Fake progress while the text pipeline runs (~30-50 s)
      const ticker = setInterval(() => {
        setProgress((p) => (p < 85 ? p + 3 : p));
      }, 600);

      const res = await fetch("/api/analyze", { method: "POST", body: form });
      clearInterval(ticker);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Upload failed (${res.status})`);
      }
      const json = (await res.json()) as { reportId?: string; visualsPending?: boolean };
      if (!json.reportId) throw new Error("Analysis started but no report ID was returned.");

      setProgress(100);
      onUploaded(json.reportId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
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
          <AnalysisLoading currentStep={currentStep} progress={progress} />
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
              ? "rgba(201,149,107,0.05)"
              : "linear-gradient(145deg, rgba(18,18,26,0.95), rgba(26,26,38,0.9))",
            borderColor: isDragActive
              ? "#C9956B"
              : file
              ? "rgba(123,110,158,0.6)"
              : "rgba(255,255,255,0.08)",
            boxShadow: isDragActive
              ? "0 0 40px rgba(201,149,107,0.15), inset 0 1px 0 rgba(255,255,255,0.05)"
              : "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
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
                  style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5)", border: "3px solid rgba(201,149,107,0.3)" }}
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="absolute -top-2 -right-2 rounded-full p-2"
                  style={{ background: "linear-gradient(135deg, #C9956B, #E8C990)", color: "#0A0A0F", boxShadow: "0 4px 12px rgba(201,149,107,0.4)" }}
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
                    background: isDragActive
                      ? "linear-gradient(135deg, #C9956B, #E8C990)"
                      : "rgba(201,149,107,0.12)",
                    color: isDragActive ? "#0A0A0F" : "#C9956B",
                    boxShadow: isDragActive ? "0 0 30px rgba(201,149,107,0.3)" : "none",
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
                      className="absolute inset-0 rounded-full border-2" style={{ borderColor: "#C9956B" }}
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
                      className="absolute inset-0 rounded-full border-2" style={{ borderColor: "#C9956B" }}
                    />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <motion.p
              animate={{ opacity: isDragActive ? 1 : 0.9 }}
              className="font-serif text-2xl text-ink"
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

      {/* ── Sample Photos ── */}
      {!file && (
        <motion.div
          variants={cascadeContainer}
          initial="hidden"
          animate="visible"
          className="mt-8"
        >
          <motion.p
            variants={fadeUp}
            className="text-center text-xs font-semibold uppercase tracking-[0.2em] mb-4 section-label justify-center"
            style={{ color: "#C9956B" }}
          >
            <Sparkles className="inline h-3 w-3 mr-1.5" />
            Or try a sample photo
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-4 gap-3"
          >
            {SAMPLE_PHOTOS.map((sample) => (
              <motion.button
                key={sample.src}
                variants={springPop}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSampleClick(sample)}
                disabled={!!loadingSample}
                title={sample.hint}
                className="relative rounded-2xl overflow-hidden aspect-square group cursor-pointer"
                style={{
                  border: "1.5px solid rgba(201,149,107,0.25)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sample.src}
                  alt={sample.hint}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Overlay on hover */}
                <div
                  className="absolute inset-0 flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "linear-gradient(to top, rgba(10,10,15,0.8) 40%, transparent)" }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#E8C990" }}>
                    Use this
                  </span>
                </div>
                {/* Loading spinner */}
                {loadingSample === sample.src && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(10,10,15,0.7)" }}>
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#C9956B" }} />
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
          <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            Sample images are for demo only — your results will reflect your own face.
          </p>
        </motion.div>
      )}

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
