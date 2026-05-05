"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";

/* ─── Hair color palette ─────────────────────────────────────────────────── */
const HAIR_COLORS = [
  // Naturals
  { name: "Jet Black",      hex: "#0a0a0a", group: "Natural" },
  { name: "Dark Brown",     hex: "#3b2314", group: "Natural" },
  { name: "Medium Brown",   hex: "#6b3a2a", group: "Natural" },
  { name: "Light Brown",    hex: "#9b6b4a", group: "Natural" },
  { name: "Dark Blonde",    hex: "#c49a6c", group: "Natural" },
  { name: "Golden Blonde",  hex: "#e2b96f", group: "Natural" },
  { name: "Platinum Blonde",hex: "#f5e6c8", group: "Natural" },
  { name: "Strawberry Blonde", hex: "#d4895a", group: "Natural" },
  // Reds
  { name: "Auburn",         hex: "#7B3F2A", group: "Red" },
  { name: "Copper Red",     hex: "#B5481A", group: "Red" },
  { name: "Burgundy",       hex: "#6B1E2E", group: "Red" },
  { name: "Mahogany",       hex: "#8B3A2A", group: "Red" },
  // Fashion
  { name: "Rose Gold",      hex: "#C48C8C", group: "Fashion" },
  { name: "Ash Gray",       hex: "#9A9A9A", group: "Fashion" },
  { name: "Silver",         hex: "#C8C8C8", group: "Fashion" },
  { name: "Lavender",       hex: "#9B7CB6", group: "Fashion" },
  { name: "Ocean Blue",     hex: "#2E5FA3", group: "Fashion" },
  { name: "Teal",           hex: "#2A8C8C", group: "Fashion" },
] as const;

type HairColor = (typeof HAIR_COLORS)[number];

/* ─── Props ──────────────────────────────────────────────────────────────── */
interface Props {
  reportId: string;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export function HairColorCard({ reportId }: Props) {
  const [selected, setSelected] = React.useState<HairColor | null>(null);
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const groups = Array.from(new Set(HAIR_COLORS.map((c) => c.group)));

  async function generate() {
    if (!selected || loading) return;
    setLoading(true);
    setError(null);
    setGeneratedUrl(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/hair-color`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorName: selected.name, colorHex: selected.hex }),
      });
      const json = await res.json() as { signedUrl?: string; error?: string };
      if (!res.ok || !json.signedUrl) {
        setError(json.error ?? "Generation failed. Please try again.");
      } else {
        setGeneratedUrl(json.signedUrl);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="overflow-hidden"
      style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", borderRadius: 12, marginTop: 24 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: "1px solid #F0E8DC" }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg,#C9956B,#E8C990)" }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "#3D2B1F" }} />
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "#3D2B1F" }}>
            Hair Color Try-On
          </h3>
          <p className="text-xs" style={{ color: "#9C7D5B" }}>
            Pick a shade and see how it looks on you
          </p>
        </div>
      </div>

      <div className="p-6 flex flex-col lg:flex-row gap-8">
        {/* Left: palette picker */}
        <div className="flex-1 min-w-0">
          {groups.map((group) => (
            <div key={group} className="mb-5">
              <p
                className="text-[10px] uppercase tracking-widest font-semibold mb-2.5"
                style={{ color: "#9C7D5B" }}
              >
                {group}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {HAIR_COLORS.filter((c) => c.group === group).map((color) => {
                  const isSelected = selected?.name === color.name;
                  return (
                    <button
                      key={color.name}
                      title={color.name}
                      onClick={() => {
                        setSelected(color);
                        setGeneratedUrl(null);
                        setError(null);
                      }}
                      className="flex flex-col items-center gap-1 transition-transform hover:scale-110 focus:outline-none"
                      style={{ flexShrink: 0 }}
                    >
                      <div
                        className="h-9 w-9 rounded-full transition-all"
                        style={{
                          backgroundColor: color.hex,
                          border: isSelected
                            ? "3px solid #C9956B"
                            : "2px solid rgba(0,0,0,0.12)",
                          boxShadow: isSelected
                            ? "0 0 0 2px #FDFAF6, 0 0 0 4px #C9956B"
                            : "0 1px 3px rgba(0,0,0,0.15)",
                        }}
                      />
                      <span
                        className="text-[8px] text-center leading-tight max-w-[36px] break-words"
                        style={{ color: isSelected ? "#C9956B" : "#9C7D5B", fontWeight: isSelected ? 700 : 400 }}
                      >
                        {color.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={!selected || loading}
            className="mt-2 flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg,#C9956B,#E8C990)",
              color: "#3D2B1F",
              boxShadow: "0 2px 12px rgba(201,149,107,0.35)",
            }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Generating…" : selected ? `Try ${selected.name}` : "Select a color first"}
          </button>

          {error && (
            <p className="mt-3 text-xs" style={{ color: "#B94040" }}>{error}</p>
          )}
        </div>

        {/* Right: preview panel */}
        <div
          className="flex-shrink-0 w-full lg:w-64 flex flex-col items-center gap-3"
          style={{ minHeight: 280 }}
        >
          {generatedUrl ? (
            <>
              <div
                className="relative w-full overflow-hidden"
                style={{ borderRadius: 10, aspectRatio: "3/4", border: "1.5px solid #E8DDD0" }}
              >
                <Image
                  src={generatedUrl}
                  alt={`Hair color try-on: ${selected?.name}`}
                  fill
                  unoptimized
                  className="object-cover"
                  style={{ objectPosition: "top center" }}
                />
                {/* Color label badge */}
                {selected && (
                  <div
                    className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-3 py-2"
                    style={{ background: "rgba(0,0,0,0.38)" }}
                  >
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selected.hex, border: "1px solid rgba(255,255,255,0.4)" }}
                    />
                    <span className="text-[10px] font-semibold text-white">{selected.name}</span>
                  </div>
                )}
              </div>

              {/* Retry button */}
              <button
                onClick={generate}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: "#9C7D5B" }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </button>
            </>
          ) : loading ? (
            <div
              className="w-full flex flex-col items-center justify-center gap-3"
              style={{
                borderRadius: 10,
                aspectRatio: "3/4",
                background: "#F5EFE7",
                border: "1.5px solid #E8DDD0",
              }}
            >
              {selected && (
                <div
                  className="h-14 w-14 rounded-full animate-pulse"
                  style={{ backgroundColor: selected.hex, opacity: 0.7 }}
                />
              )}
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#C9956B" }} />
              <p className="text-xs text-center px-4" style={{ color: "#9C7D5B" }}>
                Applying {selected?.name} hair color…
                <br />
                <span className="text-[10px]" style={{ color: "#B8A898" }}>
                  This takes ~15–30 seconds
                </span>
              </p>
            </div>
          ) : (
            <div
              className="w-full flex flex-col items-center justify-center gap-3"
              style={{
                borderRadius: 10,
                aspectRatio: "3/4",
                background: "#F5EFE7",
                border: "1.5px dashed #E8DDD0",
              }}
            >
              <div className="h-14 w-14 rounded-full" style={{ background: "#E8DDD0" }} />
              <p className="text-xs text-center px-4" style={{ color: "#B8A898" }}>
                Select a hair color
                <br />and click Generate
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
