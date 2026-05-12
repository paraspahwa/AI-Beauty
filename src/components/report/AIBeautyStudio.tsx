"use client";

import * as React from "react";
import Image from "next/image";
import {
  Sparkles, Upload, Wand2, Loader2, RefreshCw, ShoppingBag,
  X, History, UserRound, Info, Download, ChevronDown, Lock,
} from "lucide-react";
import type { ColorAnalysisResult } from "@/types/report";
import {
  MAKEUP_STYLES, MAKEUP_INTENSITIES, MAKEUP_STYLE_LABELS, MAKEUP_INTENSITY_LABELS,
  type MakeupStyleValue, type MakeupIntensityValue,
} from "@/lib/makeup-options";

// ── Shared animation CSS ──────────────────────────────────────────────────────
const STUDIO_CSS = `
@keyframes studio-fade-in {
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);   }
}
.studio-result { animation: studio-fade-in 0.5s cubic-bezier(0.4,0,0.2,1) forwards; }
@keyframes studio-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.studio-shimmer {
  background: linear-gradient(90deg,#F5EDE3 25%,#EDD9C5 50%,#F5EDE3 75%);
  background-size: 800px 100%;
  animation: studio-shimmer 1.4s infinite linear;
}
`;

type StudioMode = "clothing" | "makeup" | "hair";
type GenStatus  = "idle" | "loading" | "done" | "error";
type PhotoMode  = "selfie" | "full";

interface Props {
  reportId: string;
  photoUrl: string;
  isPaid: boolean;
  colorAnalysis?: ColorAnalysisResult;
}

