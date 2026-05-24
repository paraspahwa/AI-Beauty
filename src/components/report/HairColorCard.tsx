"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2, Sparkles, RefreshCw, ChevronDown } from "lucide-react";

/* ─── FAL hair_style enum values (fal-ai/image-apps-v2/hair-change) ──────── */
const HAIR_STYLES = [
  { value: "No change",        label: "No change (color only)" },
  { value: "short_hair",       label: "Short Hair" },
  { value: "medium_long_hair", label: "Medium-Long Hair" },
  { value: "long_hair",        label: "Long Hair" },
  { value: "curly_hair",       label: "Curly Hair" },
  { value: "wavy_hair",        label: "Wavy Hair" },
  { value: "high_ponytail",    label: "High Ponytail" },
  { value: "bun",              label: "Bun" },
  { value: "bob_cut",          label: "Bob Cut" },
  { value: "pixie_cut",        label: "Pixie Cut" },
  { value: "braids",           label: "Braids" },
  { value: "straight_hair",    label: "Straight Hair" },
] as const;

type HairStyleValue = (typeof HAIR_STYLES)[number]["value"];

/* ─── FAL hair_color enum values ─────────────────────────────────────────── */
const HAIR_COLOR_OPTIONS = [
  { group: "Natural", value: "natural",        label: "Natural",         hex: "#6B3A2A" },
  { group: "Natural", value: "black",           label: "Black",           hex: "#0a0a0a" },
  { group: "Natural", value: "dark_brown",      label: "Dark Brown",      hex: "#3b2314" },
  { group: "Natural", value: "light_brown",     label: "Light Brown",     hex: "#9b6b4a" },
  { group: "Natural", value: "blonde",          label: "Blonde",          hex: "#e2b96f" },
  { group: "Natural", value: "platinum_blonde", label: "Platinum Blonde", hex: "#f5e6c8" },
  { group: "Natural", value: "auburn",          label: "Auburn",          hex: "#7B3F2A" },
  { group: "Natural", value: "red",             label: "Red",             hex: "#B5481A" },
  { group: "Style",   value: "gray",            label: "Gray",            hex: "#9A9A9A" },
  { group: "Style",   value: "silver",          label: "Silver",          hex: "#C8C8C8" },
  { group: "Style",   value: "highlights",      label: "Highlights",      hex: "#D4A96A" },
  { group: "Style",   value: "ombre",           label: "Ombre",           hex: "#8B5A2B" },
  { group: "Style",   value: "balayage",        label: "Balayage",        hex: "#C49A6C" },
  { group: "Fashion", value: "blue",            label: "Blue",            hex: "#2E5FA3" },
  { group: "Fashion", value: "green",           label: "Green",           hex: "#2A8C8C" },
  { group: "Fashion", value: "purple",          label: "Purple",          hex: "#111827" },
  { group: "Fashion", value: "pink",            label: "Pink",            hex: "#D4748A" },
  { group: "Fashion", value: "rainbow",         label: "Rainbow",         hex: "#E8A040" },
] as const;

type HairColorValue = (typeof HAIR_COLOR_OPTIONS)[number]["value"];

interface Props { reportId: string }

