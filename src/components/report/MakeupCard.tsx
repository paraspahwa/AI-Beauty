"use client";

import * as React from "react";
import Image from "next/image";
import { Sparkles, Lock, Loader2, ChevronDown, Wand2, RefreshCw } from "lucide-react";
import type { ColorAnalysisResult } from "@/types/report";
import {
  MAKEUP_STYLES,
  MAKEUP_INTENSITIES,
  MAKEUP_STYLE_LABELS,
  MAKEUP_INTENSITY_LABELS,
  type MakeupStyleValue,
  type MakeupIntensityValue,
} from "@/lib/makeup-options";

// ── Animation CSS ─────────────────────────────────────────────────────────────
const MAKEUP_CSS = `
@keyframes makeup-fade-in {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}
.makeup-preview {
  animation: makeup-fade-in 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
`;

// ── Palette swatch strip ──────────────────────────────────────────────────────
function PaletteStrip({ palette }: { palette: { name: string; hex: string }[] }) {
  const top3 = palette.slice(0, 3);
  return (
    <div className="flex items-center gap-1.5">
      {top3.map((c) => (
        <span
          key={c.hex}
          className="w-5 h-5 rounded-full border border-white/20 shadow-sm flex-shrink-0"
          style={{ background: c.hex }}
          title={c.name}
        />
      ))}
      {top3.length > 0 && (
        <span className="text-xs text-[#B8AD99] ml-1">Palette-matched</span>
      )}
    </div>
  );
}

// ── Dropdown ──────────────────────────────────────────────────────────────────
interface DropdownProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
  disabled?: boolean;
}
function Dropdown<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  disabled,
}: DropdownProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#B8AD99] uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          disabled={disabled}
          className="w-full appearance-none rounded-xl px-3 py-2.5 text-sm font-medium
                     bg-white/5 border border-white/10 text-[#F4E9D8]
                     focus:outline-none focus:ring-2 focus:ring-rose-400/40
                     disabled:opacity-50 cursor-pointer pr-8"
        >
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-[#1A1525] text-[#F4E9D8]">
              {labels[opt]}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9080] pointer-events-none" />
      </div>
    </div>
  );
}

