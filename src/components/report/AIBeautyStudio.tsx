"use client";

import * as React from "react";
import Image from "next/image";
import {
  Sparkles, Upload, Wand2, Loader2, RefreshCw, ShoppingBag,
  X, History, UserRound, Info, Download, ChevronDown, Lock,
} from "lucide-react";
import type { ColorAnalysisResult, StudioEntitlement } from "@/types/report";
import {
  LIP_COLORS, EYESHADOW_PALETTES, BLUSH_COLORS, BLUSH_INTENSITIES,
  FOUNDATION_SHADES, EYELINER_STYLES,
  type LipColorValue, type EyeshadowValue, type BlushColorValue,
  type BlushIntensityValue, type FoundationShadeValue, type EyelinerStyleValue,
  type MakeupGranularControls,
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

type GeneratedAssetMeta = {
  id: string;
  createdAt: string;
};

type HistoryItem = {
  url: string;
  assetId?: string | null;
  createdAt?: string | null;
};

type VaultItem = {
  id: string;
  reportId: string;
  tool: "virtual_tryon" | "makeup" | "hair";
  imageUrl: string | null;
  createdAt: string;
};

interface Props {
  reportId: string;
  photoUrl: string;
  isPaid: boolean;
  studioEntitlement?: StudioEntitlement;
  colorAnalysis?: ColorAnalysisResult;
  initialSourceAssetId?: string | null;
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

// ── History strip ─────────────────────────────────────────────────────────────
function HistoryStrip({ history, currentUrl, onSelect, onClear }: {
  history: HistoryItem[]; currentUrl: string | null;
  onSelect: (item: HistoryItem) => void; onClear: () => void;
}) {
  if (history.length === 0) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-5 py-3" style={{ borderTop: "1px solid #F0E8DF" }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider shrink-0" style={{ color: "#B8A898" }}>History</p>
      {history.map((item, i) => (
        <button key={i} onClick={() => onSelect(item)}
          className="shrink-0 rounded-xl overflow-hidden transition-all hover:opacity-80"
          style={{ width: 52, height: 52, border: item.url === currentUrl ? "2px solid #C8A96E" : "2px solid #E8DDD0" }}>
          <Image src={item.url} alt={`Result ${i + 1}`} width={52} height={52} className="object-cover w-full h-full" unoptimized />
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
        ? { background: "linear-gradient(135deg,#EC4899,#8B5CF6)", color: "#3D2B1F", boxShadow: "0 1px 8px rgba(201,149,107,0.30)" }
        : { background: "transparent", color: "#9C7D5B" }}>
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════
export function AIBeautyStudio({
  reportId,
  photoUrl,
  isPaid,
  studioEntitlement,
  colorAnalysis,
  initialSourceAssetId = null,
}: Props) {
  const [mode, setMode] = React.useState<StudioMode>("clothing");

  // ── Clothing state ──
  const [clothFile, setClothFile]           = React.useState<File | null>(null);
  const [clothPreview, setClothPreview]     = React.useState<string | null>(null);
  const [photoMode, setPhotoMode]           = React.useState<PhotoMode>("selfie");
  const [fullBodyFile, setFullBodyFile]     = React.useState<File | null>(null);
  const [fullBodyPreview, setFullBodyPreview] = React.useState<string | null>(null);

  // ── Makeup state (granular controls) ──
  const [mkLip, setMkLip]               = React.useState<LipColorValue>("nude_beige");
  const [mkEye, setMkEye]               = React.useState<EyeshadowValue>("neutral");
  const [mkBlush, setMkBlush]           = React.useState<BlushColorValue>("peach");
  const [mkBlushInt, setMkBlushInt]     = React.useState<BlushIntensityValue>("soft");
  const [mkFoundation, setMkFoundation] = React.useState<FoundationShadeValue>("medium");
  const [mkContour, setMkContour]       = React.useState(false);
  const [mkEyeliner, setMkEyeliner]     = React.useState<EyelinerStyleValue>("classic");

  function resetMakeupResult() { setModeResult("makeup", null); setModeStatus("makeup", "idle"); }

  // ── Hair state ──
  const [hairStyle, setHairStyle]   = React.useState<HairStyleValue>("No change");
  const [hairColor, setHairColor]   = React.useState<HairColorValue>("natural");

  // ── Shared result state (per mode) ──
  const [results, setResults]   = React.useState<Record<StudioMode, string | null>>({ clothing: null, makeup: null, hair: null });
  const [statuses, setStatuses] = React.useState<Record<StudioMode, GenStatus>>({ clothing: "idle", makeup: "idle", hair: "idle" });
  const [history, setHistory]   = React.useState<HistoryItem[]>([]);
  const [vault, setVault]       = React.useState<VaultItem[]>([]);
  const [vaultLoading, setVaultLoading] = React.useState(false);
  const [sourceAssetId, setSourceAssetId] = React.useState<string | null>(initialSourceAssetId);
  const [sourcePreviewUrl, setSourcePreviewUrl] = React.useState<string | null>(null);

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

  const loadVault = React.useCallback(async () => {
    setVaultLoading(true);
    try {
      const res = await fetch(`/api/vault/images?limit=36&reportId=${reportId}`);
      if (!res.ok) return;
      const json = await res.json() as { items?: VaultItem[] };
      const items = (json.items ?? []).filter((it) => !!it.imageUrl);
      setVault(items);

      if (sourceAssetId) {
        const selected = items.find((item) => item.id === sourceAssetId);
        if (selected?.imageUrl) {
          setSourcePreviewUrl(selected.imageUrl);
        }
      }

      if (!sourceAssetId && items.length > 0 && items[0].imageUrl) {
        setSourceAssetId(items[0].id);
        setSourcePreviewUrl(items[0].imageUrl);
      }
    } catch {
      // Silent fail keeps studio usable even if vault endpoint is unavailable.
    } finally {
      setVaultLoading(false);
    }
  }, [reportId, sourceAssetId]);

  React.useEffect(() => {
    if (!isPaid) return;
    void loadVault();
  }, [isPaid, loadVault]);

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
      if (sourceAssetId) form.append("sourceAssetId", sourceAssetId);
      const res  = await fetch(`/api/reports/${reportId}/virtual-tryon`, { method: "POST", body: form });
      const json = await res.json() as { url?: string; error?: string; asset?: GeneratedAssetMeta | null };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Generation failed");
      setModeResult("clothing", json.url);
      setModeStatus("clothing", "done");
      setHistory((h) => [{ url: json.url!, assetId: json.asset?.id ?? null, createdAt: json.asset?.createdAt ?? null }, ...h].slice(0, 10));
      if (json.asset?.id) {
        setSourceAssetId(json.asset.id);
        setSourcePreviewUrl(json.url);
      }
      void loadVault();
    } catch { setModeStatus("clothing", "error"); }
  }

  async function generateMakeup() {
    setModeStatus("makeup", "loading"); setModeResult("makeup", null);
    const controls: MakeupGranularControls = {
      lipColor:       mkLip,
      eyeshadow:      mkEye,
      blushColor:     mkBlush,
      blushIntensity: mkBlushInt,
      foundation:     mkFoundation,
      contour:        mkContour,
      eyeliner:       mkEyeliner,
    };
    try {
      const res  = await fetch(`/api/reports/${reportId}/makeup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...controls, sourceAssetId }),
      });
      const json = await res.json() as { url?: string; error?: string; asset?: GeneratedAssetMeta | null };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Generation failed");
      setModeResult("makeup", json.url);
      setModeStatus("makeup", "done");
      setHistory((h) => [{ url: json.url!, assetId: json.asset?.id ?? null, createdAt: json.asset?.createdAt ?? null }, ...h].slice(0, 10));
      if (json.asset?.id) {
        setSourceAssetId(json.asset.id);
        setSourcePreviewUrl(json.url);
      }
      void loadVault();
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
          sourceAssetId,
        }),
      });
      const json = await res.json() as { signedUrl?: string; error?: string; asset?: GeneratedAssetMeta | null };
      if (!res.ok || !json.signedUrl) throw new Error(json.error ?? "Generation failed");
      setModeResult("hair", json.signedUrl);
      setModeStatus("hair", "done");
      setHistory((h) => [{ url: json.signedUrl!, assetId: json.asset?.id ?? null, createdAt: json.asset?.createdAt ?? null }, ...h].slice(0, 10));
      if (json.asset?.id) {
        setSourceAssetId(json.asset.id);
        setSourcePreviewUrl(json.signedUrl);
      }
      void loadVault();
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
        style={{ background: "linear-gradient(145deg, rgba(255,247,251,0.98), rgba(251,231,242,0.92))", border: "1px solid rgba(201,149,107,0.18)" }}>
        <Lock className="h-10 w-10 mx-auto mb-4" style={{ color: "#C8A96E" }} />
        <p className="text-base font-semibold mb-2" style={{ color: "#F9A8D4" }}>AI Beauty Studio is a premium feature</p>
        <p className="text-sm" style={{ color: "#9C7D5B" }}>
          Unlock to try on outfits, apply makeup looks, and change your hair — all powered by AI.
        </p>
      </div>
    );
  }

  // ── Studio Pro quota badge ──
  const isStudioPro = studioEntitlement?.tier === "studio_pro";
  const remainingGens = studioEntitlement?.remainingGens ?? null;
  const usedGens = studioEntitlement?.usedGens ?? null;
  const cap = studioEntitlement?.cap ?? 150;
  const periodResets = studioEntitlement?.periodResets
    ? new Date(studioEntitlement.periodResets).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;
  const isNearLimit = remainingGens !== null && remainingGens <= 20;
  const isAtLimit = remainingGens !== null && remainingGens <= 0;
  const effectiveSourcePhoto = sourcePreviewUrl ?? photoUrl;
  const selectedVaultItem = sourceAssetId ? vault.find((v) => v.id === sourceAssetId) : undefined;

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
            style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)" }}>
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

        {/* ── Studio Pro quota banner ── */}
        {isStudioPro && remainingGens !== null && (
          <div className="mx-5 mt-2 rounded-xl px-4 py-2.5 flex items-center justify-between"
            style={{
              background: isAtLimit
                ? "rgba(239,68,68,0.08)"
                : isNearLimit
                  ? "rgba(245,158,11,0.08)"
                  : "rgba(201,149,107,0.07)",
              border: `1px solid ${isAtLimit ? "rgba(239,68,68,0.25)" : isNearLimit ? "rgba(245,158,11,0.25)" : "rgba(201,149,107,0.2)"}`,
            }}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: isAtLimit ? "#EF4444" : isNearLimit ? "#F59E0B" : "#C8A96E" }} />
              <span className="text-xs font-medium" style={{ color: isAtLimit ? "#EF4444" : isNearLimit ? "#B45309" : "#7C5A3A" }}>
                {isAtLimit
                  ? `Monthly limit reached — resets ${periodResets ?? "next month"}`
                  : `${remainingGens} of ${cap} Studio generations left this month`}
              </span>
            </div>
            {!isAtLimit && usedGens !== null && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ width: 60, background: "rgba(0,0,0,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((usedGens / cap) * 100)}%`,
                      background: isNearLimit ? "#F59E0B" : "#C8A96E",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Reusable source selector ── */}
        <div className="mx-5 mt-3 rounded-2xl px-4 py-3" style={{ background: "rgba(123,110,158,0.06)", border: "1px solid rgba(123,110,158,0.18)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9C7D5B" }}>Source for next generation</p>
              <p className="text-[11px]" style={{ color: "#7C5A3A" }}>
                {sourceAssetId
                  ? `Using generated image from ${selectedVaultItem ? new Date(selectedVaultItem.createdAt).toLocaleString("en-IN") : "vault"}`
                  : "Using original selfie"}
              </p>
            </div>
            <button
              onClick={() => { setSourceAssetId(null); setSourcePreviewUrl(null); }}
              className="rounded-full px-3 py-1.5 text-[11px] font-medium"
              style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(201,149,107,0.3)", color: "#7C5A3A" }}
            >
              Use original
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2 overflow-x-auto">
            {vaultLoading ? (
              <p className="text-[11px]" style={{ color: "#B8A898" }}>Loading vault…</p>
            ) : vault.length === 0 ? (
              <p className="text-[11px]" style={{ color: "#B8A898" }}>No generated images yet.</p>
            ) : (
              vault.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSourceAssetId(item.id);
                    setSourcePreviewUrl(item.imageUrl);
                  }}
                  className="shrink-0 rounded-xl overflow-hidden"
                  style={{ border: sourceAssetId === item.id ? "2px solid #8B5CF6" : "2px solid #E8DDD0", width: 56, height: 56 }}
                  title={`${item.tool} • ${new Date(item.createdAt).toLocaleString("en-IN")}`}
                >
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt="Vault source" width={56} height={56} className="h-full w-full object-cover" unoptimized />
                  ) : null}
                </button>
              ))
            )}
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
                    <Image src={effectiveSourcePhoto} alt="Your photo" fill className="object-cover" unoptimized />
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
                style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(201,149,107,0.35)" }}>
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
          <div className="flex flex-col sm:grid sm:grid-cols-[1fr_220px] gap-0">

            {/* ── Left: scrollable controls ── */}
            <div className="flex flex-col gap-5 p-5 sm:overflow-y-auto sm:max-h-[640px]"
              style={{ borderRight: "1px solid #F0E8DF" }}>

              {/* Lip Colour */}
              <section className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9C7D5B" }}>Lip Colour</p>
                <div className="flex flex-wrap gap-2.5">
                  {LIP_COLORS.map((c) => (
                    <button key={c.value} title={c.label}
                      onClick={() => { setMkLip(c.value); resetMakeupResult(); }}
                      disabled={status === "loading"}
                      className="h-8 w-8 rounded-full transition-transform hover:scale-110 focus:outline-none disabled:opacity-40 shrink-0"
                      style={{
                        background: c.hex,
                        border: mkLip === c.value ? "3px solid #EC4899" : "2px solid rgba(0,0,0,0.12)",
                        boxShadow: mkLip === c.value ? "0 0 0 2px #FDFAF6, 0 0 0 4px #EC4899" : "0 1px 3px rgba(0,0,0,0.18)",
                      }} />
                  ))}
                </div>
                <p className="text-[11px] font-medium" style={{ color: "#EC4899" }}>
                  {LIP_COLORS.find((c) => c.value === mkLip)?.label ?? "—"}
                </p>
              </section>

              {/* Eyeshadow Palette */}
              <section className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9C7D5B" }}>Eyeshadow Palette</p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
                  {EYESHADOW_PALETTES.map((e) => (
                    <button key={e.value} title={e.description}
                      onClick={() => { setMkEye(e.value); resetMakeupResult(); }}
                      disabled={status === "loading"}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium transition-all hover:opacity-80 disabled:opacity-40 w-full"
                      style={{
                        background: mkEye === e.value ? "linear-gradient(135deg,#EC4899,#8B5CF6)" : "#F5EDE4",
                        color: mkEye === e.value ? "#3D2B1F" : "#6B5344",
                        border: mkEye === e.value ? "1.5px solid transparent" : "1.5px solid #E0CEBC",
                      }}>
                      <span className="flex gap-0.5 shrink-0">
                        {e.swatches.length > 0
                          ? e.swatches.map((h) => (
                              <span key={h} className="h-3.5 w-3.5 rounded-full" style={{ background: h }} />
                            ))
                          : <span className="h-3.5 w-3.5 rounded-full" style={{ background: "#E0CEBC" }} />}
                      </span>
                      <span className="truncate text-left">{e.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Blush */}
              <section className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9C7D5B" }}>Blush</p>
                <div className="flex flex-wrap gap-3">
                  {BLUSH_COLORS.map((b) => (
                    <button key={b.value} title={b.label}
                      onClick={() => { setMkBlush(b.value); resetMakeupResult(); }}
                      disabled={status === "loading"}
                      className="flex flex-col items-center gap-1 transition-transform hover:scale-110 focus:outline-none disabled:opacity-40">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center"
                        style={{
                          background: b.hex || "#E8DDD0",
                          border: mkBlush === b.value ? "3px solid #EC4899" : "2px solid rgba(0,0,0,0.08)",
                          boxShadow: mkBlush === b.value ? "0 0 0 2px #FDFAF6, 0 0 0 4px #EC4899" : "0 1px 3px rgba(0,0,0,0.12)",
                        }}>
                        {!b.hex && <span className="text-[8px]" style={{ color: "#9C7D5B" }}>✕</span>}
                      </div>
                      <span className="text-[9px] text-center w-10 leading-tight"
                        style={{ color: mkBlush === b.value ? "#EC4899" : "#9C7D5B" }}>
                        {b.label}
                      </span>
                    </button>
                  ))}
                </div>
                {mkBlush !== "no_blush" && (
                  <div className="grid grid-cols-4 gap-1.5 mt-0.5">
                    {BLUSH_INTENSITIES.map((b) => (
                      <button key={b.value}
                        onClick={() => { setMkBlushInt(b.value); resetMakeupResult(); }}
                        disabled={status === "loading"}
                        className="rounded-lg py-1.5 text-[10px] font-semibold transition-all disabled:opacity-40"
                        style={{
                          background: mkBlushInt === b.value ? "linear-gradient(135deg,#EC4899,#8B5CF6)" : "#F5EDE4",
                          color: mkBlushInt === b.value ? "#3D2B1F" : "#9C7D5B",
                          border: mkBlushInt === b.value ? "none" : "1px solid #E0CEBC",
                        }}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Foundation Shade */}
              <section className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9C7D5B" }}>Foundation Shade</p>
                <div className="flex flex-wrap gap-3">
                  {FOUNDATION_SHADES.map((f) => (
                    <button key={f.value} title={f.label}
                      onClick={() => { setMkFoundation(f.value); resetMakeupResult(); }}
                      disabled={status === "loading"}
                      className="flex flex-col items-center gap-1 transition-transform hover:scale-110 focus:outline-none disabled:opacity-40">
                      <div className="h-8 w-8 rounded-full"
                        style={{
                          background: f.hex,
                          border: mkFoundation === f.value ? "3px solid #EC4899" : "2px solid rgba(0,0,0,0.08)",
                          boxShadow: mkFoundation === f.value ? "0 0 0 2px #FDFAF6, 0 0 0 4px #EC4899" : "0 1px 3px rgba(0,0,0,0.12)",
                        }} />
                      <span className="text-[9px] text-center w-10 leading-tight"
                        style={{ color: mkFoundation === f.value ? "#EC4899" : "#9C7D5B" }}>
                        {f.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Contour toggle */}
              <section>
                <div className="flex items-center gap-4 rounded-xl px-4 py-3"
                  style={{ background: "#F5EDE4", border: "1.5px solid #E0CEBC" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: "#3D2B1F" }}>Contour &amp; Highlight</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#9C7D5B" }}>Sculpt cheekbones and nose bridge</p>
                  </div>
                  <button
                    onClick={() => { setMkContour((v) => !v); resetMakeupResult(); }}
                    disabled={status === "loading"}
                    className="relative shrink-0 h-6 w-11 rounded-full transition-colors disabled:opacity-40"
                    style={{ background: mkContour ? "linear-gradient(135deg,#EC4899,#8B5CF6)" : "#D8CEC4" }}
                  >
                    <span
                      className="absolute inset-y-0 my-auto h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
                      style={{ transform: mkContour ? "translateX(22px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>
              </section>

              {/* Eyeliner Style */}
              <section className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9C7D5B" }}>Eyeliner Style</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {EYELINER_STYLES.map((l) => (
                    <button key={l.value} title={l.description}
                      onClick={() => { setMkEyeliner(l.value); resetMakeupResult(); }}
                      disabled={status === "loading"}
                      className="rounded-xl py-2.5 px-2 text-[11px] font-semibold text-center transition-all disabled:opacity-40"
                      style={{
                        background: mkEyeliner === l.value ? "linear-gradient(135deg,#EC4899,#8B5CF6)" : "#F5EDE4",
                        color: mkEyeliner === l.value ? "#3D2B1F" : "#6B5344",
                        border: mkEyeliner === l.value ? "1.5px solid transparent" : "1.5px solid #E0CEBC",
                      }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Generate button */}
              <button onClick={generateMakeup} disabled={status === "loading"}
                className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(201,149,107,0.35)" }}>
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="h-4 w-4" /> Apply Makeup</>}
              </button>
            </div>

            {/* ── Right: sticky photo + season hint ── */}
            <div className="flex flex-col gap-3 p-5 sm:sticky sm:top-0 sm:self-start">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9C7D5B" }}>Your Photo</p>
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                <Image src={effectiveSourcePhoto} alt="Your photo" fill className="object-cover" unoptimized />
              </div>
              {colorAnalysis && colorAnalysis.palette.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl px-3 py-2"
                  style={{ background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)" }}>
                  <p className="text-[9px] uppercase tracking-wider font-bold shrink-0" style={{ color: "#B8A898" }}>
                    {colorAnalysis.season}
                  </p>
                  {colorAnalysis.palette.slice(0, 5).map((c) => (
                    <span key={c.hex} title={c.name}
                      className="h-4 w-4 rounded-full border border-white shadow-sm shrink-0"
                      style={{ background: c.hex }} />
                  ))}
                </div>
              )}
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
                          border: hairColor === c.value ? "3px solid #EC4899" : "2px solid rgba(0,0,0,0.12)",
                          boxShadow: hairColor === c.value ? "0 0 0 2px #FDFAF6, 0 0 0 4px #EC4899" : "0 1px 3px rgba(0,0,0,0.15)",
                        }} />
                      <span className="text-[7px] leading-tight max-w-[32px] text-center"
                        style={{ color: hairColor === c.value ? "#EC4899" : "#B8A898" }}>
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
                style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(201,149,107,0.35)" }}>
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="h-4 w-4" /> Try Hair Look</>}
              </button>
            </div>
            {/* Right: your photo */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Your Photo</p>
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                <Image src={effectiveSourcePhoto} alt="Your photo" fill className="object-cover" unoptimized />
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
          onSelect={(item) => {
            setModeResult(mode, item.url);
            setModeStatus(mode, "done");
            if (item.assetId) {
              setSourceAssetId(item.assetId);
              setSourcePreviewUrl(item.url);
            }
          }}
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
