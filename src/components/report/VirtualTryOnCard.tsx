"use client";

import * as React from "react";
import Image from "next/image";
import { Sparkles, Upload, Wand2, Loader2, RefreshCw, ShoppingBag, Lock, X, History } from "lucide-react";

// ── Animation CSS ─────────────────────────────────────────────────────────────
const TRYON_CSS = `
@keyframes tryon-fade-in {
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);   }
}
.tryon-result { animation: tryon-fade-in 0.5s cubic-bezier(0.4,0,0.2,1) forwards; }
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.tryon-shimmer {
  background: linear-gradient(90deg,#F5EDE3 25%,#EDD9C5 50%,#F5EDE3 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s infinite linear;
}
`;

interface Props {
  reportId: string;
  photoUrl: string;
  isPaid: boolean;
}

type TryonStatus = "idle" | "loading" | "done" | "error";

// ── Drag-and-drop / click upload zone ────────────────────────────────────────
function UploadZone({
  onFile,
  preview,
  disabled,
}: {
  onFile: (f: File) => void;
  preview: string | null;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => !disabled && e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden"
      style={{
        minHeight: 200,
        background: dragging ? "rgba(200,169,110,0.10)" : "#FAF6F0",
        borderColor: dragging ? "#C8A96E" : "#E8DDD0",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {preview ? (
        <Image
          src={preview}
          alt="Garment preview"
          fill
          className="object-contain p-3"
          unoptimized
        />
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(200,169,110,0.15)" }}
          >
            <Upload className="h-5 w-5" style={{ color: "#C8A96E" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "#3D2B1F" }}>
            Upload garment photo
          </p>
          <p className="text-xs leading-snug" style={{ color: "#9C7D5B" }}>
            Drag & drop or click<br />JPG / PNG / WEBP · max 10 MB
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── Result preview panel ──────────────────────────────────────────────────────
function ResultPanel({
  url,
  status,
  onRetry,
}: {
  url: string | null;
  status: TryonStatus;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return (
      <div
        className="tryon-shimmer flex flex-col items-center justify-center rounded-2xl gap-3"
        style={{ minHeight: 260, border: "1px solid #E8DDD0" }}
      >
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#C8A96E" }} />
        <p className="text-sm font-medium" style={{ color: "#9C7D5B" }}>
          Generating your try-on…
        </p>
        <p className="text-xs" style={{ color: "#B8A898" }}>
          This takes ~30–60 seconds
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-2xl p-8 text-center"
        style={{ minHeight: 260, background: "rgba(192,107,62,0.06)", border: "1px dashed rgba(192,107,62,0.3)" }}
      >
        <X className="h-8 w-8" style={{ color: "#C06B3E" }} />
        <p className="text-sm font-medium" style={{ color: "#3D2B1F" }}>Try-on failed</p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all hover:opacity-80"
          style={{ background: "rgba(192,107,62,0.12)", color: "#C06B3E" }}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (status === "done" && url) {
    return (
      <div className="tryon-result relative rounded-2xl overflow-hidden" style={{ minHeight: 260 }}>
        <Image
          src={url}
          alt="Virtual try-on result"
          width={480}
          height={480}
          className="w-full h-auto object-cover rounded-2xl"
          unoptimized
        />
        <a
          href={url}
          download="tryon-result.jpg"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all hover:opacity-90"
          style={{ background: "rgba(61,43,31,0.7)", color: "#FAF6F0" }}
        >
          <ShoppingBag className="h-3 w-3" /> Save
        </a>
      </div>
    );
  }

  // idle
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl"
      style={{ minHeight: 260, background: "#FAF6F0", border: "1px dashed #E8DDD0" }}
    >
      <Sparkles className="h-8 w-8" style={{ color: "#C8A96E" }} />
      <p className="text-sm font-medium" style={{ color: "#9C7D5B" }}>
        Result will appear here
      </p>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export function VirtualTryOnCard({ reportId, photoUrl, isPaid }: Props) {
  const [clothFile, setClothFile] = React.useState<File | null>(null);
  const [clothPreview, setClothPreview] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<TryonStatus>("idle");
  const [history, setHistory] = React.useState<string[]>([]);
  const [showHistory, setShowHistory] = React.useState(false);

  // Revoke object URL on cleanup
  React.useEffect(() => {
    return () => { if (clothPreview?.startsWith("blob:")) URL.revokeObjectURL(clothPreview); };
  }, [clothPreview]);

  function handleFile(f: File) {
    if (clothPreview?.startsWith("blob:")) URL.revokeObjectURL(clothPreview);
    setClothFile(f);
    setClothPreview(URL.createObjectURL(f));
    setResultUrl(null);
    setStatus("idle");
  }

  function clearGarment() {
    if (clothPreview?.startsWith("blob:")) URL.revokeObjectURL(clothPreview);
    setClothFile(null);
    setClothPreview(null);
    setResultUrl(null);
    setStatus("idle");
  }

  async function generate() {
    if (!clothFile) return;
    setStatus("loading");
    setResultUrl(null);
    try {
      const form = new FormData();
      form.append("clothImage", clothFile);
      const res = await fetch(`/api/reports/${reportId}/virtual-tryon`, {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Generation failed");
      setResultUrl(json.url);
      setStatus("done");
      setHistory((h) => [json.url!, ...h].slice(0, 8));
    } catch {
      setStatus("error");
    }
  }

  if (!isPaid) {
    return (
      <div
        className="rounded-3xl p-10 text-center"
        style={{ background: "linear-gradient(145deg,rgba(18,18,26,0.95),rgba(26,26,38,0.9))", border: "1px solid rgba(201,149,107,0.18)" }}
      >
        <Lock className="h-10 w-10 mx-auto mb-4" style={{ color: "#C8A96E" }} />
        <p className="text-base font-semibold mb-2" style={{ color: "#E8C990" }}>
          Virtual Try-On is a premium feature
        </p>
        <p className="text-sm" style={{ color: "#9C7D5B" }}>
          Unlock to see yourself wearing any garment instantly.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{TRYON_CSS}</style>
      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", boxShadow: "0 2px 24px rgba(61,43,31,0.06)" }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid #E8DDD0", background: "linear-gradient(135deg,rgba(200,169,110,0.08),rgba(232,221,208,0.12))" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg,#C9956B,#E8C990)" }}
            >
              <Sparkles className="h-4.5 w-4.5" style={{ color: "#3D2B1F" }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "#3D2B1F" }}>
                Virtual Clothing Try-On
              </h2>
              <p className="text-xs" style={{ color: "#9C7D5B" }}>
                Upload any garment photo — see it on you instantly
              </p>
            </div>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory((s) => !s)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(200,169,110,0.12)", color: "#9C7D5B", border: "1px solid #E8DDD0" }}
            >
              <History className="h-3.5 w-3.5" />
              History ({history.length})
            </button>
          )}
        </div>

        {/* History strip */}
        {showHistory && history.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-5 py-3" style={{ borderBottom: "1px solid #F0E8DF" }}>
            {history.map((url, i) => (
              <button
                key={i}
                onClick={() => { setResultUrl(url); setStatus("done"); setShowHistory(false); }}
                className="shrink-0 rounded-xl overflow-hidden transition-all hover:opacity-80"
                style={{ width: 60, height: 60, border: url === resultUrl ? "2px solid #C8A96E" : "2px solid #E8DDD0" }}
              >
                <Image src={url} alt={`Try-on ${i + 1}`} width={60} height={60} className="object-cover w-full h-full" unoptimized />
              </button>
            ))}
          </div>
        )}

        {/* Body: 2-col on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          {/* Left: selfie + garment upload */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>
              Your Photo
            </p>
            <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
              <Image
                src={photoUrl}
                alt="Your photo"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>
                Garment
              </p>
              {clothFile && (
                <button
                  onClick={clearGarment}
                  className="flex items-center gap-1 text-xs transition-colors hover:opacity-70"
                  style={{ color: "#C06B3E" }}
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <UploadZone onFile={handleFile} preview={clothPreview} disabled={status === "loading"} />

            <button
              onClick={generate}
              disabled={!clothFile || status === "loading"}
              className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#C9956B,#E8C990)", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(201,149,107,0.35)" }}
            >
              {status === "loading" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Wand2 className="h-4 w-4" /> Try It On</>
              )}
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="px-5 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9C7D5B" }}>
            Result
          </p>
          <ResultPanel url={resultUrl} status={status} onRetry={generate} />
        </div>

        {/* Tips footer */}
        <div
          className="px-5 py-4 flex flex-wrap gap-x-6 gap-y-1"
          style={{ borderTop: "1px solid #F0E8DF", background: "rgba(200,169,110,0.04)" }}
        >
          {[
            "Use a flat-lay or mannequin photo for best results",
            "Clear background improves accuracy",
            "Avoid heavily patterned backgrounds",
          ].map((tip) => (
            <p key={tip} className="text-[11px]" style={{ color: "#B8A898" }}>
              ✦ {tip}
            </p>
          ))}
        </div>
      </div>
    </>
  );
}
