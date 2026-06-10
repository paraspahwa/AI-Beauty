"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles, Upload, Wand2, Loader2, RefreshCw, ShoppingBag,
  X, History, UserRound, Info, Download, ChevronDown, Lock, Undo2, Redo2, Camera, VideoOff,
} from "lucide-react";
import type { ColorAnalysisResult, StudioEntitlement } from "@/types/report";
import {
  LIP_COLORS, EYESHADOW_PALETTES, BLUSH_COLORS, BLUSH_INTENSITIES,
  FOUNDATION_SHADES, EYELINER_STYLES,
  type LipColorValue, type EyeshadowValue, type BlushColorValue,
  type BlushIntensityValue, type FoundationShadeValue, type EyelinerStyleValue,
  type MakeupGranularControls,
  deriveStyle,
} from "@/lib/makeup-options";
import {
  HAIR_STYLE_OPTIONS,
  type HairGender,
  type HairStyleValue,
  getHairStyleOptionsForGender,
} from "@/lib/hair-options";
import { track } from "@/lib/track";
import { formatApiError } from "@/lib/api-errors";
import { STUDIO_EXPERIENCES } from "@/lib/product-copy";
import { BeforeAfterReveal } from "@/components/BeforeAfterReveal";
import { TryTheseNext, type TryNextPreset } from "@/components/TryTheseNext";
import { StyleMomentShare } from "@/components/StyleMomentShare";
import { PRODUCT_COPY } from "@/lib/product-copy";

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

type StudioMode = "clothing" | "makeup" | "hair" | "ar" | "outfit";
type GenStatus  = "idle" | "loading" | "done" | "error";
type PhotoMode  = "selfie" | "full";
type CameraStatus = "idle" | "requesting" | "ready" | "blocked" | "error";
type FaceBox = { x: number; y: number; width: number; height: number };


type GeneratedAssetMeta = {
  id: string;
  createdAt: string;
};

type BatchResult = {
  hdUrl: string | null;
  lowResUrl: string | null;
  assetId: string | null;
  status: GenStatus;
  params: Record<string, any>; // parameters used for generation
};

type HistoryItem = {
  url: string;
  assetId?: string | null;
  createdAt?: string | null;
};

type OutfitOccasion = "casual" | "work" | "date" | "wedding" | "travel";
type OutfitVibe = "minimal" | "classic" | "bold" | "romantic" | "street";
type OutfitLook = {
  title: string;
  pieces: string[];
  accentColors: { name: string; hex: string }[];
  metal: string;
  whyItWorks: string;
};

type OutfitSession = {
  id: string;
  createdAt: string;
  occasion: OutfitOccasion;
  vibe: OutfitVibe;
  season: string;
  undertone: string;
  looks: OutfitLook[];
  feedback?: {
    liked: boolean;
    saved: boolean;
    worn: boolean;
  };
};

type MakeupPreset = {
  id: string;
  label: string;
  caption: string;
  controls: Partial<MakeupGranularControls>;
};

type HairPreset = {
  id: string;
  label: string;
  caption: string;
  style: string;
  color: string;
};

type OutfitPreset = {
  id: string;
  label: string;
  caption: string;
  occasion: OutfitOccasion;
  vibe: OutfitVibe;
};

const MAKEUP_PRESETS: MakeupPreset[] = [
  {
    id: "everyday-glow",
    label: "Everyday Glow",
    caption: "Soft pink, neutral eyes, fresh skin",
    controls: {
      lipColor: "soft_pink",
      eyeshadow: "neutral",
      blushColor: "peach",
      blushIntensity: "soft",
      contour: false,
      eyeliner: "subtle",
    },
  },
  {
    id: "soft-glam",
    label: "Soft Glam",
    caption: "Rose lips, bronze eyes, polished finish",
    controls: {
      lipColor: "rose",
      eyeshadow: "bronze",
      blushColor: "rose",
      blushIntensity: "medium",
      contour: true,
      eyeliner: "classic",
    },
  },
  {
    id: "date-night",
    label: "Date Night",
    caption: "Berry lips with more lift and definition",
    controls: {
      lipColor: "berry",
      eyeshadow: "pink_rose",
      blushColor: "rose",
      blushIntensity: "flushed",
      contour: true,
      eyeliner: "winged",
    },
  },
  {
    id: "bold-statement",
    label: "Bold Statement",
    caption: "Classic red lips and smoky eyes",
    controls: {
      lipColor: "classic_red",
      eyeshadow: "smoky",
      blushColor: "bronze",
      blushIntensity: "medium",
      contour: true,
      eyeliner: "winged",
    },
  },
];

const HAIR_PRESETS: HairPreset[] = [
  {
    id: "polished-refresh",
    label: "Polished Refresh",
    caption: "Clean shape with a natural salon-fresh finish",
    style: "medium_long_hair",
    color: "natural",
  },
  {
    id: "soft-volume",
    label: "Soft Volume",
    caption: "Gentle lift and movement for everyday styling",
    style: "wavy_hair",
    color: "light_brown",
  },
  {
    id: "sharp-bob",
    label: "Sharp Bob",
    caption: "Structured cut with a more editorial edge",
    style: "bob_cut",
    color: "dark_brown",
  },
  {
    id: "warm-glow",
    label: "Warm Glow",
    caption: "Soft length with a brighter color refresh",
    style: "long_hair",
    color: "balayage",
  },
];

const OUTFIT_PRESETS: OutfitPreset[] = [
  {
    id: "work-polish",
    label: "Work Polish",
    caption: "Structured, clean, confident outfit ideas",
    occasion: "work",
    vibe: "classic",
  },
  {
    id: "soft-date",
    label: "Soft Date",
    caption: "Romantic combinations with flattering color accents",
    occasion: "date",
    vibe: "romantic",
  },
  {
    id: "travel-light",
    label: "Travel Light",
    caption: "Comfort-first looks that still feel put together",
    occasion: "travel",
    vibe: "minimal",
  },
  {
    id: "weekend-bold",
    label: "Weekend Bold",
    caption: "More expressive looks for outings and events",
    occasion: "casual",
    vibe: "bold",
  },
];

type VaultItem = {
  id: string;
  reportId?: string;
  tool: "virtual_tryon" | "makeup" | "hair" | "outfit";
  imageUrl: string | null;
  createdAt: string;
};