// ── Upload zone ───────────────────────────────────────────────────────────────
function UploadZone({ onFile, preview, disabled, label, hint }: {
  onFile: (f: File) => void;
  preview: string | null;
  disabled?: boolean;
  label: string;
  hint: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  return (
    <div
      role="button" tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => !disabled && e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) onFile(file);
      }}
      className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden"
      style={{
        minHeight: 180,
        background: dragging ? "rgba(200,169,110,0.10)" : "#FAF6F0",
        borderColor: dragging ? "#C8A96E" : "#E8DDD0",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {preview ? (
        <Image src={preview} alt={label} fill className="object-contain p-3" unoptimized />
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: "rgba(200,169,110,0.15)" }}>
            <Upload className="h-5 w-5" style={{ color: "#C8A96E" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "#3D2B1F" }}>{label}</p>
          <p className="text-xs leading-snug whitespace-pre-line" style={{ color: "#9C7D5B" }}>{hint}</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ── Shared Result Panel ───────────────────────────────────────────────────────
function ResultPanel({ url, status, onRetry, downloadName = "ai-beauty-studio.jpg" }: {
  url: string | null; status: GenStatus; onRetry: () => void; downloadName?: string;
}) {
  if (status === "loading") {
    return (
      <div className="studio-shimmer flex flex-col items-center justify-center rounded-2xl gap-3"
        style={{ minHeight: 260, border: "1px solid #E8DDD0" }}>
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#C8A96E" }} />
        <p className="text-sm font-medium" style={{ color: "#9C7D5B" }}>Generating your look…</p>
        <p className="text-xs" style={{ color: "#B8A898" }}>This takes ~30–60 seconds</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl p-8 text-center"
        style={{ minHeight: 260, background: "rgba(192,107,62,0.06)", border: "1px dashed rgba(192,107,62,0.3)" }}>
        <X className="h-8 w-8" style={{ color: "#C06B3E" }} />
        <p className="text-sm font-medium" style={{ color: "#3D2B1F" }}>Generation failed</p>
        <button onClick={onRetry}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all hover:opacity-80"
          style={{ background: "rgba(192,107,62,0.12)", color: "#C06B3E" }}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }
  if (status === "done" && url) {
    return (
      <div className="studio-result relative rounded-2xl overflow-hidden" style={{ minHeight: 260 }}>
        <Image src={url} alt="AI Studio result" width={480} height={480}
          className="w-full h-auto object-cover rounded-2xl" unoptimized />
        <div className="absolute bottom-3 right-3 flex gap-2">
          <a href={url} download={downloadName} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all hover:opacity-90"
            style={{ background: "rgba(61,43,31,0.75)", color: "#FAF6F0" }}>
            <Download className="h-3 w-3" /> Download
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl"
      style={{ minHeight: 260, background: "#FAF6F0", border: "1px dashed #E8DDD0" }}>
      <Sparkles className="h-8 w-8" style={{ color: "#C8A96E" }} />
      <p className="text-sm font-medium" style={{ color: "#9C7D5B" }}>Result will appear here</p>
    </div>
  );
}

// ── Generic styled dropdown ───────────────────────────────────────────────────
function StyledDropdown<T extends string>({
  label, value, options, onChange, disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hex?: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9C7D5B" }}>{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value as T)} disabled={disabled}
          className="w-full appearance-none rounded-xl px-3.5 py-2.5 text-sm font-medium cursor-pointer pr-8"
          style={{ background: "#F5EFE7", border: "1.5px solid #E0CEBC", color: "#3D2B1F" }}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: "#9C7D5B" }} />
      </div>
    </div>
  );
}

// ── HAIR constants ────────────────────────────────────────────────────────────
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

const HAIR_COLORS = [
  { value: "natural",         label: "Natural",          hex: "#6B3A2A", group: "Natural" },
  { value: "black",           label: "Black",            hex: "#0a0a0a", group: "Natural" },
  { value: "dark_brown",      label: "Dark Brown",       hex: "#3b2314", group: "Natural" },
  { value: "light_brown",     label: "Light Brown",      hex: "#9b6b4a", group: "Natural" },
  { value: "blonde",          label: "Blonde",           hex: "#e2b96f", group: "Natural" },
  { value: "platinum_blonde", label: "Platinum Blonde",  hex: "#f5e6c8", group: "Natural" },
  { value: "auburn",          label: "Auburn",           hex: "#7B3F2A", group: "Natural" },
  { value: "red",             label: "Red",              hex: "#B5481A", group: "Natural" },
  { value: "gray",            label: "Gray",             hex: "#9A9A9A", group: "Style" },
  { value: "silver",          label: "Silver",           hex: "#C8C8C8", group: "Style" },
  { value: "highlights",      label: "Highlights",       hex: "#D4A96A", group: "Style" },
  { value: "ombre",           label: "Ombre",            hex: "#8B5A2B", group: "Style" },
  { value: "balayage",        label: "Balayage",         hex: "#C49A6C", group: "Style" },
  { value: "blue",            label: "Blue",             hex: "#2E5FA3", group: "Fashion" },
  { value: "green",           label: "Green",            hex: "#2A8C8C", group: "Fashion" },
  { value: "purple",          label: "Purple",           hex: "#9B7CB6", group: "Fashion" },
  { value: "pink",            label: "Pink",             hex: "#D4748A", group: "Fashion" },
  { value: "rainbow",         label: "Rainbow",          hex: "#E8A040", group: "Fashion" },
] as const;
type HairColorValue = (typeof HAIR_COLORS)[number]["value"];

// ── Makeup style descriptions ─────────────────────────────────────────────────
const MAKEUP_DESCRIPTIONS: Record<MakeupStyleValue, string> = {
  natural:       "Light, everyday coverage. Enhances your features without looking overdone.",
  glamorous:     "Full glam with bold lips, defined eyes, and sculpted cheeks.",
  smoky_eyes:    "Dramatic smoky eyeshadow blended for depth; nude or soft lip.",
  bold_lips:     "Statement lip color with minimal eye makeup — clean and striking.",
  no_makeup:     "Skin-first look: even skin tone with a polished, no-makeup finish.",
  remove_makeup: "Simulates a clean, bare-faced look.",
  dramatic:      "High-contrast, editorial-style look with bold definition throughout.",
  bridal:        "Timeless bridal look: rosy blush, defined eyes, classic lip.",
  professional:  "Polished, neutral-toned look appropriate for a workplace setting.",
  korean_style:  "Dewy, glass-skin finish with gradient lips and puppy-eye liner.",
  artistic:      "Creative, expressive look with unique color placement.",
};

// ── History strip ─────────────────────────────────────────────────────────────
function HistoryStrip({ history, currentUrl, onSelect, onClear }: {
  history: string[]; currentUrl: string | null;
  onSelect: (url: string) => void; onClear: () => void;
}) {
  if (history.length === 0) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-5 py-3" style={{ borderTop: "1px solid #F0E8DF" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider shrink-0" style={{ color: "#B8A898" }}>History</p>
      {history.map((url, i) => (
        <button key={i} onClick={() => onSelect(url)}
          className="shrink-0 rounded-xl overflow-hidden transition-all hover:opacity-80"
          style={{ width: 52, height: 52, border: url === currentUrl ? "2px solid #C8A96E" : "2px solid #E8DDD0" }}>
          <Image src={url} alt={`Result ${i + 1}`} width={52} height={52} className="object-cover w-full h-full" unoptimized />
        </button>
      ))}
      <button onClick={onClear} className="shrink-0 text-[10px] transition-opacity hover:opacity-70 ml-1"
        style={{ color: "#C06B3E" }}>Clear</button>
    </div>
  );
}

// ── Mode tab button ───────────────────────────────────────────────────────────
function ModeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
      style={active
        ? { background: "linear-gradient(135deg,#C9956B,#E8C990)", color: "#3D2B1F", boxShadow: "0 1px 8px rgba(201,149,107,0.30)" }
        : { background: "transparent", color: "#9C7D5B" }}>
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════
export function AIBeautyStudio({ reportId, photoUrl, isPaid, colorAnalysis }: Props) {
  const [mode, setMode] = React.useState<StudioMode>("clothing");

  // ── Clothing state ──
  const [clothFile, setClothFile]           = React.useState<File | null>(null);
  const [clothPreview, setClothPreview]     = React.useState<string | null>(null);
  const [photoMode, setPhotoMode]           = React.useState<PhotoMode>("selfie");
  const [fullBodyFile, setFullBodyFile]     = React.useState<File | null>(null);
  const [fullBodyPreview, setFullBodyPreview] = React.useState<string | null>(null);

  // ── Makeup state ──
  const [mkStyle, setMkStyle]       = React.useState<MakeupStyleValue>("natural");
  const [mkIntensity, setMkIntensity] = React.useState<MakeupIntensityValue>("medium");

  // ── Hair state ──
  const [hairStyle, setHairStyle]   = React.useState<HairStyleValue>("No change");
  const [hairColor, setHairColor]   = React.useState<HairColorValue>("natural");

  // ── Shared result state (per mode) ──
  const [results, setResults]   = React.useState<Record<StudioMode, string | null>>({ clothing: null, makeup: null, hair: null });
  const [statuses, setStatuses] = React.useState<Record<StudioMode, GenStatus>>({ clothing: "idle", makeup: "idle", hair: "idle" });
  const [history, setHistory]   = React.useState<string[]>([]);

  const resultUrl = results[mode];
  const status    = statuses[mode];

  function setModeResult(m: StudioMode, url: string | null) {
    setResults((r) => ({ ...r, [m]: url }));
  }
  function setModeStatus(m: StudioMode, s: GenStatus) {
    setStatuses((r) => ({ ...r, [m]: s }));
  }

  // Cleanup blob URLs
  React.useEffect(() => () => {
    if (clothPreview?.startsWith("blob:")) URL.revokeObjectURL(clothPreview);
    if (fullBodyPreview?.startsWith("blob:")) URL.revokeObjectURL(fullBodyPreview);
  }, [clothPreview, fullBodyPreview]);

  // ── Clothing handlers ──
  function handleClothFile(f: File) {
    if (clothPreview?.startsWith("blob:")) URL.revokeObjectURL(clothPreview);
    setClothFile(f); setClothPreview(URL.createObjectURL(f));
    setModeResult("clothing", null); setModeStatus("clothing", "idle");
  }
  function clearGarment() {
    if (clothPreview?.startsWith("blob:")) URL.revokeObjectURL(clothPreview);
    setClothFile(null); setClothPreview(null);
    setModeResult("clothing", null); setModeStatus("clothing", "idle");
  }
  function handleFullBodyFile(f: File) {
    if (fullBodyPreview?.startsWith("blob:")) URL.revokeObjectURL(fullBodyPreview);
    setFullBodyFile(f); setFullBodyPreview(URL.createObjectURL(f));
    setModeResult("clothing", null); setModeStatus("clothing", "idle");
  }
  function clearFullBody() {
    if (fullBodyPreview?.startsWith("blob:")) URL.revokeObjectURL(fullBodyPreview);
    setFullBodyFile(null); setFullBodyPreview(null);
  }

  // ── Generate functions ──
  async function generateClothing() {
    if (!clothFile) return;
    setModeStatus("clothing", "loading"); setModeResult("clothing", null);
    try {
      const form = new FormData();
      form.append("clothImage", clothFile);
      if (photoMode === "full" && fullBodyFile) form.append("personImage", fullBodyFile);
      const res  = await fetch(`/api/reports/${reportId}/virtual-tryon`, { method: "POST", body: form });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Generation failed");
      setModeResult("clothing", json.url);
      setModeStatus("clothing", "done");
      setHistory((h) => [json.url!, ...h].slice(0, 10));
    } catch { setModeStatus("clothing", "error"); }
  }

  async function generateMakeup() {
    setModeStatus("makeup", "loading"); setModeResult("makeup", null);
    try {
      const res  = await fetch(`/api/reports/${reportId}/makeup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style: mkStyle, intensity: mkIntensity }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Generation failed");
      setModeResult("makeup", json.url);
      setModeStatus("makeup", "done");
      setHistory((h) => [json.url!, ...h].slice(0, 10));
    } catch { setModeStatus("makeup", "error"); }
  }

  async function generateHair() {
    setModeStatus("hair", "loading"); setModeResult("hair", null);
    try {
      const res  = await fetch(`/api/reports/${reportId}/hair-color`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorName: hairColor,
          styleName: hairStyle === "No change" ? undefined : hairStyle,
        }),
      });
      const json = await res.json() as { signedUrl?: string; error?: string };
      if (!res.ok || !json.signedUrl) throw new Error(json.error ?? "Generation failed");
      setModeResult("hair", json.signedUrl);
      setModeStatus("hair", "done");
      setHistory((h) => [json.signedUrl!, ...h].slice(0, 10));
    } catch { setModeStatus("hair", "error"); }
  }

  function retryCurrentMode() {
    if (mode === "clothing") generateClothing();
    else if (mode === "makeup") generateMakeup();
    else generateHair();
  }

  function switchMode(m: StudioMode) { setMode(m); }

  // ── Paywall ──
  if (!isPaid) {
    return (
      <div className="rounded-3xl p-10 text-center"
        style={{ background: "linear-gradient(145deg,rgba(18,18,26,0.95),rgba(26,26,38,0.9))", border: "1px solid rgba(201,149,107,0.18)" }}>
        <Lock className="h-10 w-10 mx-auto mb-4" style={{ color: "#C8A96E" }} />
        <p className="text-base font-semibold mb-2" style={{ color: "#E8C990" }}>AI Beauty Studio is a premium feature</p>
        <p className="text-sm" style={{ color: "#9C7D5B" }}>
          Unlock to try on outfits, apply makeup looks, and change your hair — all powered by AI.
        </p>
      </div>
    );
  }

  const currentHairColor = HAIR_COLORS.find((c) => c.value === hairColor);

  return (
    <>
      <style>{STUDIO_CSS}</style>
      <div className="rounded-3xl overflow-hidden"
        style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", boxShadow: "0 2px 24px rgba(61,43,31,0.06)" }}>

        {/* ── Header ── */}
        <div className="px-6 py-5 flex items-center gap-3"
          style={{ borderBottom: "1px solid #E8DDD0", background: "linear-gradient(135deg,rgba(200,169,110,0.08),rgba(232,221,208,0.12))" }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg,#C9956B,#E8C990)" }}>
            <Sparkles className="h-4 w-4" style={{ color: "#3D2B1F" }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: "#3D2B1F" }}>AI Beauty Studio</h2>
            <p className="text-xs" style={{ color: "#9C7D5B" }}>Try on clothing, makeup &amp; hair — generate &amp; download instantly</p>
          </div>
        </div>

        {/* ── Mode tabs ── */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-1 rounded-2xl p-1" style={{ background: "#F0E8DF" }}>
            <ModeTab label="👗 Clothing" active={mode === "clothing"} onClick={() => switchMode("clothing")} />
            <ModeTab label="💄 Makeup"   active={mode === "makeup"}   onClick={() => switchMode("makeup")} />
            <ModeTab label="💇 Hair"     active={mode === "hair"}     onClick={() => switchMode("hair")} />
          </div>
        </div>

        {/* ── CLOTHING mode ── */}
        {mode === "clothing" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {/* Left: person */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "#F0E8DF" }}>
                <button onClick={() => { setPhotoMode("selfie"); setModeResult("clothing", null); setModeStatus("clothing", "idle"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all"
                  style={photoMode === "selfie"
                    ? { background: "#FDFAF6", color: "#3D2B1F", boxShadow: "0 1px 4px rgba(61,43,31,0.12)" }
                    : { background: "transparent", color: "#9C7D5B" }}>
                  <Sparkles className="h-3.5 w-3.5" /> My Selfie
                </button>
                <button onClick={() => { setPhotoMode("full"); setModeResult("clothing", null); setModeStatus("clothing", "idle"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all"
                  style={photoMode === "full"
                    ? { background: "#FDFAF6", color: "#3D2B1F", boxShadow: "0 1px 4px rgba(61,43,31,0.12)" }
                    : { background: "transparent", color: "#9C7D5B" }}>
                  <UserRound className="h-3.5 w-3.5" /> Full Body ✦
                </button>
              </div>

              {photoMode === "selfie" ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Your Photo</p>
                  <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                    <Image src={photoUrl} alt="Your photo" fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)" }}>
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#C8A96E" }} />
                    <p className="text-[11px] leading-snug" style={{ color: "#9C7D5B" }}>
                      For better draping, switch to <strong>Full Body</strong> and upload a standing photo.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Full Body Photo</p>
                    {fullBodyFile && (
                      <button onClick={clearFullBody} className="flex items-center gap-1 text-xs hover:opacity-70" style={{ color: "#C06B3E" }}>
                        <X className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </div>
                  <UploadZone onFile={handleFullBodyFile} preview={fullBodyPreview} disabled={status === "loading"}
                    label="Upload full-body photo" hint={"Standing, front-facing · plain background\nJPG / PNG / WEBP · max 10 MB"} />
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(123,160,91,0.08)", border: "1px solid rgba(123,160,91,0.2)" }}>
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#7BA05B" }} />
                    <p className="text-[11px] leading-snug" style={{ color: "#7BA05B" }}>
                      Full-body photos give significantly more accurate garment draping results.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Right: garment + generate */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Garment</p>
                {clothFile && (
                  <button onClick={clearGarment} className="flex items-center gap-1 text-xs hover:opacity-70" style={{ color: "#C06B3E" }}>
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              <UploadZone onFile={handleClothFile} preview={clothPreview} disabled={status === "loading"}
                label="Upload garment photo" hint={"Drag & drop or click\nJPG / PNG / WEBP · max 10 MB"} />
              <button onClick={generateClothing}
                disabled={!clothFile || status === "loading" || (photoMode === "full" && !fullBodyFile)}
                className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#C9956B,#E8C990)", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(201,149,107,0.35)" }}>
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="h-4 w-4" /> Try It On</>}
              </button>
              {photoMode === "full" && !fullBodyFile && (
                <p className="text-center text-[11px]" style={{ color: "#C06B3E" }}>
                  Please upload a full-body photo to continue
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── MAKEUP mode ── */}
        {mode === "makeup" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5">
            {/* Left: controls */}
            <div className="flex flex-col gap-4">
              <StyledDropdown
                label="Makeup Style" value={mkStyle}
                options={MAKEUP_STYLES.map((v) => ({ value: v, label: MAKEUP_STYLE_LABELS[v] }))}
                onChange={(v) => { setMkStyle(v); setModeResult("makeup", null); setModeStatus("makeup", "idle"); }}
                disabled={status === "loading"}
              />
              <StyledDropdown
                label="Intensity" value={mkIntensity}
                options={MAKEUP_INTENSITIES.map((v) => ({ value: v, label: MAKEUP_INTENSITY_LABELS[v] }))}
                onChange={(v) => { setMkIntensity(v); setModeResult("makeup", null); setModeStatus("makeup", "idle"); }}
                disabled={status === "loading"}
              />
              <p className="text-xs leading-relaxed" style={{ color: "#9C7D5B" }}>
                {MAKEUP_DESCRIPTIONS[mkStyle]}
              </p>
              {colorAnalysis && colorAnalysis.palette.length > 0 && (
                <div className="flex items-center gap-2">
                  <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#B8A898" }}>Palette</p>
                  {colorAnalysis.palette.slice(0, 5).map((c) => (
                    <span key={c.hex} title={c.name}
                      className="h-5 w-5 rounded-full border-2 border-white shadow-sm"
                      style={{ background: c.hex }} />
                  ))}
                  <span className="text-[10px]" style={{ color: "#B8A898" }}>{colorAnalysis.season}</span>
                </div>
              )}
              <button onClick={generateMakeup} disabled={status === "loading"}
                className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#C9956B,#E8C990)", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(201,149,107,0.35)" }}>
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="h-4 w-4" /> Apply Makeup</>}
              </button>
            </div>
            {/* Right: your photo preview + result */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Your Photo</p>
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                <Image src={photoUrl} alt="Your photo" fill className="object-cover" unoptimized />
              </div>
            </div>
          </div>
        )}

        {/* ── HAIR mode ── */}
        {mode === "hair" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5">
            {/* Left: controls */}
            <div className="flex flex-col gap-4">
              <StyledDropdown
                label="Target Hairstyle" value={hairStyle}
                options={HAIR_STYLES.map((s) => ({ value: s.value, label: s.label }))}
                onChange={(v) => { setHairStyle(v); setModeResult("hair", null); setModeStatus("hair", "idle"); }}
                disabled={status === "loading"}
              />
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Hair Color</p>
                {/* Swatch grid */}
                <div className="flex flex-wrap gap-2">
                  {HAIR_COLORS.map((c) => (
                    <button key={c.value} type="button" title={c.label}
                      onClick={() => { setHairColor(c.value); setModeResult("hair", null); setModeStatus("hair", "idle"); }}
                      disabled={status === "loading"}
                      className="flex flex-col items-center gap-0.5 transition-transform hover:scale-110 focus:outline-none disabled:opacity-40">
                      <div className="h-8 w-8 rounded-full transition-all"
                        style={{
                          backgroundColor: c.hex,
                          border: hairColor === c.value ? "3px solid #C9956B" : "2px solid rgba(0,0,0,0.12)",
                          boxShadow: hairColor === c.value ? "0 0 0 2px #FDFAF6, 0 0 0 4px #C9956B" : "0 1px 3px rgba(0,0,0,0.15)",
                        }} />
                      <span className="text-[7px] leading-tight max-w-[32px] text-center"
                        style={{ color: hairColor === c.value ? "#C9956B" : "#B8A898" }}>
                        {c.label.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
                {currentHairColor && (
                  <p className="text-xs" style={{ color: "#9C7D5B" }}>
                    Selected: <strong>{currentHairColor.label}</strong>
                    {hairStyle !== "No change" ? ` + ${HAIR_STYLES.find((s) => s.value === hairStyle)?.label}` : ""}
                  </p>
                )}
              </div>
              <button onClick={generateHair} disabled={status === "loading"}
                className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#C9956B,#E8C990)", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(201,149,107,0.35)" }}>
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="h-4 w-4" /> Try Hair Look</>}
              </button>
            </div>
            {/* Right: your photo */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Your Photo</p>
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                <Image src={photoUrl} alt="Your photo" fill className="object-cover" unoptimized />
              </div>
            </div>
          </div>
        )}

        {/* ── Shared Result ── */}
        <div className="px-5 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9C7D5B" }}>Result</p>
          <ResultPanel
            url={resultUrl}
            status={status}
            onRetry={retryCurrentMode}
            downloadName={`ai-studio-${mode}.jpg`}
          />
        </div>

        {/* ── History strip ── */}
        <HistoryStrip
          history={history}
          currentUrl={resultUrl}
          onSelect={(url) => { setModeResult(mode, url); setModeStatus(mode, "done"); }}
          onClear={() => setHistory([])}
        />

        {/* ── Tips footer ── */}
        <div className="px-5 py-4 flex flex-wrap gap-x-6 gap-y-1"
          style={{ borderTop: "1px solid #F0E8DF", background: "rgba(200,169,110,0.04)" }}>
          {mode === "clothing" && [
            "Full-body standing photo gives the best draping results",
            "Use a flat-lay or mannequin photo for the garment",
            "Plain background improves AI accuracy",
          ].map((tip) => (
            <p key={tip} className="text-[11px]" style={{ color: "#B8A898" }}>✦ {tip}</p>
          ))}
          {mode === "makeup" && [
            "Face forward, neutral expression gives the best results",
            "Good lighting helps the AI read your features accurately",
            "Try multiple styles and download your favourites",
          ].map((tip) => (
            <p key={tip} className="text-[11px]" style={{ color: "#B8A898" }}>✦ {tip}</p>
          ))}
          {mode === "hair" && [
            "Front-facing, hair-visible photo works best",
            "Natural lighting gives the most realistic color output",
            "Try different colors with the same style to compare",
          ].map((tip) => (
            <p key={tip} className="text-[11px]" style={{ color: "#B8A898" }}>✦ {tip}</p>
          ))}
        </div>
      </div>
    </>
  );
}
