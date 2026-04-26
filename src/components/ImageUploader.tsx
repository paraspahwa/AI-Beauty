"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { Upload, ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface ImageUploaderProps {
  onUploaded: (reportId: string) => void;
  className?: string;
}

/**
 * Drag-and-drop selfie uploader.
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

      // Simple fake progress while the analysis runs (real progress would
      // require streaming; this keeps the UI responsive).
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
    <div className={cn("w-full max-w-xl mx-auto", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed",
          "border-cream-300 bg-white/60 px-6 py-14 text-center cursor-pointer transition-all",
          "hover:border-accent hover:bg-white/80",
          isDragActive && "border-accent bg-cream-200/40",
        )}
      >
        <input {...getInputProps()} />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="h-48 w-48 rounded-2xl object-cover shadow-card" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-200 text-accent-deep">
            <ImageIcon className="h-7 w-7" />
          </div>
        )}
        <div>
          <p className="font-serif text-xl text-ink">
            {file ? file.name : "Drop your selfie here"}
          </p>
          <p className="text-sm text-ink-muted mt-1">
            JPG, PNG or WEBP · up to 8 MB · clear, well-lit, front-facing
          </p>
        </div>
      </div>

      {file && (
        <div className="mt-6 space-y-4">
          {submitting && <Progress value={progress} />}
          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => { setFile(null); setPreview(null); }} disabled={submitting}>
              Choose another
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} variant="accent" size="lg">
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
              ) : (
                <><Upload className="h-4 w-4" /> Analyze my photo</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