// ── Result preview ────────────────────────────────────────────────────────────
function ResultPreview({
  url,
  loading,
  photoUrl,
}: {
  url: string | null;
  loading: boolean;
  photoUrl?: string;
}) {
  const FALLBACK = "from-rose-900/60 to-pink-800/40";
  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${FALLBACK} shadow-lg`}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Baseline selfie always shown underneath */}
      {photoUrl && !url && !loading && (
        <Image
          src={photoUrl}
          alt="Your photo"
          fill
          className="object-cover object-top opacity-60"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      )}

      {/* AI result */}
      {url && !loading && (
        <Image
          src={url}
          alt="Makeup preview"
          fill
          className="object-cover object-top makeup-preview"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      )}

      {/* Generating overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
          <span className="text-xs text-white/70 text-center px-4">
            Applying makeup…<br />
            <span className="text-white/40">~30–60 seconds</span>
          </span>
        </div>
      )}

      {/* AI badge */}
      {url && !loading && (
        <div
          className="absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "rgba(244,233,216,0.15)", color: "#F4E9D8", backdropFilter: "blur(4px)" }}
        >
          <Sparkles className="w-2.5 h-2.5" /> AI
        </div>
      )}

      {/* Placeholder when no photo and not loading */}
      {!url && !loading && !photoUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/30">
          <Sparkles className="w-6 h-6" />
          <span className="text-xs">Select options &amp; generate</span>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  colorAnalysis?: ColorAnalysisResult;
  makeupPreviews?: unknown; // legacy — kept for prop compat, unused in new flow
  isPaid: boolean;
  reportId: string;
  photoUrl?: string;
}

export function MakeupCard({ colorAnalysis, isPaid, reportId, photoUrl }: Props) {
  const palette = colorAnalysis?.palette ?? [];
  const season  = colorAnalysis?.season  ?? "Your Season";

  const [style, setStyle] = React.useState<MakeupStyleValue>("natural");
  const [intensity, setIntensity] = React.useState<MakeupIntensityValue>("medium");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResultUrl(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/makeup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, intensity }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Generation failed. Please try again.");
      } else {
        setResultUrl(json.url);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Reset result when options change so the UI reflects the pending state
  const prevCombo = React.useRef(`${style}__${intensity}`);
  React.useEffect(() => {
    const combo = `${style}__${intensity}`;
    if (combo !== prevCombo.current) {
      setResultUrl(null);
      setError(null);
      prevCombo.current = combo;
    }
  }, [style, intensity]);

  return (
    <>
      <style>{MAKEUP_CSS}</style>
      <div className="rounded-3xl bg-[#13111A] border border-white/8 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-[#F4E9D8] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-400" />
              Makeup Try-On
            </h2>
            <p className="text-sm text-[#B8AD99] mt-1">
              AI-powered looks using your {season} palette
            </p>
          </div>
          {isPaid && <PaletteStrip palette={palette} />}
        </div>

        {/* Premium gate */}
        {!isPaid && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border border-dashed border-white/10 bg-white/2">
            <Lock className="w-8 h-8 text-[#B8AD99]" />
            <p className="text-sm text-[#B8AD99] text-center max-w-xs">
              Unlock the full report to see your AI-generated makeup looks — personalised to your
              color season and face features.
            </p>
          </div>
        )}

        {isPaid && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* ── Left: controls ── */}
            <div className="flex flex-col gap-5">
              <Dropdown
                label="Makeup Style"
                value={style}
                options={MAKEUP_STYLES}
                labels={MAKEUP_STYLE_LABELS}
                onChange={setStyle}
                disabled={loading}
              />
              <Dropdown
                label="Intensity"
                value={intensity}
                options={MAKEUP_INTENSITIES}
                labels={MAKEUP_INTENSITY_LABELS}
                onChange={setIntensity}
                disabled={loading}
              />

              <button
                onClick={generate}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold
                           transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#EC4899,#8B5CF6)",
                  color: "#3D2B1F",
                  boxShadow: "0 2px 12px rgba(201,149,107,0.3)",
                }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : resultUrl ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {loading ? "Generating…" : resultUrl ? "Regenerate" : "Generate Preview"}
              </button>

              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}

              {/* Style description */}
              <p className="text-xs text-[#9A9080] leading-relaxed">
                {styleDescriptions[style]}
              </p>
            </div>

            {/* ── Right: preview ── */}
            <ResultPreview url={resultUrl} loading={loading} photoUrl={photoUrl} />
          </div>
        )}
      </div>
    </>
  );
}

// ── Style descriptions ────────────────────────────────────────────────────────
const styleDescriptions: Record<MakeupStyleValue, string> = {
  natural:        "Light, everyday coverage. Enhances your features without looking overdone.",
  glamorous:      "Full glam with bold lips, defined eyes, and sculpted cheeks.",
  smoky_eyes:     "Dramatic smoky eyeshadow blended for depth; nude or soft lip.",
  bold_lips:      "Statement lip color with minimal eye makeup — clean and striking.",
  no_makeup:      "Skin-first look: even skin tone with a polished, no-makeup finish.",
  remove_makeup:  "Simulates a clean, bare-faced look.",
  dramatic:       "High-contrast, editorial-style look with bold definition throughout.",
  bridal:         "Timeless bridal look: rosy blush, defined eyes, classic lip.",
  professional:   "Polished, neutral-toned look appropriate for a workplace setting.",
  korean_style:   "Dewy, glass-skin finish with gradient lips and puppy-eye liner.",
  artistic:       "Creative, expressive look with unique color placement.",
};