/* ─── Generic dropdown ───────────────────────────────────────────────────── */
function Dropdown<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hex?: string; group?: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const groups = Array.from(new Set(options.map((o) => o.group).filter(Boolean)));
  const hasGroups = groups.length > 1;

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative" style={{ userSelect: "none" }}>
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: "#9C7D5B" }}>
        {label}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full rounded-xl px-3.5 py-2.5 text-sm font-medium"
        style={{ background: "#F5EFE7", border: "1.5px solid #E0CEBC", color: "#3D2B1F", minWidth: 200 }}
      >
        <span className="flex items-center gap-2">
          {selected?.hex && (
            <span className="inline-block h-4 w-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: selected.hex, border: "1px solid rgba(0,0,0,0.15)" }} />
          )}
          {selected?.label ?? value}
        </span>
        <ChevronDown className="h-4 w-4 ml-2 shrink-0 transition-transform"
          style={{ color: "#9C7D5B", transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-xl overflow-y-auto"
          style={{
            background: "#fffafc",
            border: "1px solid rgba(17,24,39,0.25)",
            boxShadow: "0 8px 24px rgba(17,24,39,0.14)",
            minWidth: 230, maxHeight: 320,
          }}
        >
          {hasGroups
            ? groups.map((group) => (
                <div key={group}>
                  <p className="px-3 pt-3 pb-1 text-[9px] uppercase tracking-widest font-semibold"
                    style={{ color: "rgba(200,169,110,0.7)" }}>{group}</p>
                  {options.filter((o) => o.group === group).map((opt) => (
                    <DropdownItem key={opt.value} opt={opt} selected={value === opt.value}
                      onSelect={(v) => { onChange(v as T); setOpen(false); }} />
                  ))}
                </div>
              ))
            : options.map((opt) => (
                <DropdownItem key={opt.value} opt={opt} selected={value === opt.value}
                  onSelect={(v) => { onChange(v as T); setOpen(false); }} />
              ))}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  opt, selected, onSelect,
}: { opt: { value: string; label: string; hex?: string }; selected: boolean; onSelect: (v: string) => void }) {
  return (
    <button type="button" onClick={() => onSelect(opt.value)}
      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors"
      style={{ background: selected ? "rgba(200,169,110,0.18)" : "transparent", color: selected ? "#fffafc" : "rgba(255,255,255,0.85)" }}
    >
      {opt.hex && (
        <span className="inline-block h-4 w-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: opt.hex, border: "1.5px solid rgba(255,255,255,0.2)" }} />
      )}
      <span className="flex-1">{opt.label}</span>
      {selected && <span style={{ color: "#fffafc", fontSize: 12 }}>&#10003;</span>}
    </button>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export function HairColorCard({ reportId }: Props) {
  const [selectedStyle, setSelectedStyle] = React.useState<HairStyleValue>("No change");
  const [selectedColor, setSelectedColor] = React.useState<HairColorValue>("natural");
  const [generatedUrl, setGeneratedUrl]   = React.useState<string | null>(null);
  const [loading, setLoading]             = React.useState(false);
  const [error, setError]                 = React.useState<string | null>(null);

  const currentColor = HAIR_COLOR_OPTIONS.find((c) => c.value === selectedColor);
  const styleLabel   = HAIR_STYLES.find((s) => s.value === selectedStyle)?.label ?? selectedStyle;
  const isColorOnly  = selectedStyle === "No change";

  async function generate() {
    if (loading) return;
    setLoading(true); setError(null); setGeneratedUrl(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/hair-color`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorName: selectedColor,
          styleName: isColorOnly ? undefined : selectedStyle,
        }),
      });
      const json = await res.json() as { signedUrl?: string; error?: string };
      if (!res.ok || !json.signedUrl) setError(json.error ?? "Generation failed. Please try again.");
      else setGeneratedUrl(json.signedUrl);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const btnLabel = loading ? "Generating..."
    : isColorOnly
      ? `Try ${currentColor?.label ?? selectedColor}`
      : `Try ${styleLabel} + ${currentColor?.label ?? selectedColor}`;

  return (
    <div className="overflow-hidden" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", borderRadius: 12, marginTop: 24 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid #F0E8DC" }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: "#111827" }}>
          <Sparkles className="h-4 w-4" style={{ color: "#3D2B1F" }} />
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "#3D2B1F" }}>Hair Try-On Studio</h3>
          <p className="text-xs" style={{ color: "#9C7D5B" }}>Choose a style, pick a color, generate your preview</p>
        </div>
      </div>

      <div className="p-6 flex flex-col lg:flex-row gap-8">
        {/* Controls */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {/* Dropdowns */}
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex-1">
              <Dropdown
                label="Target Hairstyle"
                value={selectedStyle}
                options={HAIR_STYLES.map((s) => ({ value: s.value, label: s.label }))}
                onChange={(v) => { setSelectedStyle(v); setGeneratedUrl(null); setError(null); }}
              />
            </div>
            <div className="flex-1">
              <Dropdown
                label="Hair Color"
                value={selectedColor}
                options={HAIR_COLOR_OPTIONS.map((c) => ({ value: c.value, label: c.label, hex: c.hex, group: c.group }))}
                onChange={(v) => { setSelectedColor(v); setGeneratedUrl(null); setError(null); }}
              />
            </div>
          </div>

          {/* Quick-select swatch strip */}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-2.5" style={{ color: "#9C7D5B" }}>
              Quick-select color
            </p>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLOR_OPTIONS.map((c) => (
                <button type="button" key={c.value} title={c.label}
                  onClick={() => { setSelectedColor(c.value); setGeneratedUrl(null); setError(null); }}
                  className="flex flex-col items-center gap-1 transition-transform hover:scale-110 focus:outline-none">
                  <div className="h-8 w-8 rounded-full transition-all"
                    style={{
                      backgroundColor: c.hex,
                      border: selectedColor === c.value ? "3px solid #111827" : "2px solid rgba(0,0,0,0.12)",
                      boxShadow: selectedColor === c.value ? "0 0 0 2px #FDFAF6, 0 0 0 4px #111827" : "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  />
                  <span className="text-[7px] text-center max-w-[32px] leading-tight"
                    style={{ color: selectedColor === c.value ? "#111827" : "#B8A898" }}>
                    {c.label.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button type="button" onClick={generate} disabled={loading}
            className="self-start flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#111827", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(17,24,39,0.35)" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {btnLabel}
          </button>

          {error && <p className="text-xs" style={{ color: "#B94040" }}>{error}</p>}
        </div>

        {/* Preview panel */}
        <div className="flex-shrink-0 w-full lg:w-64 flex flex-col items-center gap-3" style={{ minHeight: 280 }}>
          {generatedUrl ? (
            <>
              <div className="relative w-full overflow-hidden"
                style={{ borderRadius: 10, aspectRatio: "3/4", border: "1.5px solid #E8DDD0" }}>
                <Image src={generatedUrl} alt="Hair try-on" fill unoptimized
                  className="object-cover" style={{ objectPosition: "top center" }} />
                {currentColor && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-3 py-2"
                    style={{ background: "rgba(0,0,0,0.38)" }}>
                    <div className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: currentColor.hex, border: "1px solid rgba(255,255,255,0.4)" }} />
                    <span className="text-[10px] font-semibold text-white">
                      {!isColorOnly ? `${styleLabel} · ` : ""}{currentColor.label}
                    </span>
                  </div>
                )}
              </div>
              <button type="button" onClick={generate} disabled={loading}
                className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: "#9C7D5B" }}>
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </button>
            </>
          ) : loading ? (
            <div className="w-full flex flex-col items-center justify-center gap-3"
              style={{ borderRadius: 10, aspectRatio: "3/4", background: "#F5EFE7", border: "1.5px solid #E8DDD0" }}>
              {currentColor && (
                <div className="h-14 w-14 rounded-full animate-pulse"
                  style={{ backgroundColor: currentColor.hex, opacity: 0.7 }} />
              )}
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#111827" }} />
              <p className="text-xs text-center px-4" style={{ color: "#9C7D5B" }}>
                {!isColorOnly ? `Changing to ${styleLabel}...` : `Applying ${currentColor?.label}...`}
                <br /><span className="text-[10px]" style={{ color: "#B8A898" }}>~20-40 seconds</span>
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-3"
              style={{ borderRadius: 10, aspectRatio: "3/4", background: "#F5EFE7", border: "1.5px dashed #E8DDD0" }}>
              <div className="h-14 w-14 rounded-full" style={{ background: "#E8DDD0" }} />
              <p className="text-xs text-center px-4" style={{ color: "#B8A898" }}>
                Choose a style &amp; color<br />then click Generate
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
