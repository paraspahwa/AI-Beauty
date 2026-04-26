"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, ImageIcon, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fadeUp, scaleIn, staggerContainer } from "@/lib/animations";

export interface ImageUploaderProps {
  onUploaded: (reportId: string) => void;
  className?: string;
}

/**
 * Drag-and-drop selfie uploader with enhanced animations and premium design.
 * Posts the file as multipart/form-data to /api/analyze and reports progress.
 */
export function ImageUploader({ onUploaded, className }: ImageUploaderProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onDrop = React.useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
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

      // Simple fake progress while the analysis runs
      const ticker = setInterval(() => {
        setProgress((p) => (p < 90 ? p + 4 : p));
      }, 400);

      const res = await fetch("/api/analyze", { method: "POST", body: form });
      clearInterval(ticker);
      setProgress(100);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Upload failed (${res.status})`);
      }
      const json = (await res.json()) as { reportId: string };
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
      <motion.div variants={fadeUp}>
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-4 rounded-4xl border-2 transition-all",
            "bg-white shadow-card px-8 py-16 text-center cursor-pointer",
            "hover:shadow-premium hover:scale-[1.02]",
            isDragActive
              ? "border-terracotta bg-terracotta/5 border-solid scale-[1.02]"
              : file
              ? "border-sage border-solid"
              : "border-dashed border-cream-300 hover:border-terracotta/50"
          )}
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
                  className="h-56 w-56 rounded-3xl object-cover shadow-premium border-4 border-white"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="absolute -top-2 -right-2 bg-sage text-white rounded-full p-2 shadow-card"
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
                    isDragActive
                      ? "bg-terracotta text-white"
                      : "bg-gradient-to-br from-terracotta/20 to-sage/20 text-terracotta"
                  )}
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
                : "JPG, PNG or WEBP • up to 8 MB • clear, well-lit, front-facing"}
            </p>
          </div>

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
        {file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-6 space-y-4"
          >
            {submitting && (
              <motion.div variants={scaleIn} className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-sm text-ink-stone">
                  Analyzing your photo... {progress}%
                </p>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 rounded-2xl bg-danger/10 border border-danger/20 p-4 text-sm text-danger"
              >
                <XCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.div
              variants={staggerContainer}
              className="flex justify-center gap-3"
            >
              <motion.div variants={fadeUp}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setError(null);
                  }}
                  disabled={submitting}
                  className="min-w-[140px]"
                >
                  Choose another
                </Button>
              </motion.div>

              <motion.div variants={fadeUp}>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  variant="accent"
                  size="lg"
                  className="min-w-[180px] relative overflow-hidden group"
                >
                  {submitting && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{
                        x: ["-100%", "100%"],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Analyze my photo
                      </>
                    )}
                  </span>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