interface Props {
  reportId?: string;
  photoUrl: string;
  isPaid: boolean;
  detectedGender?: HairGender;
  faceShape?: string;
  studioEntitlement?: StudioEntitlement;
  colorAnalysis?: ColorAnalysisResult;
  initialSourceAssetId?: string | null;
  contextType?: "report" | "canvas";
  contextId?: string;
  /** Hide advanced controls by default; emphasize presets + Surprise Me. */
  presetFirst?: boolean;
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
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`relative flex min-h-[180px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all cursor-pointer ${dragging ? "border-[#C8A96E] bg-[rgba(200,169,110,0.10)]" : "border-[#E8DDD0] bg-[#FAF6F0]"} ${disabled ? "opacity-50" : "opacity-100"}`}
    >
      {preview ? (
        <Image src={preview} alt={label} fill className="object-contain p-3" unoptimized />
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(200,169,110,0.15)]">
            <Upload className="h-5 w-5 text-[#C8A96E]" />
          </div>
          <p className="text-sm font-medium text-[#3D2B1F]">{label}</p>
          <p className="text-xs leading-snug whitespace-pre-line text-[#9C7D5B]">{hint}</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ── Shared Result Panel ───────────────────────────────────────────────────────
function ResultPanel({ url, hdUrl, lowResUrl, beforeUrl, status, onRetry, onDownload, isDownloading, isHdPending }: {
  url: string | null;
  hdUrl?: string | null;
  lowResUrl?: string | null;
  beforeUrl?: string | null;
  status: GenStatus;
  onRetry: () => void;
  onDownload: () => void;
  isDownloading: boolean;
  isHdPending?: boolean;
}) {
  if (status === "loading") {
    return (
      <div className="studio-shimmer flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#E8DDD0]">
        <Loader2 className="h-7 w-7 animate-spin text-[#C8A96E]" />
        <p className="text-sm font-medium text-[#9C7D5B]">Generating your look…</p>
        <p className="text-xs text-[#B8A898]">This takes ~30–60 seconds</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[rgba(192,107,62,0.3)] bg-[rgba(192,107,62,0.06)] p-8 text-center">
        <div className="relative h-14 w-20">
          <div
            className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(17,24,39,0.2),rgba(14,165,164,0.2))]"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <X className="h-8 w-8 text-[#C06B3E]" />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-[#3D2B1F]">Generation failed</p>
          <p className="mt-1 text-xs text-[#9C7D5B]">
            Try a clearer photo or slightly different controls, then retry.
          </p>
        </div>
        <button onClick={onRetry}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all hover:opacity-80"
          style={{ background: "rgba(192,107,62,0.12)", color: "#C06B3E" }}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }
  if (status === "done" && (url || lowResUrl)) {
    const after = url || lowResUrl!;
    if (beforeUrl) {
      return (
        <div className="studio-result">
          <BeforeAfterReveal beforeUrl={beforeUrl} afterUrl={after} className="w-full max-w-md mx-auto" />
          <StyleMomentShare beforeUrl={beforeUrl} afterUrl={after} />
        </div>
      );
    }
    return (
      <div className="studio-result relative min-h-[260px] overflow-hidden rounded-2xl">
        <Image src={after} alt="AI Studio result" width={480} height={480}
          className="w-full h-auto object-cover rounded-2xl transition-opacity duration-500"
          style={{ opacity: (url && !lowResUrl) || !hdUrl ? 1 : 0.85 }}
          unoptimized />
        {isHdPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 pointer-events-none">
            <Loader2 className="h-7 w-7 animate-spin text-[#C8A96E]" />
            <span className="ml-2 text-xs font-medium text-[#9C7D5B]">Enhancing to HD…</span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all hover:opacity-90"
            style={{ background: "rgba(61,43,31,0.75)", color: "#FAF6F0", opacity: isDownloading ? 0.7 : 1 }}>
            {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            {isDownloading ? "Upscaling..." : `Download HD`}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#E8DDD0] bg-[#FAF6F0]">
      <Sparkles className="h-8 w-8 text-[#C8A96E]" />
      <p className="text-sm font-medium text-[#9C7D5B]">Result will appear here</p>
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
      <label className="text-xs font-semibold uppercase tracking-wide text-[#9C7D5B]">{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value as T)} disabled={disabled}
          className="w-full appearance-none rounded-xl border-[1.5px] border-[#E0CEBC] bg-[#F5EFE7] px-3.5 py-2.5 pr-8 text-sm font-medium cursor-pointer text-[#3D2B1F]">
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[#9C7D5B]" />
      </div>
    </div>
  );
}

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
  { value: "purple",          label: "Purple",           hex: "#111827", group: "Fashion" },
  { value: "pink",            label: "Pink",             hex: "#D4748A", group: "Fashion" },
  { value: "rainbow",         label: "Rainbow",          hex: "#E8A040", group: "Fashion" },
] as const;
type HairColorValue = (typeof HAIR_COLORS)[number]["value"];

// ── History strip ─────────────────────────────────────────────────────────────
function HistoryStrip({ history, currentUrl, onSelect, onClear, onDownload, onUseAsSource }: {
  history: HistoryItem[]; currentUrl: string | null;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  onDownload?: (item: HistoryItem) => void;
  onUseAsSource?: (item: HistoryItem) => void;
}) {
  if (history.length === 0) return null;

  function formatHistoryTime(createdAt?: string | null): string {
    if (!createdAt) return "Just now";
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "Just now";
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <div className="border-t border-[#F0E8DF] px-5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B8A898]">History Timeline</p>
        <button onClick={onClear} className="text-[10px] text-[#C06B3E] transition-opacity hover:opacity-70">Clear all</button>
      </div>
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {history.map((item, i) => (
          <div
            key={i}
            className="shrink-0 rounded-xl p-2"
            style={{
              width: 124,
              background: "#FFFBF8",
              border: item.url === currentUrl ? "1px solid #111827" : "1px solid #E8DDD0",
            }}
          >
            <button
              onClick={() => onSelect(item)}
              className="w-full rounded-lg overflow-hidden transition-opacity hover:opacity-90"
              style={{ height: 72 }}
            >
              <Image src={item.url} alt={`Result ${i + 1}`} width={120} height={72} className="object-cover w-full h-full" unoptimized />
            </button>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[9px]" style={{ color: "#9C7D5B" }}>{formatHistoryTime(item.createdAt)}</span>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#C8A96E" }} />
            </div>
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="rounded-full px-2 py-1 text-[9px] font-semibold"
                style={{ background: "rgba(17,24,39,0.12)", color: "#111827" }}
              >
                View
              </button>
              {onUseAsSource && item.assetId && (
                <button
                  type="button"
                  onClick={() => onUseAsSource(item)}
                  className="rounded-full px-2 py-1 text-[9px] font-semibold"
                  style={{ background: "rgba(123,160,91,0.14)", color: "#7BA05B" }}
                >
                  Reuse
                </button>
              )}
              {onDownload && (
                <button
                  type="button"
                  onClick={() => onDownload(item)}
                  className="rounded-full px-2 py-1 text-[9px] font-semibold"
                  style={{ background: "rgba(17,24,39,0.12)", color: "#111827" }}
                >
                  Save
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mode tab button ───────────────────────────────────────────────────────────
function ModeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
      style={active
        ? { background: "#111827", color: "#3D2B1F", boxShadow: "0 1px 8px rgba(17,24,39,0.30)" }
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
  detectedGender = "none",
  faceShape,
  studioEntitlement,
  colorAnalysis,
  initialSourceAssetId = null,
  contextType = "report",
  contextId,
  presetFirst = false,
}: Props) {
  const isCanvas = contextType === "canvas";
  const resolvedContextId = isCanvas ? (contextId ?? reportId ?? "") : (reportId ?? "");
  const [mode, setMode] = React.useState<StudioMode>("makeup");

  // ── Clothing state ──
  const [clothFile, setClothFile]           = React.useState<File | null>(null);
  const [clothPreview, setClothPreview]     = React.useState<string | null>(null);
  const [photoMode, setPhotoMode]           = React.useState<PhotoMode>("selfie");
  const [fullBodyFile, setFullBodyFile]     = React.useState<File | null>(null);
  const [fullBodyPreview, setFullBodyPreview] = React.useState<string | null>(null);

  // ── Makeup inspo-transfer state ──
  type MakeupSubMode = "custom" | "inspo";
  const [mkSubMode, setMkSubMode] = React.useState<MakeupSubMode>("custom");
  const [inspoFile, setInspoFile] = React.useState<File | null>(null);
  const [inspoPreview, setInspoPreview] = React.useState<string | null>(null);
  const [inspoDetectedLook, setInspoDetectedLook] = React.useState<string | null>(null);

  // ── Makeup state (granular controls) ──
  const [mkLip, setMkLip]               = React.useState<LipColorValue>("nude_beige");
  const [mkEye, setMkEye]               = React.useState<EyeshadowValue>("neutral");
  const [mkBlush, setMkBlush]           = React.useState<BlushColorValue>("peach");
  const [mkBlushInt, setMkBlushInt]     = React.useState<BlushIntensityValue>("soft");
  const [mkFoundation, setMkFoundation] = React.useState<FoundationShadeValue>("medium");
  const [mkContour, setMkContour]       = React.useState(false);
  const [mkEyeliner, setMkEyeliner]     = React.useState<EyelinerStyleValue>("classic");
  const [showAdvancedMakeup, setShowAdvancedMakeup] = React.useState(!presetFirst);
  const [tryOnCount, setTryOnCount] = React.useState(0);

  function resetMakeupResult() { setModeResult("makeup", null, null); setModeStatus("makeup", "idle"); }

  // ── Hair state ──
  type HairSubMode = "custom" | "inspo";
  const [hairSubMode, setHairSubMode] = React.useState<HairSubMode>("custom");
  const [hairInspoFile, setHairInspoFile] = React.useState<File | null>(null);
  const [hairInspoPreview, setHairInspoPreview] = React.useState<string | null>(null);
  const [hairInspoDetectedLook, setHairInspoDetectedLook] = React.useState<string | null>(null);
  const [hairInspoDetectedStyle, setHairInspoDetectedStyle] = React.useState<string | null>(null);
  const [hairInspoDetectedColor, setHairInspoDetectedColor] = React.useState<string | null>(null);
  const [hairStyle, setHairStyle]   = React.useState<HairStyleValue>("No change");
  const [hairColor, setHairColor]   = React.useState<HairColorValue>("natural");
  const [showAdvancedHair, setShowAdvancedHair] = React.useState(!presetFirst);
  const hairStyleOptions = React.useMemo(
    () => getHairStyleOptionsForGender(detectedGender),
    [detectedGender],
  );

  React.useEffect(() => {
    if (!hairStyleOptions.some((opt) => opt.value === hairStyle)) {
      setHairStyle("No change");
      setModeStatus("hair", "idle");
    }
  }, [hairStyle, hairStyleOptions]);

  // ── Outfit Generator state ──
  const [outfitOccasion, setOutfitOccasion] = React.useState<OutfitOccasion>("casual");
  const [outfitVibe, setOutfitVibe] = React.useState<OutfitVibe>("minimal");
  const [showAdvancedOutfit, setShowAdvancedOutfit] = React.useState(false);
  const [outfitLoading, setOutfitLoading] = React.useState(false);
  const [outfitError, setOutfitError] = React.useState<string | null>(null);
  const [outfitLooks, setOutfitLooks] = React.useState<OutfitLook[]>([]);
  const [outfitHistory, setOutfitHistory] = React.useState<OutfitSession[]>([]);
  const [outfitHistoryLoading, setOutfitHistoryLoading] = React.useState(false);

  // ── AR-lite state ──
  const arVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const arCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const arOverlayCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const arStreamRef = React.useRef<MediaStream | null>(null);
  const arOverlayAnimationRef = React.useRef<number | null>(null);
  const arDetectingRef = React.useRef(false);
  const arLastDetectRef = React.useRef(0);
  const arFaceBoxRef = React.useRef<FaceBox | null>(null);
  const arFaceDetectorRef = React.useRef<any>(null);
  const [cameraStatus, setCameraStatus] = React.useState<CameraStatus>("idle");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [arFrameFile, setArFrameFile] = React.useState<File | null>(null);
  const [arFramePreview, setArFramePreview] = React.useState<string | null>(null);
  const [arOverlayMessage, setArOverlayMessage] = React.useState("Realtime frame guide is active.");

  // ── Batch results state (per mode) ──
  // Each mode holds an array of BatchResult
  const [batchResults, setBatchResults] = React.useState<Record<StudioMode, BatchResult[]>>({
    clothing: [],
    makeup: [],
    hair: [],
    ar: [],
    outfit: [],
  });
  // Selected batch index for comparison
  const [selectedBatchIndexes, setSelectedBatchIndexes] = React.useState<Record<StudioMode, number[]>>({
    clothing: [],
    makeup: [],
    hair: [],
    ar: [],
    outfit: [],
  });
  const [batchCompareOpen, setBatchCompareOpen] = React.useState(false);
  const [activeBatchIndex, setActiveBatchIndex] = React.useState<Record<StudioMode, number>>({
    clothing: -1,
    makeup: -1,
    hair: -1,
    ar: -1,
    outfit: -1,
  });
  // For single result backward compatibility
  const currentBatch = batchResults[mode];
  const normalizedActiveIndex = currentBatch.length === 0
    ? -1
    : Math.min(activeBatchIndex[mode] >= 0 ? activeBatchIndex[mode] : currentBatch.length - 1, currentBatch.length - 1);
  const activeItem = normalizedActiveIndex >= 0 ? currentBatch[normalizedActiveIndex] : null;
  const resultUrl = activeItem ? (activeItem.hdUrl || activeItem.lowResUrl) : null;
  const hdUrl = activeItem?.hdUrl ?? null;
  const lowResUrl = activeItem?.lowResUrl ?? null;
  const status = activeItem?.status ?? "idle";
  const canUndo = normalizedActiveIndex > 0;
  const canRedo = normalizedActiveIndex >= 0 && normalizedActiveIndex < currentBatch.length - 1;
  const [downloading, setDownloading] = React.useState(false);
  const [history, setHistory]   = React.useState<HistoryItem[]>([]);
  const [vault, setVault]       = React.useState<VaultItem[]>([]);
  const [vaultLoading, setVaultLoading] = React.useState(false);
  const [sourceAssetId, setSourceAssetId] = React.useState<string | null>(initialSourceAssetId);
  const [sourcePreviewUrl, setSourcePreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isCanvas && mode === "clothing") setMode("makeup");
  }, [isCanvas, mode]);

  React.useEffect(() => {
    if (isCanvas && hairSubMode === "inspo") {
      setHairSubMode("custom");
    }
  }, [hairSubMode, isCanvas]);

  // Helper functions for batch
  function addBatchResult(m: StudioMode, result: BatchResult) {
    setBatchResults((prev) => ({ ...prev, [m]: [...prev[m], result] }));
  }
  function updateBatchResult(m: StudioMode, idx: number, patch: Partial<BatchResult>) {
    setBatchResults((prev) => ({
      ...prev,
      [m]: prev[m].map((r, i) => i === idx ? { ...r, ...patch } : r),
    }));
  }
  function setSelectedIndexes(m: StudioMode, indexes: number[]) {
    setSelectedBatchIndexes((prev) => ({ ...prev, [m]: indexes }));
  }
  // For single-result compatibility with existing UI actions
  function setModeResult(m: StudioMode, hdUrl: string | null, lowResUrl: string | null) {
    if (!hdUrl && !lowResUrl) return;
    const nextIndex = batchResults[m].length;
    addBatchResult(m, { hdUrl, lowResUrl, assetId: null, status: "done", params: {} });
    setActiveBatchIndex((prev) => ({ ...prev, [m]: nextIndex }));
  }
  function setModeStatus(m: StudioMode, s: GenStatus) {
    if (s === "idle") return;
    setBatchResults((prev) => {
      const existing = prev[m];
      if (existing.length === 0) {
        return {
          ...prev,
          [m]: [{ hdUrl: null, lowResUrl: null, assetId: null, status: s, params: {} }],
        };
      }
      const next = [...existing];
      next[next.length - 1] = { ...next[next.length - 1], status: s };
      return { ...prev, [m]: next };
    });
  }
  function setModeAssetId(m: StudioMode, assetId: string | null) {
    if (!assetId) return;
    setBatchResults((prev) => {
      const existing = prev[m];
      if (existing.length === 0) return prev;
      const next = [...existing];
      next[next.length - 1] = { ...next[next.length - 1], assetId };
      return { ...prev, [m]: next };
    });
  }

  function pushPendingResult(m: StudioMode, params: Record<string, unknown>) {
    const nextIndex = batchResults[m].length;
    addBatchResult(m, {
      hdUrl: null,
      lowResUrl: null,
      assetId: null,
      status: "loading",
      params,
    });
    setActiveBatchIndex((prev) => ({ ...prev, [m]: nextIndex }));
    return nextIndex;
  }

  function undoCurrentMode() {
    if (!canUndo) return;
    setActiveBatchIndex((prev) => ({ ...prev, [mode]: normalizedActiveIndex - 1 }));
  }

  function redoCurrentMode() {
    if (!canRedo) return;
    setActiveBatchIndex((prev) => ({ ...prev, [mode]: normalizedActiveIndex + 1 }));
  }

  async function pollForHd(m: StudioMode, assetId: string, idx: number) {
    let tries = 0;
    while (tries < 20) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/vault/images/${assetId}`);
        if (!res.ok) break;
        const json = (await res.json()) as { hdUrl?: string | null };
        if (json.hdUrl) {
          updateBatchResult(m, idx, { hdUrl: json.hdUrl, status: "done" });
          break;
        }
      } catch {
        // Keep polling unless retries are exhausted.
      }
      tries++;
    }
  }

  // Cleanup blob URLs
  React.useEffect(() => () => {
    if (clothPreview?.startsWith("blob:")) URL.revokeObjectURL(clothPreview);
    if (fullBodyPreview?.startsWith("blob:")) URL.revokeObjectURL(fullBodyPreview);
    if (inspoPreview?.startsWith("blob:")) URL.revokeObjectURL(inspoPreview);
    if (hairInspoPreview?.startsWith("blob:")) URL.revokeObjectURL(hairInspoPreview);
    if (arFramePreview?.startsWith("blob:")) URL.revokeObjectURL(arFramePreview);
    }, [clothPreview, fullBodyPreview, inspoPreview, hairInspoPreview, arFramePreview]);

  const stopArCamera = React.useCallback(() => {
    if (arOverlayAnimationRef.current !== null) {
      cancelAnimationFrame(arOverlayAnimationRef.current);
      arOverlayAnimationRef.current = null;
    }
    const overlayCanvas = arOverlayCanvasRef.current;
    if (overlayCanvas) {
      const overlayCtx = overlayCanvas.getContext("2d");
      overlayCtx?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    arFaceBoxRef.current = null;
    arLastDetectRef.current = 0;
    arDetectingRef.current = false;
    if (arStreamRef.current) {
      for (const track of arStreamRef.current.getTracks()) {
        track.stop();
      }
      arStreamRef.current = null;
    }
    const video = arVideoRef.current;
    if (video) {
      video.srcObject = null;
    }
    setCameraStatus("idle");
  }, []);

  const isCameraAllowedByDocument = React.useCallback(() => {
    if (typeof document === "undefined") return true;

    const permissionsPolicy = (document as Document & {
      permissionsPolicy?: { allowsFeature?: (feature: string) => boolean };
      featurePolicy?: { allowsFeature?: (feature: string) => boolean };
    }).permissionsPolicy;
    if (permissionsPolicy?.allowsFeature && !permissionsPolicy.allowsFeature("camera")) {
      return false;
    }

    const featurePolicy = (document as Document & {
      featurePolicy?: { allowsFeature?: (feature: string) => boolean };
    }).featurePolicy;
    if (featurePolicy?.allowsFeature && !featurePolicy.allowsFeature("camera")) {
      return false;
    }

    return true;
  }, []);

  const startArOverlayLoop = React.useCallback(() => {
    if (arOverlayAnimationRef.current !== null) {
      cancelAnimationFrame(arOverlayAnimationRef.current);
      arOverlayAnimationRef.current = null;
    }

    const video = arVideoRef.current;
    const canvas = arOverlayCanvasRef.current;
    if (!video || !canvas) return;

    const drawRoundedRect = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      radius: number,
    ) => {
      const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    const loop = (now: number) => {
      const overlay = arOverlayCanvasRef.current;
      const vid = arVideoRef.current;
      if (!overlay || !vid) return;

      const width = overlay.clientWidth;
      const height = overlay.clientHeight;
      if (width <= 0 || height <= 0) {
        arOverlayAnimationRef.current = requestAnimationFrame(loop);
        return;
      }

      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const targetWidth = Math.floor(width * dpr);
      const targetHeight = Math.floor(height * dpr);
      if (overlay.width !== targetWidth || overlay.height !== targetHeight) {
        overlay.width = targetWidth;
        overlay.height = targetHeight;
      }

      const ctx = overlay.getContext("2d");
      if (!ctx) {
        arOverlayAnimationRef.current = requestAnimationFrame(loop);
        return;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.scale(dpr, dpr);

      const detector = arFaceDetectorRef.current;
      const canDetect = !!detector && vid.readyState >= 2;
      if (canDetect && !arDetectingRef.current && now - arLastDetectRef.current > 380) {
        arDetectingRef.current = true;
        arLastDetectRef.current = now;
        detector.detect(vid)
          .then((faces: any[]) => {
            const face = faces?.[0];
            const box = face?.boundingBox;
            if (box && Number.isFinite(box.width) && Number.isFinite(box.height)) {
              const videoWidth = Math.max(1, vid.videoWidth);
              const videoHeight = Math.max(1, vid.videoHeight);
              arFaceBoxRef.current = {
                x: (box.x / videoWidth) * width,
                y: (box.y / videoHeight) * height,
                width: (box.width / videoWidth) * width,
                height: (box.height / videoHeight) * height,
              };
            }
          })
          .catch(() => {
            // Ignore detector hiccups and keep fallback guide.
          })
          .finally(() => {
            arDetectingRef.current = false;
          });
      }

      const fallbackBox: FaceBox = {
        width: width * 0.5,
        height: height * 0.62,
        x: width * 0.25,
        y: height * 0.14,
      };
      const face = arFaceBoxRef.current ?? fallbackBox;
      const pulse = Math.sin(now / 420) * 1.4;

      const frameWidth = Math.max(120, face.width * 0.9);
      const frameHeight = frameWidth * 0.34;
      const centerX = face.x + face.width / 2;
      const centerY = face.y + face.height * 0.43 + pulse;
      const leftX = centerX - frameWidth * 0.54;
      const rightX = centerX + frameWidth * 0.02;
      const y = centerY - frameHeight / 2;

      ctx.fillStyle = "rgba(17,24,39,0.20)";
      ctx.strokeStyle = "rgba(245,237,227,0.90)";
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, leftX, y, frameWidth * 0.48, frameHeight, frameHeight * 0.35);
      ctx.fill();
      ctx.stroke();
      drawRoundedRect(ctx, rightX, y, frameWidth * 0.48, frameHeight, frameHeight * 0.35);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX - frameWidth * 0.04, centerY - frameHeight * 0.02);
      ctx.lineTo(centerX + frameWidth * 0.04, centerY - frameHeight * 0.02);
      ctx.strokeStyle = "rgba(245,237,227,0.9)";
      ctx.lineWidth = 3;
      ctx.stroke();

      const text = "Align eyes with the guide, then capture";
      ctx.font = "600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(245,237,227,0.92)";
      ctx.fillText(text, width / 2, height - 16);

      arOverlayAnimationRef.current = requestAnimationFrame(loop);
    };

    arOverlayAnimationRef.current = requestAnimationFrame(loop);
  }, []);

  const startArCamera = React.useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setCameraError("Camera is not supported in this browser.");
      return;
    }

    if (!isCameraAllowedByDocument()) {
      stopArCamera();
      setCameraStatus("blocked");
      setCameraError("This page is not allowed to use the camera in the current browser context.");
      setArOverlayMessage("Camera blocked by the current browser context. Open AR in a full browser tab to continue.");
      return;
    }

    stopArCamera();
    setCameraStatus("requesting");
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      arStreamRef.current = stream;
      const video = arVideoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }

      const detectorCtor = (window as any).FaceDetector;
      if (detectorCtor && !arFaceDetectorRef.current) {
        try {
          arFaceDetectorRef.current = new detectorCtor({ maxDetectedFaces: 1, fastMode: true });
          setArOverlayMessage("Realtime tracking active. Hold still for best guide placement.");
        } catch {
          setArOverlayMessage("Guide mode active. Realtime face tracking is unavailable here, but capture still works.");
        }
      } else if (!detectorCtor) {
        setArOverlayMessage("Guide mode active. Realtime face tracking is unavailable here, but capture still works.");
      }

      setCameraStatus("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to access camera.";
      if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("notallowed")) {
        setCameraStatus("blocked");
      } else {
        setCameraStatus("error");
      }
      setArOverlayMessage("Camera unavailable. Enable camera access to continue.");
      setCameraError(message);
    }
  }, [isCameraAllowedByDocument, stopArCamera]);

  function clearArFrame() {
    if (arFramePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(arFramePreview);
    }
    setArFrameFile(null);
    setArFramePreview(null);
  }

  async function captureArFrame() {
    const video = arVideoRef.current;
    const canvas = arCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera is not ready yet. Try again in a moment.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Could not initialize capture canvas.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    if (!blob) {
      setCameraError("Unable to capture frame. Please retry.");
      return;
    }

    clearArFrame();
    const file = new File([blob], `ar-frame-${Date.now()}.jpg`, { type: "image/jpeg" });
    setArFrameFile(file);
    setArFramePreview(URL.createObjectURL(file));
  }

  const loadVault = React.useCallback(async () => {
    setVaultLoading(true);
    try {
      const res = await fetch(
        isCanvas
          ? "/api/studio/vault?limit=36&offset=0"
          : `/api/vault/images?limit=36&reportId=${resolvedContextId}`
      );
      if (!res.ok) return;

      let items: VaultItem[] = [];
      if (isCanvas) {
        const json = await res.json() as {
          assets?: Array<{ id: string; tool: "makeup" | "hair" | "outfit"; hdUrl?: string; lowResUrl?: string; createdAt: string }>;
        };
        items = (json.assets ?? []).map((asset) => ({
          id: asset.id,
          tool: asset.tool,
          imageUrl: asset.hdUrl ?? asset.lowResUrl ?? null,
          createdAt: asset.createdAt,
        })).filter((it) => !!it.imageUrl);
      } else {
        const json = await res.json() as { items?: VaultItem[] };
        items = (json.items ?? []).filter((it) => !!it.imageUrl);
      }

      setVault(items);
    } catch {
      // Silent fail keeps studio usable even if vault endpoint is unavailable.
    } finally {
      setVaultLoading(false);
    }
  }, [isCanvas, resolvedContextId]);

  React.useEffect(() => {
    if (!sourceAssetId) return;
    const selected = vault.find((item) => item.id === sourceAssetId);
    if (selected?.imageUrl) {
      setSourcePreviewUrl(selected.imageUrl);
      return;
    }
    setSourcePreviewUrl(null);
  }, [sourceAssetId, vault]);

  React.useEffect(() => {
    if (!isPaid) return;
    void loadVault();
  }, [isPaid, loadVault]);

  React.useEffect(() => {
    if (!isPaid || mode !== "outfit" || isCanvas) return;
    let active = true;
    const loadOutfitHistory = async () => {
      setOutfitHistoryLoading(true);
      try {
        const res = await fetch(`/api/reports/${resolvedContextId}/outfit-generator`);
        if (!res.ok) return;
        const json = (await res.json()) as { history?: OutfitSession[] };
        if (!active) return;
        const history = json.history ?? [];
        setOutfitHistory(history);
        if (history.length > 0) {
          setOutfitLooks(history[0].looks);
        }
      } catch {
        // Keep Studio usable even if history load fails.
      } finally {
        if (active) setOutfitHistoryLoading(false);
      }
    };
    void loadOutfitHistory();
    return () => { active = false; };
  }, [isCanvas, isPaid, mode, resolvedContextId]);

  // ── Clothing handlers ──
  function handleClothFile(f: File) {
    if (clothPreview?.startsWith("blob:")) URL.revokeObjectURL(clothPreview);
    setClothFile(f); setClothPreview(URL.createObjectURL(f));
    setModeResult("clothing", null, null); setModeStatus("clothing", "idle");
  }
  function clearGarment() {
    if (clothPreview?.startsWith("blob:")) URL.revokeObjectURL(clothPreview);
    setClothFile(null); setClothPreview(null);
    setModeResult("clothing", null, null); setModeStatus("clothing", "idle");
  }
  function handleFullBodyFile(f: File) {
    if (fullBodyPreview?.startsWith("blob:")) URL.revokeObjectURL(fullBodyPreview);
    setFullBodyFile(f); setFullBodyPreview(URL.createObjectURL(f));
    setModeResult("clothing", null, null); setModeStatus("clothing", "idle");
  }
  function clearFullBody() {
    if (fullBodyPreview?.startsWith("blob:")) URL.revokeObjectURL(fullBodyPreview);
    setFullBodyFile(null); setFullBodyPreview(null);
  }

  // ── Generate functions ──
  async function generateClothing() {
    if (isCanvas) return;
    if (!clothFile) return;
    const idx = pushPendingResult("clothing", { photoMode, sourceAssetId, hasFullBody: !!fullBodyFile });
    try {
      const form = new FormData();
      form.append("clothImage", clothFile);
      if (photoMode === "full" && fullBodyFile) form.append("personImage", fullBodyFile);
      if (sourceAssetId) form.append("sourceAssetId", sourceAssetId);
      const res  = await fetch(`/api/reports/${resolvedContextId}/virtual-tryon`, { method: "POST", body: form });
      const json = await res.json() as { hdUrl?: string; lowResUrl?: string; error?: string; asset?: GeneratedAssetMeta | null };
      if (!res.ok || !json.lowResUrl) throw new Error(formatApiError(json.error, "Generation failed"));
      updateBatchResult("clothing", idx, {
        hdUrl: json.hdUrl ?? null,
        lowResUrl: json.lowResUrl ?? null,
        assetId: json.asset?.id ?? null,
        status: json.hdUrl ? "done" : "loading",
      });
      setHistory((h) => [{ url: json.hdUrl ?? json.lowResUrl!, assetId: json.asset?.id ?? null, createdAt: json.asset?.createdAt ?? null }, ...h].slice(0, 10));
      if (json.asset?.id) {
        setSourceAssetId(json.asset.id);
        setSourcePreviewUrl(json.hdUrl ?? json.lowResUrl ?? null);
      }
      void loadVault();
      // Poll for HD if not ready
      if (!json.hdUrl && json.asset?.id) void pollForHd("clothing", json.asset.id, idx);
    } catch {
      updateBatchResult("clothing", idx, { status: "error" });
    }
  }

  async function generateMakeup() {
    const idx = pushPendingResult("makeup", {
      lip: mkLip,
      eye: mkEye,
      blush: mkBlush,
      blushIntensity: mkBlushInt,
      foundation: mkFoundation,
      contour: mkContour,
      eyeliner: mkEyeliner,
      sourceAssetId,
    });
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
      const res = isCanvas
        ? await fetch("/api/studio/generate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contextType: "canvas",
              contextId: resolvedContextId,
              mode: "makeup",
              options: {
                sourceAssetId,
                makeupStyle: deriveStyle(controls),
                makeupIntensity: "medium",
              },
            }),
          })
        : await fetch(`/api/reports/${resolvedContextId}/makeup`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...controls, sourceAssetId }),
          });
      const json = await res.json() as { hdUrl?: string; lowResUrl?: string; error?: string; asset?: GeneratedAssetMeta | null };
      if (!res.ok || !json.lowResUrl) throw new Error(formatApiError(json.error, "Generation failed"));
      updateBatchResult("makeup", idx, {
        hdUrl: json.hdUrl ?? null,
        lowResUrl: json.lowResUrl ?? null,
        assetId: json.asset?.id ?? null,
        status: json.hdUrl ? "done" : "loading",
      });
      setHistory((h) => [{ url: json.hdUrl ?? json.lowResUrl!, assetId: json.asset?.id ?? null, createdAt: json.asset?.createdAt ?? null }, ...h].slice(0, 10));
      if (json.asset?.id) {
        setSourceAssetId(json.asset.id);
        setSourcePreviewUrl(json.hdUrl ?? json.lowResUrl ?? null);
      }
      void loadVault();
      if (!json.hdUrl && json.asset?.id) void pollForHd("makeup", json.asset.id, idx);
      void recordTryOn();
    } catch {
      updateBatchResult("makeup", idx, { status: "error" });
    }
  }

  async function generateMakeupTransfer() {
    if (!inspoFile) return;
    const idx = pushPendingResult("makeup", { mode: "inspo", sourceAssetId });
    try {
      const form = new FormData();
      form.append("referenceImage", inspoFile);
      if (sourceAssetId) form.append("sourceAssetId", sourceAssetId);
      const res = await fetch(`/api/reports/${resolvedContextId}/makeup-transfer`, { method: "POST", body: form });
      const json = await res.json() as { hdUrl?: string; lowResUrl?: string; error?: string; detectedLook?: string; asset?: { id: string; createdAt: string } };
      if (!res.ok || !json.lowResUrl) throw new Error(formatApiError(json.error, "Transfer failed"));
      updateBatchResult("makeup", idx, { hdUrl: json.hdUrl, lowResUrl: json.lowResUrl, assetId: json.asset?.id ?? null, status: json.hdUrl ? "done" : "loading" });
      setInspoDetectedLook(json.detectedLook ?? null);
      setHistory((h) => [{ url: json.hdUrl ?? json.lowResUrl!, assetId: json.asset?.id ?? null, createdAt: json.asset?.createdAt ?? null }, ...h].slice(0, 10));
      if (json.asset?.id) { setSourceAssetId(json.asset.id); setSourcePreviewUrl(json.hdUrl ?? json.lowResUrl ?? null); }
      void loadVault();
      if (!json.hdUrl && json.asset?.id) void pollForHd("makeup", json.asset.id, idx);
      void recordTryOn();
    } catch { updateBatchResult("makeup", idx, { status: "error" }); }
  }

  async function generateHair() {
    const idx = pushPendingResult("hair", { colorName: hairColor, styleName: hairStyle, sourceAssetId });
    try {
      const res = isCanvas
        ? await fetch("/api/studio/generate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contextType: "canvas",
              contextId: resolvedContextId,
              mode: "hair",
              options: {
                sourceAssetId,
                hairStyle,
                hairColor,
              },
            }),
          })
        : await fetch(`/api/reports/${resolvedContextId}/hair-color`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              colorName: hairColor,
              styleName: hairStyle === "No change" ? undefined : hairStyle,
              sourceAssetId,
            }),
          });
      const json = await res.json() as { hdUrl?: string; lowResUrl?: string; error?: string; asset?: GeneratedAssetMeta | null };
      if (!res.ok || !json.lowResUrl) throw new Error(formatApiError(json.error, "Generation failed"));
      updateBatchResult("hair", idx, {
        hdUrl: json.hdUrl ?? null,
        lowResUrl: json.lowResUrl ?? null,
        assetId: json.asset?.id ?? null,
        status: json.hdUrl ? "done" : "loading",
      });
      setHistory((h) => [{ url: json.hdUrl ?? json.lowResUrl!, assetId: json.asset?.id ?? null, createdAt: json.asset?.createdAt ?? null }, ...h].slice(0, 10));
      if (json.asset?.id) {
        setSourceAssetId(json.asset.id);
        setSourcePreviewUrl(json.hdUrl ?? json.lowResUrl ?? null);
      }
      void loadVault();
      if (!json.hdUrl && json.asset?.id) void pollForHd("hair", json.asset.id, idx);
      void recordTryOn();
    } catch {
      updateBatchResult("hair", idx, { status: "error" });
    }
  }

  async function generateHairTransfer() {
    if (isCanvas || !hairInspoFile) return;

    const idx = pushPendingResult("hair", { mode: "inspo", sourceAssetId });
    try {
      const form = new FormData();
      form.append("referenceImage", hairInspoFile);
      if (sourceAssetId) form.append("sourceAssetId", sourceAssetId);

      const res = await fetch(`/api/reports/${resolvedContextId}/hair-transfer`, {
        method: "POST",
        body: form,
      });
      const json = await res.json() as {
        hdUrl?: string;
        lowResUrl?: string;
        error?: string;
        detectedLook?: string;
        controls?: { styleName?: string; colorName?: string };
        asset?: GeneratedAssetMeta | null;
      };

      if (!res.ok || !json.lowResUrl) throw new Error(formatApiError(json.error, "Transfer failed"));

      updateBatchResult("hair", idx, {
        hdUrl: json.hdUrl ?? null,
        lowResUrl: json.lowResUrl ?? null,
        assetId: json.asset?.id ?? null,
        status: json.hdUrl ? "done" : "loading",
      });

      setHairInspoDetectedLook(json.detectedLook ?? null);
      setHairInspoDetectedStyle(json.controls?.styleName ?? null);
      setHairInspoDetectedColor(json.controls?.colorName ?? null);

      if (json.controls?.styleName) {
        const styleMatch = hairStyleOptions.find((item) => item.value === json.controls?.styleName);
        if (styleMatch) setHairStyle(styleMatch.value);
      }
      if (json.controls?.colorName) {
        const colorMatch = HAIR_COLORS.find((item) => item.value === json.controls?.colorName);
        if (colorMatch) setHairColor(colorMatch.value);
      }

      setHistory((h) => [{
        url: json.hdUrl ?? json.lowResUrl!,
        assetId: json.asset?.id ?? null,
        createdAt: json.asset?.createdAt ?? null,
      }, ...h].slice(0, 10));

      if (json.asset?.id) {
        setSourceAssetId(json.asset.id);
        setSourcePreviewUrl(json.hdUrl ?? json.lowResUrl ?? null);
      }

      void loadVault();
      if (!json.hdUrl && json.asset?.id) void pollForHd("hair", json.asset.id, idx);
      void recordTryOn();
    } catch {
      updateBatchResult("hair", idx, { status: "error" });
    }
  }

  async function generateOutfits() {
    setOutfitLoading(true);
    setOutfitError(null);
    try {
      if (isCanvas) {
        const res = await fetch("/api/studio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contextType: "canvas",
            contextId: resolvedContextId,
            mode: "outfit",
            options: {
              sourceAssetId,
              occasion: outfitOccasion,
              vibe: outfitVibe,
            },
          }),
        });
        const json = (await res.json()) as {
          outfit?: { looks: OutfitLook[] };
          error?: string;
        };
        if (!res.ok || !json.outfit || json.outfit.looks.length === 0) {
          throw new Error(formatApiError(json.error, "Could not generate outfits"));
        }
        setOutfitLooks(json.outfit.looks);
      } else {
        const res = await fetch(`/api/reports/${resolvedContextId}/outfit-generator`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ occasion: outfitOccasion, vibe: outfitVibe }),
        });
        const json = (await res.json()) as {
          looks?: OutfitLook[];
          history?: OutfitSession[];
          error?: string;
        };
        if (!res.ok || !json.looks || json.looks.length === 0) {
          throw new Error(formatApiError(json.error, "Could not generate outfits"));
        }
        setOutfitLooks(json.looks);
        if (json.history) setOutfitHistory(json.history);
      }
    } catch (err) {
      setOutfitLooks([]);
      setOutfitError((err as Error).message || "Could not generate outfits");
    } finally {
      setOutfitLoading(false);
    }
  }

  async function generateArGlasses() {
    if (isCanvas) return;
    if (!arFrameFile || !clothFile) {
      setCameraError("Capture a frame and upload a glasses reference first.");
      return;
    }

    const idx = pushPendingResult("ar", {
      mode: "camera_glasses",
      sourceAssetId,
    });

    try {
      const form = new FormData();
      form.append("clothImage", clothFile);
      form.append("personImage", arFrameFile);
      if (sourceAssetId) form.append("sourceAssetId", sourceAssetId);

      const res = await fetch(`/api/reports/${resolvedContextId}/virtual-tryon`, {
        method: "POST",
        body: form,
      });
      const json = await res.json() as { hdUrl?: string; lowResUrl?: string; error?: string; asset?: GeneratedAssetMeta | null };
      if (!res.ok || !json.lowResUrl) throw new Error(formatApiError(json.error, "AR try-on failed"));

      updateBatchResult("ar", idx, {
        hdUrl: json.hdUrl ?? null,
        lowResUrl: json.lowResUrl ?? null,
        assetId: json.asset?.id ?? null,
        status: json.hdUrl ? "done" : "loading",
      });
      setHistory((h) => [{ url: json.hdUrl ?? json.lowResUrl!, assetId: json.asset?.id ?? null, createdAt: json.asset?.createdAt ?? null }, ...h].slice(0, 10));
      if (json.asset?.id) {
        setSourceAssetId(json.asset.id);
        setSourcePreviewUrl(json.hdUrl ?? json.lowResUrl ?? null);
      }
      void loadVault();
      if (!json.hdUrl && json.asset?.id) void pollForHd("ar", json.asset.id, idx);
    } catch (err) {
      setCameraError((err as Error).message || "AR try-on failed.");
      updateBatchResult("ar", idx, { status: "error" });
    }
  }

  async function setOutfitFeedback(sessionId: string, field: "liked" | "saved" | "worn", value?: boolean) {
    if (isCanvas) return;
    const previous = outfitHistory;
    const optimistic = outfitHistory.map((session) => {
      if (session.id !== sessionId) return session;
      const current = {
        liked: session.feedback?.liked ?? false,
        saved: session.feedback?.saved ?? false,
        worn: session.feedback?.worn ?? false,
      };
      return {
        ...session,
        feedback: {
          ...current,
          [field]: typeof value === "boolean" ? value : !current[field],
        },
      };
    });
    setOutfitHistory(optimistic);
    try {
      const res = await fetch(`/api/reports/${resolvedContextId}/outfit-generator`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, field, value }),
      });
      const json = (await res.json()) as { history?: OutfitSession[] };
      if (!res.ok) throw new Error("Failed to update feedback");
      if (json.history) setOutfitHistory(json.history);
    } catch {
      setOutfitHistory(previous);
    }
  }

  function retryCurrentMode() {
    if (mode === "clothing") generateClothing();
    else if (mode === "makeup") generateMakeup();
    else if (mode === "hair") generateHair();
    else if (mode === "ar") void generateArGlasses();
    else if (mode === "outfit") void generateOutfits();
  }

  function switchMode(m: StudioMode) { setMode(m); }

  React.useEffect(() => {
    if (mode !== "ar") {
      stopArCamera();
      return;
    }

    void startArCamera();
    return () => {
      stopArCamera();
    };
  }, [mode, startArCamera, stopArCamera]);

  React.useEffect(() => {
    if (mode !== "ar" || cameraStatus !== "ready") {
      if (arOverlayAnimationRef.current !== null) {
        cancelAnimationFrame(arOverlayAnimationRef.current);
        arOverlayAnimationRef.current = null;
      }
      return;
    }

    startArOverlayLoop();
    return () => {
      if (arOverlayAnimationRef.current !== null) {
        cancelAnimationFrame(arOverlayAnimationRef.current);
        arOverlayAnimationRef.current = null;
      }
    };
  }, [cameraStatus, mode, startArOverlayLoop]);

  async function downloadBatchResult(item: BatchResult, m: StudioMode, i: number) {
    const directUrl = item.hdUrl || item.lowResUrl;
    if (!directUrl) return;
    if (!item.assetId) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const res = await fetch(`/api/vault/images/${item.assetId}/upscale-download`, { method: "POST" });
      if (!res.ok) throw new Error("Upscale download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `ai-studio-${m}-${i + 1}-hd.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(directUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function downloadCurrentResult() {
    if (!resultUrl) return;
    const currentAssetId = activeItem?.assetId ?? null;

    if (!currentAssetId) {
      window.open(resultUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setDownloading(true);
    try {
      const res = await fetch(`/api/vault/images/${currentAssetId}/upscale-download`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Upscale download failed");
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `ai-studio-${mode}-latest-hd.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(resultUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }

  const currentHairColor = HAIR_COLORS.find((c) => c.value === hairColor);
  const availableHairPresets = React.useMemo(
    () => HAIR_PRESETS.filter((preset) => hairStyleOptions.some((option) => option.value === preset.style)),
    [hairStyleOptions],
  );

  const tryNextPresets: TryNextPreset[] = React.useMemo(() => {
    if (mode === "hair") {
      return HAIR_PRESETS.slice(0, 3).map((p) => ({
        id: p.id,
        label: p.label,
        mode: "hair" as const,
        variant: p.id,
      }));
    }
    return MAKEUP_PRESETS.slice(0, 3).map((p) => ({
      id: p.id,
      label: p.label,
      mode: "makeup" as const,
      variant: p.id,
    }));
  }, [mode]);

  // ── Paywall (quota-aware for unpaid + paid report caps) ──
  const isStudioProTier = studioEntitlement?.tier === "studio_pro";
  const quotaRemaining = isStudioProTier
    ? null
    : (studioEntitlement?.remainingGens ??
      (isPaid ? PRODUCT_COPY.report.studioGensIncluded : PRODUCT_COPY.free.studioGensPerMonth));
  const canUseStudio = isStudioProTier || (quotaRemaining !== null && quotaRemaining > 0);

  if (!canUseStudio) {
    return (
      <div className="rounded-3xl border border-[rgba(17,24,39,0.18)] bg-[linear-gradient(145deg,rgba(255,247,251,0.98),rgba(251,231,242,0.92))] p-10 text-center">
        <Lock className="mx-auto mb-4 h-10 w-10 text-[#C8A96E]" />
        <p className="mb-2 text-base font-semibold text-[#3D2B1F]">Free try-ons used up</p>
        <p className="text-sm text-[#9C7D5B]">
          Unlock your full report for more try-ons, or visit Studio for your monthly free looks.
        </p>
        <Link
          href={reportId ? `/report/${reportId}?paywall=open` : "/upload?paywall=open"}
          className="mt-4 inline-flex rounded-full bg-[#111827] px-5 py-2 text-sm font-semibold text-white"
        >
          Unlock full report
        </Link>
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
  const currentMakeupControls: MakeupGranularControls = {
    lipColor: mkLip,
    eyeshadow: mkEye,
    blushColor: mkBlush,
    blushIntensity: mkBlushInt,
    foundation: mkFoundation,
    contour: mkContour,
    eyeliner: mkEyeliner,
  };

  function isMakeupPresetActive(preset: MakeupPreset) {
    return Object.entries(preset.controls).every(([key, value]) => currentMakeupControls[key as keyof MakeupGranularControls] === value);
  }

  function applyMakeupPreset(preset: MakeupPreset) {
    if (preset.controls.lipColor) setMkLip(preset.controls.lipColor);
    if (preset.controls.eyeshadow) setMkEye(preset.controls.eyeshadow);
    if (preset.controls.blushColor) setMkBlush(preset.controls.blushColor);
    if (preset.controls.blushIntensity) setMkBlushInt(preset.controls.blushIntensity);
    if (typeof preset.controls.contour === "boolean") setMkContour(preset.controls.contour);
    if (preset.controls.eyeliner) setMkEyeliner(preset.controls.eyeliner);
    resetMakeupResult();
    setMkSubMode("custom");
    setShowAdvancedMakeup(false);
  }

  function isHairPresetActive(preset: HairPreset) {
    return hairStyle === preset.style && hairColor === preset.color;
  }

  function applyHairPreset(preset: HairPreset) {
    setHairStyle(preset.style as HairStyleValue);
    setHairColor(preset.color as HairColorValue);
    setModeResult("hair", null, null);
    setModeStatus("hair", "idle");
    setShowAdvancedHair(false);
  }

  function isOutfitPresetActive(preset: OutfitPreset) {
    return outfitOccasion === preset.occasion && outfitVibe === preset.vibe;
  }

  async function recordTryOn() {
    const next = tryOnCount + 1;
    setTryOnCount(next);
    track(next === 1 ? "first_tryon" : next === 2 ? "second_tryon" : "tryon", { count: next, mode });
    try {
      await fetch("/api/studio/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "try_on",
          season: colorAnalysis?.season,
          faceShape,
        }),
      });
    } catch {
      // non-blocking
    }
  }

  function surpriseMe() {
    if (mode === "hair" && HAIR_PRESETS.length > 0) {
      const preset = HAIR_PRESETS[Math.floor(Math.random() * HAIR_PRESETS.length)];
      applyHairPreset(preset);
      void generateHair();
      return;
    }
    if (MAKEUP_PRESETS.length > 0) {
      const preset = MAKEUP_PRESETS[Math.floor(Math.random() * MAKEUP_PRESETS.length)];
      applyMakeupPreset(preset);
      setMode("makeup");
      void generateMakeup();
    }
  }

  function applyOutfitPreset(preset: OutfitPreset) {
    setOutfitOccasion(preset.occasion);
    setOutfitVibe(preset.vibe);
    setOutfitError(null);
    setShowAdvancedOutfit(false);
  }

  return (
    <>
      <style>{STUDIO_CSS}</style>
      {isCanvas && (
        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-[#E8DDD0] bg-[#FDFAF6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#3D2B1F]">{STUDIO_EXPERIENCES.advancedStudio.name}</p>
            <p className="text-xs text-[#9C7D5B]">{STUDIO_EXPERIENCES.advancedStudio.tagline}</p>
          </div>
          <Link
            href={`/studio/${resolvedContextId}`}
            className="text-sm font-medium text-[#111827] underline hover:no-underline shrink-0"
          >
            {STUDIO_EXPERIENCES.backToQuickTry}
          </Link>
        </div>
      )}
      <div className="overflow-hidden rounded-3xl border border-[#E8DDD0] bg-[#FDFAF6] shadow-[0_2px_24px_rgba(61,43,31,0.06)]">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 border-b border-[#E8DDD0] bg-[linear-gradient(135deg,rgba(200,169,110,0.08),rgba(232,221,208,0.12))] px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827]">
            <Sparkles className="h-4 w-4 text-[#3D2B1F]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#3D2B1F]">
              {isCanvas
                ? STUDIO_EXPERIENCES.advancedStudio.name
                : STUDIO_EXPERIENCES.reportTryOn.name}
            </h2>
            <p className="text-xs text-[#9C7D5B]">
              {isCanvas
                ? STUDIO_EXPERIENCES.advancedStudio.tagline
                : presetFirst
                  ? "Pick a preset or tap Surprise Me — one tap to see your new look"
                  : "Try on clothing, makeup, hair & outfits — generate & download instantly"}
            </p>
          </div>
          {presetFirst ? (
            <button
              type="button"
              onClick={() => surpriseMe()}
              disabled={status === "loading"}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "#111827" }}
            >
              ✨ Surprise Me
            </button>
          ) : null}
        </div>

        {/* ── Mode tabs ── */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-1 rounded-2xl bg-[#F0E8DF] p-1">
            {!isCanvas && isPaid && <ModeTab label="👗 Clothing" active={mode === "clothing"} onClick={() => switchMode("clothing")} />}
            <ModeTab label="💄 Makeup"   active={mode === "makeup"}   onClick={() => switchMode("makeup")} />
            <ModeTab label="💇 Hair"     active={mode === "hair"}     onClick={() => switchMode("hair")} />
            {isPaid && <ModeTab label="🧥 Outfit"   active={mode === "outfit"}   onClick={() => switchMode("outfit")} />}
            {!isCanvas && isPaid && <ModeTab label="🕶 AR" active={mode === "ar"} onClick={() => switchMode("ar")} />}
          </div>
        </div>

        {/* ── Studio Pro quota banner ── */}
        {isStudioPro && remainingGens !== null && (
          <div className={`mx-5 mt-2 flex items-center justify-between rounded-xl border px-4 py-2.5 ${isAtLimit ? "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)]" : isNearLimit ? "border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)]" : "border-[rgba(17,24,39,0.2)] bg-[rgba(17,24,39,0.07)]"}`}>
            <div className="flex items-center gap-2">
              <Sparkles className={`h-3.5 w-3.5 shrink-0 ${isAtLimit ? "text-[#EF4444]" : isNearLimit ? "text-[#F59E0B]" : "text-[#C8A96E]"}`} />
              <span className={`text-xs font-medium ${isAtLimit ? "text-[#EF4444]" : isNearLimit ? "text-[#B45309]" : "text-[#7C5A3A]"}`}>
                {isAtLimit
                  ? `Monthly limit reached — resets ${periodResets ?? "next month"}`
                  : `${remainingGens} of ${cap} Studio generations left this month`}
              </span>
            </div>
            {!isAtLimit && usedGens !== null && (
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="h-1.5 w-[60px] overflow-hidden rounded-full bg-[rgba(0,0,0,0.08)]">
                  <div className={`h-full rounded-full transition-all ${isNearLimit ? "bg-[#F59E0B]" : "bg-[#C8A96E]"}`} style={{ width: `${Math.round((usedGens / cap) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Reusable source selector ── */}
        <div className="mx-5 mt-3 rounded-2xl border border-[rgba(17,24,39,0.18)] bg-[rgba(17,24,39,0.06)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9C7D5B]">Source for next generation</p>
              <p className="text-[11px] text-[#7C5A3A]">
                {sourceAssetId
                  ? `Using generated image from ${selectedVaultItem ? new Date(selectedVaultItem.createdAt).toLocaleString("en-IN") : "vault"}`
                  : "Using original selfie"}
              </p>
            </div>
            <button
              onClick={() => { setSourceAssetId(null); setSourcePreviewUrl(null); }}
              className="rounded-full border border-[rgba(17,24,39,0.3)] bg-[rgba(255,255,255,0.75)] px-3 py-1.5 text-[11px] font-medium text-[#7C5A3A]"
            >
              Use original
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2 overflow-x-auto">
            {vaultLoading ? (
              <p className="text-[11px] text-[#B8A898]">Loading vault…</p>
            ) : vault.length === 0 ? (
              <p className="text-[11px] text-[#B8A898]">No generated images yet.</p>
            ) : (
              vault.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSourceAssetId(item.id);
                    setSourcePreviewUrl(item.imageUrl);
                  }}
                  className={`shrink-0 overflow-hidden rounded-xl border ${sourceAssetId === item.id ? "border-[#111827]" : "border-[#E8DDD0]"}`}
                  style={{ width: 56, height: 56, borderWidth: 2 }}
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
              <div className="flex items-center gap-1 rounded-xl bg-[#F0E8DF] p-1">
                <button onClick={() => { setPhotoMode("selfie"); setModeResult("clothing", null, null); setModeStatus("clothing", "idle"); }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${photoMode === "selfie" ? "bg-[#FDFAF6] text-[#3D2B1F] shadow-[0_1px_4px_rgba(61,43,31,0.12)]" : "bg-transparent text-[#9C7D5B]"}`}>
                  <Sparkles className="h-3.5 w-3.5" /> My Selfie
                </button>
                <button onClick={() => { setPhotoMode("full"); setModeResult("clothing", null, null); setModeStatus("clothing", "idle"); }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${photoMode === "full" ? "bg-[#FDFAF6] text-[#3D2B1F] shadow-[0_1px_4px_rgba(61,43,31,0.12)]" : "bg-transparent text-[#9C7D5B]"}`}>
                  <UserRound className="h-3.5 w-3.5" /> Full Body ✦
                </button>
              </div>

              {photoMode === "selfie" ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#9C7D5B]">Your Photo</p>
                  <div className="relative overflow-hidden rounded-2xl aspect-[3/4]">
                    <Image src={effectiveSourcePhoto} alt="Your photo" fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border border-[rgba(200,169,110,0.2)] bg-[rgba(200,169,110,0.08)] px-3 py-2.5">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C8A96E]" />
                    <p className="text-[11px] leading-snug text-[#9C7D5B]">
                      For better draping, switch to <strong>Full Body</strong> and upload a standing photo.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#9C7D5B]">Full Body Photo</p>
                    {fullBodyFile && (
                      <button onClick={clearFullBody} className="flex items-center gap-1 text-xs text-[#C06B3E] hover:opacity-70">
                        <X className="h-3 w-3" /> Clear
                      </button>
                    )}
                  </div>
                  <UploadZone onFile={handleFullBodyFile} preview={fullBodyPreview} disabled={status === "loading"}
                    label="Upload full-body photo" hint={"Standing, front-facing · plain background\nJPG / PNG / WEBP · max 10 MB"} />
                  <div className="flex items-start gap-2 rounded-xl border border-[rgba(123,160,91,0.2)] bg-[rgba(123,160,91,0.08)] px-3 py-2.5">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7BA05B]" />
                    <p className="text-[11px] leading-snug text-[#7BA05B]">
                      Full-body photos give significantly more accurate garment draping results.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Right: garment + generate */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9C7D5B]">Garment</p>
                {clothFile && (
                  <button onClick={clearGarment} className="flex items-center gap-1 text-xs text-[#C06B3E] hover:opacity-70">
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>
              <UploadZone onFile={handleClothFile} preview={clothPreview} disabled={status === "loading"}
                label="Upload garment photo" hint={"Drag & drop or click\nJPG / PNG / WEBP · max 10 MB"} />
              <button onClick={generateClothing}
                disabled={!clothFile || status === "loading" || (photoMode === "full" && !fullBodyFile)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-semibold text-[#3D2B1F] shadow-[0_2px_12px_rgba(17,24,39,0.35)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="h-4 w-4" /> Try It On</>}
              </button>
              {photoMode === "full" && !fullBodyFile && (
                <p className="text-center text-[11px] text-[#C06B3E]">
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
            <div className="flex flex-col gap-5 p-5 sm:max-h-[640px] sm:overflow-y-auto sm:border-r sm:border-[#F0E8DF]">

                {/* Sub-mode toggle */}
                <div className="flex overflow-hidden rounded-xl border border-[#E8DDD0]">
                  <button
                    onClick={() => setMkSubMode("custom")}
                    className={`flex-1 py-2 text-xs font-semibold transition-all ${mkSubMode === "custom" ? "bg-[#111827] text-white" : "bg-[#FDF6F0] text-[#9C7D5B]"}`}>
                    ✦ Custom Controls
                  </button>
                  <button
                    onClick={() => setMkSubMode("inspo")}
                    className={`flex-1 py-2 text-xs font-semibold transition-all ${mkSubMode === "inspo" ? "bg-[#111827] text-white" : "bg-[#FDF6F0] text-[#9C7D5B]"}`}>
                    ✨ Inspo Transfer
                  </button>
                </div>

                {/* Inspo transfer panel */}
                {mkSubMode === "inspo" && (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 rounded-2xl border border-[#E8DDD0] bg-[#FDF6F0] p-4">
                      <p className="text-xs font-semibold text-[#3D2B1F]">Upload a photo of makeup you love</p>
                      <p className="text-[11px] text-[#9C7D5B]">We&apos;ll analyse the look and apply it to your photo</p>
                      {inspoPreview ? (
                        <div className="relative">
                          <div className="relative w-full overflow-hidden rounded-xl aspect-[4/3]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={inspoPreview} alt="Inspo preview" className="w-full h-full object-cover" />
                          </div>
                          <button
                            type="button"
                            onClick={() => { setInspoFile(null); setInspoPreview(null); setInspoDetectedLook(null); }}
                            className="absolute right-2 top-2 rounded-full bg-[rgba(61,43,31,0.7)] p-1 shadow">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#E8DDD0] py-6 transition-colors hover:bg-pink-50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#111827]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M7 10l5-5 5 5M12 5v10"/></svg>
                          <span className="text-xs font-semibold text-[#9C7D5B]">Tap to upload inspo photo</span>
                          <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setInspoFile(f);
                            const url = URL.createObjectURL(f);
                            setInspoPreview(url);
                            setInspoDetectedLook(null);
                          }} />
                        </label>
                      )}
                      {inspoDetectedLook && (
                        <div className="rounded-xl border border-[rgba(17,24,39,0.18)] bg-[rgba(17,24,39,0.08)] px-3 py-2 text-xs text-[#6B5344]">
                          ✨ Detected look: <strong>{inspoDetectedLook}</strong>
                        </div>
                      )}
                    </div>
                    <button onClick={() => void generateMakeupTransfer()} disabled={!inspoFile || status === "loading"}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-semibold text-[#3D2B1F] shadow-[0_2px_12px_rgba(17,24,39,0.35)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                      {status === "loading"
                        ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Transferring…</>
                        : <>✨ Transfer Makeup</>}
                    </button>
                  </div>
                )}

                {/* Custom controls */}
                {mkSubMode === "custom" && <>
                <section className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "#E8DDD0", background: "#FFFBF8" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "#3D2B1F" }}>Start with a preset</p>
                      <p className="text-[11px]" style={{ color: "#9C7D5B" }}>
                        Pick a ready-made look first. Open fine-tune only if you want deeper control.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedMakeup((value) => !value)}
                      className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
                      style={{ background: "rgba(17,24,39,0.10)", border: "1px solid rgba(17,24,39,0.18)", color: "#7B6E9E" }}
                    >
                      {showAdvancedMakeup ? "Hide fine-tune" : "Fine-tune manually"}
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {MAKEUP_PRESETS.map((preset) => {
                      const active = isMakeupPresetActive(preset);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyMakeupPreset(preset)}
                          disabled={status === "loading"}
                          className="rounded-2xl px-4 py-3 text-left transition-all disabled:opacity-40"
                          style={{
                            background: active ? "#111827" : "#FDF6F0",
                            color: active ? "#fff" : "#3D2B1F",
                            border: active ? "1px solid transparent" : "1px solid #E8DDD0",
                            boxShadow: active ? "0 4px 16px rgba(17,24,39,0.18)" : "none",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold">{preset.label}</span>
                            {active && <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Active</span>}
                          </div>
                          <p className="mt-1 text-[11px] leading-snug" style={{ color: active ? "rgba(255,255,255,0.9)" : "#9C7D5B" }}>
                            {preset.caption}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {!showAdvancedMakeup && (
                    <div className="rounded-xl px-3 py-2 text-[11px]" style={{ background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.18)", color: "#7C5A3A" }}>
                      Current look direction: <strong>{deriveStyle(currentMakeupControls).replaceAll("_", " ")}</strong>
                    </div>
                  )}
                </section>

                {showAdvancedMakeup && <>
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
                        border: mkLip === c.value ? "3px solid #111827" : "2px solid rgba(0,0,0,0.12)",
                        boxShadow: mkLip === c.value ? "0 0 0 2px #FDFAF6, 0 0 0 4px #111827" : "0 1px 3px rgba(0,0,0,0.18)",
                      }} />
                  ))}
                </div>
                <p className="text-[11px] font-medium" style={{ color: "#111827" }}>
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
                        background: mkEye === e.value ? "#111827" : "#F5EDE4",
                        color: mkEye === e.value ? "#3D2B1F" : "#6B5344",
                        border: mkEye === e.value ? "1.5px solid transparent" : "1.5px solid #E0CEBC",
                      }}>
                      <span className="flex gap-0.5 shrink-0">
                        {e.swatches.length > 0
                          ? e.swatches.map((h) => (
                              <span
                                key={`${e.value}-${h}`}
                                className="h-3.5 w-3.5 rounded-full"
                                style={{ background: h }}
                              />
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
                          border: mkBlush === b.value ? "3px solid #111827" : "2px solid rgba(0,0,0,0.08)",
                          boxShadow: mkBlush === b.value ? "0 0 0 2px #FDFAF6, 0 0 0 4px #111827" : "0 1px 3px rgba(0,0,0,0.12)",
                        }}>
                        {!b.hex && <span className="text-[8px]" style={{ color: "#9C7D5B" }}>✕</span>}
                      </div>
                      <span className="text-[9px] text-center w-10 leading-tight"
                        style={{ color: mkBlush === b.value ? "#111827" : "#9C7D5B" }}>
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
                          background: mkBlushInt === b.value ? "#111827" : "#F5EDE4",
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
                          border: mkFoundation === f.value ? "3px solid #111827" : "2px solid rgba(0,0,0,0.08)",
                          boxShadow: mkFoundation === f.value ? "0 0 0 2px #FDFAF6, 0 0 0 4px #111827" : "0 1px 3px rgba(0,0,0,0.12)",
                        }} />
                      <span className="text-[9px] text-center w-10 leading-tight"
                        style={{ color: mkFoundation === f.value ? "#111827" : "#9C7D5B" }}>
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
                    type="button"
                    className="relative ml-auto h-6 w-11 flex-none appearance-none overflow-hidden rounded-full border-0 p-0 transition-colors disabled:opacity-40"
                    style={{ background: mkContour ? "#111827" : "#D8CEC4" }}
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
                        background: mkEyeliner === l.value ? "#111827" : "#F5EDE4",
                        color: mkEyeliner === l.value ? "#3D2B1F" : "#6B5344",
                        border: mkEyeliner === l.value ? "1.5px solid transparent" : "1.5px solid #E0CEBC",
                      }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </section>
              </>}

              {/* Generate button */}
              <button onClick={generateMakeup} disabled={status === "loading"}
                className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#111827", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(17,24,39,0.35)" }}>
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="h-4 w-4" /> Apply Makeup</>}
              </button>
              </>}
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
              <div className="flex overflow-hidden rounded-xl border border-[#E8DDD0]">
                <button
                  onClick={() => setHairSubMode("custom")}
                  className={`flex-1 py-2 text-xs font-semibold transition-all ${hairSubMode === "custom" ? "bg-[#111827] text-white" : "bg-[#FDF6F0] text-[#9C7D5B]"}`}
                >
                  ✦ Custom Controls
                </button>
                {!isCanvas && (
                  <button
                    onClick={() => setHairSubMode("inspo")}
                    className={`flex-1 py-2 text-xs font-semibold transition-all ${hairSubMode === "inspo" ? "bg-[#111827] text-white" : "bg-[#FDF6F0] text-[#9C7D5B]"}`}
                  >
                    ✨ Inspo Transfer
                  </button>
                )}
              </div>

              {hairSubMode === "inspo" && !isCanvas && (
                <>
                  <section className="rounded-2xl border border-[#E8DDD0] bg-[#FDF6F0] p-4 flex flex-col gap-3">
                    <p className="text-xs font-semibold text-[#3D2B1F]">Upload a hairstyle reference photo</p>
                    <p className="text-[11px] text-[#9C7D5B]">We analyze the look and transfer the closest style and color to your photo.</p>
                    {hairInspoPreview ? (
                      <div className="relative">
                        <div className="relative w-full overflow-hidden rounded-xl aspect-[4/3]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={hairInspoPreview} alt="Hair inspo preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setHairInspoFile(null);
                            setHairInspoPreview(null);
                            setHairInspoDetectedLook(null);
                            setHairInspoDetectedStyle(null);
                            setHairInspoDetectedColor(null);
                          }}
                          className="absolute right-2 top-2 rounded-full bg-[rgba(61,43,31,0.7)] p-1 shadow"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#E8DDD0] py-6 transition-colors hover:bg-pink-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#111827]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M7 10l5-5 5 5M12 5v10"/></svg>
                        <span className="text-xs font-semibold text-[#9C7D5B]">Tap to upload hairstyle inspo</span>
                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setHairInspoFile(f);
                          const url = URL.createObjectURL(f);
                          setHairInspoPreview(url);
                          setHairInspoDetectedLook(null);
                          setHairInspoDetectedStyle(null);
                          setHairInspoDetectedColor(null);
                        }} />
                      </label>
                    )}

                    {(hairInspoDetectedLook || hairInspoDetectedStyle || hairInspoDetectedColor) && (
                      <div className="rounded-xl border border-[rgba(17,24,39,0.18)] bg-[rgba(17,24,39,0.08)] px-3 py-2 text-xs text-[#6B5344] flex flex-col gap-1">
                        {hairInspoDetectedLook && <p>✨ Detected look: <strong>{hairInspoDetectedLook}</strong></p>}
                        {(hairInspoDetectedStyle || hairInspoDetectedColor) && (
                          <p>
                            Applied controls: <strong>{hairInspoDetectedStyle ?? "No change"}</strong>
                            {" + "}
                            <strong>{hairInspoDetectedColor ?? "natural"}</strong>
                          </p>
                        )}
                      </div>
                    )}
                  </section>

                  <button onClick={() => void generateHairTransfer()} disabled={!hairInspoFile || status === "loading"}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-semibold text-[#3D2B1F] shadow-[0_2px_12px_rgba(17,24,39,0.35)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                    {status === "loading"
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Transferring…</>
                      : <>✨ Transfer Hairstyle</>}
                  </button>
                </>
              )}

              {hairSubMode === "custom" && <>
              <section className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "#E8DDD0", background: "#FFFBF8" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#3D2B1F" }}>Start with a hair preset</p>
                    <p className="text-[11px]" style={{ color: "#9C7D5B" }}>
                      Pick a direction first, then fine-tune the cut or color only if you need to.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedHair((value) => !value)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
                    style={{ background: "rgba(17,24,39,0.10)", border: "1px solid rgba(17,24,39,0.18)", color: "#7B6E9E" }}
                  >
                    {showAdvancedHair ? "Hide fine-tune" : "Fine-tune manually"}
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {availableHairPresets.map((preset) => {
                    const active = isHairPresetActive(preset);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyHairPreset(preset)}
                        disabled={status === "loading"}
                        className="rounded-2xl px-4 py-3 text-left transition-all disabled:opacity-40"
                        style={{
                          background: active ? "#111827" : "#FDF6F0",
                          color: active ? "#fff" : "#3D2B1F",
                          border: active ? "1px solid transparent" : "1px solid #E8DDD0",
                          boxShadow: active ? "0 4px 16px rgba(17,24,39,0.18)" : "none",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold">{preset.label}</span>
                          {active && <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Active</span>}
                        </div>
                        <p className="mt-1 text-[11px] leading-snug" style={{ color: active ? "rgba(255,255,255,0.9)" : "#9C7D5B" }}>
                          {preset.caption}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {showAdvancedHair && <>
              <StyledDropdown
                label="Target Hairstyle" value={hairStyle}
                options={hairStyleOptions.map((s) => ({ value: s.value, label: s.label }))}
                onChange={(v) => { setHairStyle(v); setModeResult("hair", null, null); setModeStatus("hair", "idle"); }}
                disabled={status === "loading"}
              />
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Hair Color</p>
                <div className="flex flex-wrap gap-2">
                  {HAIR_COLORS.map((c) => (
                    <button key={c.value} type="button" title={c.label}
                      onClick={() => { setHairColor(c.value); setModeResult("hair", null, null); setModeStatus("hair", "idle"); }}
                      disabled={status === "loading"}
                      className="flex flex-col items-center gap-0.5 transition-transform hover:scale-110 focus:outline-none disabled:opacity-40">
                      <div className="h-8 w-8 rounded-full transition-all"
                        style={{
                          backgroundColor: c.hex,
                          border: hairColor === c.value ? "3px solid #111827" : "2px solid rgba(0,0,0,0.12)",
                          boxShadow: hairColor === c.value ? "0 0 0 2px #FDFAF6, 0 0 0 4px #111827" : "0 1px 3px rgba(0,0,0,0.15)",
                        }} />
                      <span className="text-[7px] leading-tight max-w-[32px] text-center"
                        style={{ color: hairColor === c.value ? "#111827" : "#B8A898" }}>
                        {c.label.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              </>}
              {currentHairColor && (
                <p className="text-xs" style={{ color: "#9C7D5B" }}>
                  Selected: <strong>{currentHairColor.label}</strong>
                  {hairStyle !== "No change" ? ` + ${HAIR_STYLE_OPTIONS.find((s) => s.value === hairStyle)?.label}` : ""}
                </p>
              )}
              <button onClick={generateHair} disabled={status === "loading"}
                className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#111827", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(17,24,39,0.35)" }}>
                {status === "loading"
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="h-4 w-4" /> Try Hair Look</>}
              </button>
              </>}
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

        {/* ── AR mode (beta) ── */}
        {mode === "ar" && (
          <div className="p-5">
            <div
              className="rounded-3xl border p-5"
              style={{ background: "linear-gradient(145deg, rgba(17,24,39,0.06), rgba(34,211,238,0.08))", borderColor: "#E8DDD0" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>AR Beta (realtime overlay + capture)</p>
              <h3 className="mt-2 text-xl font-semibold" style={{ color: "#3D2B1F" }}>Align in realtime, then render a high-quality try-on</h3>
              <p className="mt-2 text-sm" style={{ color: "#9C7D5B" }}>
                A live overlay helps framing before capture. Final output still uses the full server-quality generation pipeline.
              </p>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border p-3" style={{ borderColor: "#E8DDD0", background: "#FFFDFA" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#9C7D5B" }}>Live camera</p>
                  <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "3/4", background: "#111827" }}>
                    {cameraStatus === "ready" ? (
                      <>
                        <video ref={arVideoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
                        <canvas ref={arOverlayCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                        <VideoOff className="h-6 w-6" style={{ color: "#E8DDD0" }} />
                        <p className="text-xs" style={{ color: "#E8DDD0" }}>
                          {cameraStatus === "requesting"
                            ? "Requesting camera permission..."
                            : cameraStatus === "blocked"
                              ? "Camera blocked. Allow permission and retry."
                              : "Camera is not active."}
                        </p>
                      </div>
                    )}
                  </div>
                  <canvas ref={arCanvasRef} className="hidden" />
                  <p className="mt-2 text-[11px]" style={{ color: "#9C7D5B" }}>{arOverlayMessage}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void startArCamera()}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{ background: "rgba(17,24,39,0.10)", color: "#111827", border: "1px solid rgba(17,24,39,0.18)" }}
                    >
                      <Camera className="h-3.5 w-3.5" /> Start camera
                    </button>
                    <button
                      onClick={() => void captureArFrame()}
                      disabled={cameraStatus !== "ready"}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                      style={{ background: "#111827", color: "#3D2B1F" }}
                    >
                      <Camera className="h-3.5 w-3.5" /> Capture frame
                    </button>
                    <button
                      onClick={clearArFrame}
                      disabled={!arFrameFile}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                      style={{ background: "rgba(17,24,39,0.08)", color: "#111827" }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retake
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border p-3" style={{ borderColor: "#E8DDD0", background: "#FFFDFA" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#9C7D5B" }}>Captured frame + frame reference</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[11px]" style={{ color: "#9C7D5B" }}>Your captured frame</p>
                      <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "3/4", background: "#F5EFE7" }}>
                        {arFramePreview ? (
                          <Image src={arFramePreview} alt="Captured AR frame" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-[11px]" style={{ color: "#B8A898" }}>
                            Capture a frame to continue
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-[11px]" style={{ color: "#9C7D5B" }}>Glasses reference image</p>
                      <UploadZone
                        onFile={handleClothFile}
                        preview={clothPreview}
                        disabled={status === "loading"}
                        label={clothFile ? "Change reference" : "Upload glasses image"}
                        hint={"Front-facing product photo works best"}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => void generateArGlasses()}
                    disabled={!arFrameFile || !clothFile || status === "loading"}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: "#111827", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(17,24,39,0.35)" }}
                  >
                    {status === "loading"
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                      : <><Wand2 className="h-4 w-4" /> Render try-on from captured frame</>}
                  </button>

                  {cameraError ? (
                    <div className="mt-3 rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(192,107,62,0.10)", color: "#C06B3E" }}>
                      {cameraError}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Outfit Generator mode ── */}
        {mode === "outfit" && (
          <div className="p-5">
            <div className="rounded-3xl border p-5" style={{ borderColor: "#E8DDD0", background: "#FFFBF8" }}>
              <section className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: "#E8DDD0", background: "#FFFDFA" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#3D2B1F" }}>Start with an outfit preset</p>
                    <p className="text-[11px]" style={{ color: "#9C7D5B" }}>
                      Choose the moment first. Use fine-tune only when you want to control the mix yourself.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOutfit((value) => !value)}
                    className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
                    style={{ background: "rgba(17,24,39,0.10)", border: "1px solid rgba(17,24,39,0.18)", color: "#7B6E9E" }}
                  >
                    {showAdvancedOutfit ? "Hide fine-tune" : "Fine-tune manually"}
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {OUTFIT_PRESETS.map((preset) => {
                    const active = isOutfitPresetActive(preset);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyOutfitPreset(preset)}
                        disabled={outfitLoading}
                        className="rounded-2xl px-4 py-3 text-left transition-all disabled:opacity-40"
                        style={{
                          background: active ? "#111827" : "#FDF6F0",
                          color: active ? "#fff" : "#3D2B1F",
                          border: active ? "1px solid transparent" : "1px solid #E8DDD0",
                          boxShadow: active ? "0 4px 16px rgba(249,115,22,0.18)" : "none",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold">{preset.label}</span>
                          {active && <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Active</span>}
                        </div>
                        <p className="mt-1 text-[11px] leading-snug" style={{ color: active ? "rgba(255,255,255,0.9)" : "#9C7D5B" }}>
                          {preset.caption}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {showAdvancedOutfit && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StyledDropdown
                    label="Occasion"
                    value={outfitOccasion}
                    options={[
                      { value: "casual", label: "Casual" },
                      { value: "work", label: "Work" },
                      { value: "date", label: "Date" },
                      { value: "wedding", label: "Wedding" },
                      { value: "travel", label: "Travel" },
                    ]}
                    onChange={(v) => setOutfitOccasion(v as OutfitOccasion)}
                    disabled={outfitLoading}
                  />
                  <StyledDropdown
                    label="Vibe"
                    value={outfitVibe}
                    options={[
                      { value: "minimal", label: "Minimal" },
                      { value: "classic", label: "Classic" },
                      { value: "bold", label: "Bold" },
                      { value: "romantic", label: "Romantic" },
                      { value: "street", label: "Street" },
                    ]}
                    onChange={(v) => setOutfitVibe(v as OutfitVibe)}
                    disabled={outfitLoading}
                  />
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.14)" }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#3D2B1F" }}>Current direction</p>
                  <p className="text-[11px]" style={{ color: "#9C7D5B" }}>
                    {outfitOccasion} occasion · {outfitVibe} vibe
                  </p>
                </div>
                <button
                  onClick={() => { void generateOutfits(); }}
                  disabled={outfitLoading}
                  className="shrink-0 flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: "#111827", color: "#3D2B1F", boxShadow: "0 2px 12px rgba(17,24,39,0.35)" }}>
                  {outfitLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                    : <><Sparkles className="h-4 w-4" /> Generate Outfits</>}
                </button>
              </div>

              {outfitError && (
                <div className="mt-3 rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(192,107,62,0.10)", color: "#C06B3E" }}>
                  {outfitError}
                </div>
              )}

              <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: "#E8DDD0", background: "#FFF8F2" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>
                  Recent Outfit Generations
                </p>
                {outfitHistoryLoading ? (
                  <p className="mt-2 text-xs" style={{ color: "#B8A898" }}>Loading history…</p>
                ) : outfitHistory.length === 0 ? (
                  <p className="mt-2 text-xs" style={{ color: "#B8A898" }}>No saved outfit sets yet.</p>
                ) : (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {outfitHistory.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => {
                          setOutfitOccasion(session.occasion);
                          setOutfitVibe(session.vibe);
                          setOutfitLooks(session.looks);
                          setOutfitError(null);
                        }}
                        className="shrink-0 rounded-xl px-3 py-2 text-left border transition-all hover:opacity-90 cursor-pointer"
                        style={{ minWidth: 180, borderColor: "#E8DDD0", background: "#FFFDFA" }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setOutfitOccasion(session.occasion);
                            setOutfitVibe(session.vibe);
                            setOutfitLooks(session.looks);
                            setOutfitError(null);
                          }
                        }}
                      >
                        <p className="text-[11px] font-semibold" style={{ color: "#3D2B1F" }}>
                          {session.occasion} · {session.vibe}
                        </p>
                        <p className="text-[10px]" style={{ color: "#9C7D5B" }}>
                          {new Date(session.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: "#111827" }}>
                          {session.season} · {session.undertone}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void setOutfitFeedback(session.id, "liked"); }}
                            className="rounded-full px-2 py-1 text-[9px] font-semibold"
                            style={{
                              background: (session.feedback?.liked ?? false) ? "rgba(17,24,39,0.18)" : "rgba(17,24,39,0.08)",
                              color: "#111827",
                            }}
                          >
                            {(session.feedback?.liked ?? false) ? "Liked" : "Like"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void setOutfitFeedback(session.id, "saved"); }}
                            className="rounded-full px-2 py-1 text-[9px] font-semibold"
                            style={{
                              background: (session.feedback?.saved ?? false) ? "rgba(17,24,39,0.18)" : "rgba(17,24,39,0.08)",
                              color: "#111827",
                            }}
                          >
                            {(session.feedback?.saved ?? false) ? "Saved" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void setOutfitFeedback(session.id, "worn"); }}
                            className="rounded-full px-2 py-1 text-[9px] font-semibold"
                            style={{
                              background: (session.feedback?.worn ?? false) ? "rgba(16,185,129,0.18)" : "rgba(16,185,129,0.08)",
                              color: "#10B981",
                            }}
                          >
                            {(session.feedback?.worn ?? false) ? "Worn" : "Wear"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {outfitLooks.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {outfitLooks.map((look, i) => (
                    <div key={`${look.title}-${i}`} className="rounded-2xl p-3 border" style={{ borderColor: "#E8DDD0", background: "#FFFDF9" }}>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>
                        Look {i + 1}
                      </p>
                      <h4 className="mt-1 text-sm font-semibold" style={{ color: "#3D2B1F" }}>{look.title}</h4>
                      <ul className="mt-2 space-y-1">
                        {look.pieces.map((piece) => (
                          <li key={piece} className="text-xs" style={{ color: "#7C5A3A" }}>• {piece}</li>
                        ))}
                      </ul>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {look.accentColors.map((c) => (
                          <span key={`${c.name}-${c.hex}`} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] border" style={{ borderColor: "#E8DDD0", color: "#7C5A3A" }}>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.hex }} /> {c.name}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px]" style={{ color: "#9C7D5B" }}>{look.whyItWorks}</p>
                      <p className="mt-1 text-[11px] font-medium" style={{ color: "#111827" }}>Metal: {look.metal}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {/* ── Batch Results & Comparison Tray ── */}
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>Batch Results</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={undoCurrentMode}
                disabled={!canUndo}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all disabled:opacity-40"
                style={{ background: "#F5EFE7", color: "#7C5A3A" }}
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </button>
              <button
                type="button"
                onClick={redoCurrentMode}
                disabled={!canRedo}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all disabled:opacity-40"
                style={{ background: "#F5EFE7", color: "#7C5A3A" }}
              >
                <Redo2 className="h-3.5 w-3.5" /> Redo
              </button>
              {currentBatch.length > 1 && (
                <button
                  className="text-xs font-medium px-3 py-1 rounded-full transition-all hover:opacity-80"
                  style={{ background: "#F5EFE7", color: "#111827" }}
                  onClick={() => setSelectedIndexes(mode, currentBatch.map((_, i) => i))}
                >
                  Select All
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {currentBatch.map((result, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl border-2 transition-all"
                style={{
                  minWidth: 120,
                  borderColor: normalizedActiveIndex === idx
                    ? "#111827"
                    : selectedBatchIndexes[mode].includes(idx)
                      ? "#C8A96E"
                      : "#E8DDD0",
                }}
              >
                <div onClick={() => {
                  const selected = selectedBatchIndexes[mode];
                  setSelectedIndexes(mode, selected.includes(idx)
                    ? selected.filter(i => i !== idx)
                    : [...selected, idx]);
                }}
                  className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 border-iris bg-white flex items-center justify-center cursor-pointer"
                  style={{ boxShadow: "0 1px 4px rgba(17,24,39,0.10)" }}
                >
                  {selectedBatchIndexes[mode].includes(idx) && <span className="block w-3 h-3 rounded-full bg-iris" />}
                </div>
                <ResultPanel
                  url={result.hdUrl || result.lowResUrl}
                  hdUrl={result.hdUrl}
                  lowResUrl={result.lowResUrl}
                  beforeUrl={sourcePreviewUrl ?? photoUrl}
                  status={result.status}
                  onRetry={retryCurrentMode}
                  onDownload={() => { void downloadBatchResult(result, mode, idx); }}
                  isDownloading={false}
                  isHdPending={!result.hdUrl && !!result.lowResUrl}
                />
                <button
                  type="button"
                  onClick={() => setActiveBatchIndex((prev) => ({ ...prev, [mode]: idx }))}
                  className="absolute bottom-2 left-2 rounded-full px-2 py-1 text-[10px] font-semibold"
                  style={{ background: "rgba(61,43,31,0.72)", color: "#FAF6F0" }}
                >
                  {normalizedActiveIndex === idx ? "Active" : "Set Active"}
                </button>
              </div>
            ))}
          </div>
          <TryTheseNext
            presets={tryNextPresets}
            loading={status === "loading"}
            onSelect={(preset) => {
              if (preset.mode === "hair") {
                const hairPreset = HAIR_PRESETS.find((p) => p.id === preset.variant);
                if (hairPreset) applyHairPreset(hairPreset);
                void generateHair();
              } else {
                const mkPreset = MAKEUP_PRESETS.find((p) => p.id === preset.variant);
                if (mkPreset) applyMakeupPreset(mkPreset);
                void generateMakeup();
              }
            }}
          />
          {selectedBatchIndexes[mode].length > 1 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedBatchIndexes[mode].map((idx) => {
                const item = currentBatch[idx];
                const compareUrl = item?.hdUrl || item?.lowResUrl;
                if (!item || !compareUrl) return null;
                return (
                  <div key={`compare-${idx}`} className="rounded-2xl overflow-hidden border" style={{ borderColor: "#E8DDD0" }}>
                    <Image
                      src={compareUrl}
                      alt={`Comparison ${idx + 1}`}
                      width={480}
                      height={480}
                      className="w-full h-auto object-cover"
                      unoptimized
                    />
                    <div className="px-3 py-2 text-[11px] font-medium" style={{ color: "#9C7D5B", background: "#FAF6F0" }}>
                      Variation {idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {selectedBatchIndexes[mode].length > 1 && (
            <div className="mt-3 flex gap-2">
              <button
                className="px-4 py-2 rounded-full bg-iris text-white font-medium text-xs transition-all hover:opacity-90"
                type="button"
                onClick={() => setBatchCompareOpen(true)}
              >
                Compare Selected
              </button>
              <button
                className="px-4 py-2 rounded-full bg-chrome text-white font-medium text-xs transition-all hover:opacity-90"
                onClick={() => {
                  selectedBatchIndexes[mode].forEach((idx) => {
                    const item = currentBatch[idx];
                    if (item) {
                      void downloadBatchResult(item, mode, idx);
                    }
                  });
                }}
              >
                Download Selected
              </button>
            </div>
          )}
        </div>

        {/* ── History strip ── */}
        <HistoryStrip
          history={history}
          currentUrl={resultUrl}
          onSelect={(item) => {
            const nextIndex = batchResults[mode].length;
            addBatchResult(mode, {
              hdUrl: item.url,
              lowResUrl: null,
              assetId: item.assetId ?? null,
              status: "done",
              params: { fromHistory: true },
            });
            setActiveBatchIndex((prev) => ({ ...prev, [mode]: nextIndex }));
            if (item.assetId) {
              setSourceAssetId(item.assetId);
              setSourcePreviewUrl(item.url);
            }
          }}
          onClear={() => setHistory([])}
          onUseAsSource={(item) => {
            if (!item.assetId) return;
            setSourceAssetId(item.assetId);
            setSourcePreviewUrl(item.url);
          }}
          onDownload={(item) => {
            window.open(item.url, "_blank", "noopener,noreferrer");
          }}
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
          {mode === "ar" && [
            "Capture a stable front-facing frame before generating",
            "Upload a clear glasses reference image (front view works best)",
            "Generated AR results are saved in your Studio history and vault",
          ].map((tip) => (
            <p key={tip} className="text-[11px]" style={{ color: "#B8A898" }}>✦ {tip}</p>
          ))}
          {mode === "outfit" && [
            "Pick a preset first, then fine-tune occasion and vibe",
            "Generated looks are saved to your outfit history for quick reuse",
            "Use the source selector to build on your best previous result",
          ].map((tip) => (
            <p key={tip} className="text-[11px]" style={{ color: "#B8A898" }}>✦ {tip}</p>
          ))}
        </div>
      </div>

      {batchCompareOpen && selectedBatchIndexes[mode].length > 1 ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(17,24,39,0.55)" }}
          onClick={() => setBatchCompareOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#3D2B1F]">Compare selected variations</p>
              <button type="button" onClick={() => setBatchCompareOpen(false)} className="rounded-full p-1 hover:opacity-70">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedBatchIndexes[mode].map((idx) => {
                const item = batchResults[mode][idx];
                const url = item?.lowResUrl ?? item?.hdUrl;
                if (!url) return null;
                return (
                  <div key={idx} className="overflow-hidden rounded-2xl border" style={{ borderColor: "#E8DDD0" }}>
                    <div className="relative aspect-[3/4]">
                      <Image src={url} alt={`Variation ${idx + 1}`} fill unoptimized className="object-cover" />
                    </div>
                    <p className="px-3 py-2 text-xs font-medium" style={{ color: "#9C7D5B" }}>Variation {idx + 1}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
