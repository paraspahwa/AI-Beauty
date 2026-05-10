"use client";

import * as React from "react";
import Image from "next/image";
import { Sparkles, Lock, Loader2 } from "lucide-react";
import type { ColorAnalysisResult, ReportVisualAsset } from "@/types/report";
import { MAKEUP_LOOKS } from "@/lib/makeup-looks";

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
        <span className="text-xs text-[#B8AD99] ml-1">Palette-matched colors</span>
      )}
    </div>
  );
}

// ── Preview tile ──────────────────────────────────────────────────────────────
function PreviewTile({
  asset,
  label,
  index,
}: {
  asset?: ReportVisualAsset;
  label: string;
  index: number;
}) {
  const isReady   = asset?.status === "ready"   && !!asset.signedUrl;
  const isFailed  = asset?.status === "failed";
  const isPending = !asset || asset.status === "missing" || asset.status === "pending";

  // Gradient fallback colors — one per look
  const FALLBACK_GRADIENTS = [
    "from-rose-900/60 to-pink-800/40",
    "from-red-900/60 to-rose-700/40",
    "from-purple-900/60 to-indigo-800/40",
    "from-amber-900/60 to-rose-900/40",
  ];
  const gradient = FALLBACK_GRADIENTS[index] ?? FALLBACK_GRADIENTS[0];

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative rounded-2xl overflow-hidden aspect-[3/4] bg-gradient-to-br ${gradient} shadow-lg`}
      >
        {isReady && (
          <Image
            src={asset.signedUrl!}
            alt={label}
            fill
            className="object-cover object-top makeup-preview"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        )}
        {isPending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs">Generating…</span>
          </div>
        )}
        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/40 px-4 text-center">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs">Preview unavailable</span>
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-[#F4E9D8] text-center">{label}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  colorAnalysis?: ColorAnalysisResult;
  makeupPreviews?: ReportVisualAsset[];
  isPaid: boolean;
}

export function MakeupCard({ colorAnalysis, makeupPreviews, isPaid }: Props) {
  const palette = colorAnalysis?.palette ?? [];
  const season  = colorAnalysis?.season  ?? "Your Season";

  return (
    <>
      <style>{MAKEUP_CSS}</style>
      <div className="rounded-3xl bg-[#13111A] border border-white/8 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#F4E9D8] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-400" />
              Makeup Try-On
            </h2>
            <p className="text-sm text-[#B8AD99] mt-1">
              4 AI-generated looks using your {season} palette
            </p>
          </div>
          {isPaid && <PaletteStrip palette={palette} />}
        </div>

        {/* Premium gate */}
        {!isPaid && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border border-dashed border-white/10 bg-white/2">
            <Lock className="w-8 h-8 text-[#B8AD99]" />
            <p className="text-sm text-[#B8AD99] text-center max-w-xs">
              Unlock the full report to see your AI-generated makeup looks — personalised to your color season and face features.
            </p>
          </div>
        )}

        {/* 4-up grid */}
        {isPaid && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {MAKEUP_LOOKS.map((look) => {
              const asset = makeupPreviews?.[look.index];
              // Prefer label stored on the asset (set at generation time) so future
              // label renames don't silently mismatch persisted data.
              const label = asset?.styleName ?? look.label;
              return (
                <PreviewTile
                  key={look.index}
                  index={look.index}
                  label={label}
                  asset={asset}
                />
              );
            })}
          </div>
        )}

        {/* Look descriptions */}
        {isPaid && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MAKEUP_LOOKS.map((look) => (
              <p key={look.index} className="text-xs text-[#9A9080] leading-relaxed text-center">
                {look.description}
              </p>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
