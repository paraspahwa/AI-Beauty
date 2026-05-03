"use client";

import Image from "next/image";
import { Check, X, Shirt, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import type { ColorAnalysisResult } from "@/types/report";

/* ─── helpers ──────────────────────────────────────────────────────────── */
/** Lighten a hex color by mixing with white */
function lightenHex(hex: string, pct: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * pct);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/* ─── Dress Preview Modal ──────────────────────────────────────────────── */
function DressPreviewModal({
  open,
  onClose,
  colorName,
  colorHex,
  imageUrl,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  colorName: string;
  colorHex: string;
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#FDFAF6", maxWidth: 420, width: "100%", border: "1px solid #E8DDD0" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #E8DDD0" }}>
          <span className="h-5 w-5 rounded-full flex-shrink-0" style={{ backgroundColor: colorHex, border: "2px solid #fff", boxShadow: "0 0 0 1px #E8DDD0" }} />
          <p className="font-bold text-sm" style={{ color: "#3D2B1F" }}>{colorName} — Virtual Try-On</p>
          <button onClick={onClose} className="ml-auto text-xl leading-none" style={{ color: "#9C7D5B" }}>✕</button>
        </div>

        {/* Image area */}
        <div className="relative flex items-center justify-center" style={{ minHeight: 340, background: "#EDE3D8" }}>
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#9C7D5B" }} />
              <p className="text-sm" style={{ color: "#6B5344" }}>Generating your look…</p>
            </div>
          )}
          {error && !loading && (
            <p className="text-sm px-6 text-center" style={{ color: "#C06B3E" }}>{error}</p>
          )}
          {imageUrl && !loading && (
            <Image src={imageUrl} alt={`Try-on: ${colorName}`} fill unoptimized className="object-contain" />
          )}
        </div>

        <p className="text-[10px] text-center px-4 py-2.5" style={{ color: "#9C7D5B" }}>
          AI-generated preview · actual result may vary
        </p>
      </div>
    </div>
  );
}


/* ─── Characteristic icons ─────────────────────────────────────────────── */
function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-7 w-7">
      <circle cx="12" cy="12" r="4" />
      {[0,45,90,135,180,225,270,315].map((deg) => (
        <line key={deg}
          x1={12 + 7 * Math.cos(deg * Math.PI / 180)}
          y1={12 + 7 * Math.sin(deg * Math.PI / 180)}
          x2={12 + 9.5 * Math.cos(deg * Math.PI / 180)}
          y2={12 + 9.5 * Math.sin(deg * Math.PI / 180)}
          strokeLinecap="round" />
      ))}
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-7 w-7">
      <path d="M12 22C12 22 4 16 4 10a8 8 0 0 1 16 0c0 6-8 12-8 12z" />
      <path d="M12 22V10" strokeDasharray="2 2" />
    </svg>
  );
}
function IconHalfCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-7 w-7">
      <path d="M12 4a8 8 0 0 1 0 16" />
      <path d="M12 4a8 8 0 0 0 0 16" strokeDasharray="2 2" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

/* ─── Metal ring icon ──────────────────────────────────────────────────── */
function MetalRing({ gradient }: { gradient: string }) {
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 drop-shadow-md">
      <defs>
        <linearGradient id={`mg-${gradient.slice(0,6)}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={gradient.split(",")[0] ?? "#E8C96A"} />
          <stop offset="100%" stopColor={gradient.split(",")[1] ?? "#C9A83C"} />
        </linearGradient>
      </defs>
      {/* outer ring */}
      <circle cx="28" cy="28" r="24" fill={`url(#mg-${gradient.slice(0,6)})`} />
      {/* inner cutout */}
      <circle cx="28" cy="28" r="16" fill="#F9F5F0" />
      {/* inner ring highlight */}
      <circle cx="28" cy="28" r="14" fill="none" stroke={gradient.split(",")[0] ?? "#E8C96A"} strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

/* ─── Print swatch (circular patterned) ────────────────────────────────── */
const PRINT_SWATCHES = [
  { label: "Soft Florals",    bg: "#B36B4A", pat: "#D4956A" },
  { label: "Muted Paisley",   bg: "#5A7E6E", pat: "#7AABA0" },
  { label: "Earthy Jacquard", bg: "#C8A96E", pat: "#E0CDA0" },
];

function PrintSwatch({ bg, pat, label }: { bg: string; pat: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 56 56" className="h-14 w-14 drop-shadow-md">
        <defs>
          <clipPath id={`cp-${bg.replace("#","")}`}>
            <circle cx="28" cy="28" r="26" />
          </clipPath>
        </defs>
        <circle cx="28" cy="28" r="26" fill={bg} />
        {/* simple floral/pattern marks */}
        {[
          [16,16],[40,16],[28,28],[16,40],[40,40],[28,12],[28,44],
        ].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="4.5" fill={pat} opacity="0.7"
            clipPath={`url(#cp-${bg.replace("#","")})`} />
        ))}
        <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="1.5" />
      </svg>
      <span className="text-[10px] text-center leading-tight max-w-[52px]" style={{ color: "#6B5344" }}>{label}</span>
    </div>
  );
}

/* ─── Makeup icons ─────────────────────────────────────────────────────── */
function MakeupBlush({ hex }: { hex: string }) {
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 drop-shadow-md">
      <circle cx="28" cy="28" r="26" fill={hex} />
      <ellipse cx="28" cy="32" rx="14" ry="8" fill={hex} stroke="#fff" strokeWidth="1.2" opacity="0.7" />
      <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}
function MakeupEyeshadow({ hex }: { hex: string }) {
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 drop-shadow-md">
      <circle cx="28" cy="28" r="26" fill={hex} />
      <path d="M10 30 Q28 18 46 30" fill={hex} stroke="#fff" strokeWidth="1.3" opacity="0.8" />
      <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}
function MakeupLip({ hex }: { hex: string }) {
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 drop-shadow-md">
      <circle cx="28" cy="28" r="26" fill={hex} />
      <path d="M12 28 C16 20 22 18 28 22 C34 18 40 20 44 28 C40 38 34 40 28 36 C22 40 16 38 12 28Z"
        fill="#fff" opacity="0.25" />
      <path d="M18 28 C22 23 28 23 28 28" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.6" />
      <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

const MAKEUP_LABELS = ["Peachy\nBlush", "Warm Brown\nEyeshadow", "Coral Nude\nLip"];

/* ─── Comparison photo card ─────────────────────────────────────────────── */
/**
 * Uses CSS mix-blend-mode:color + clip-path to recolor the clothing area.
 * This preserves the actual fabric texture/folds/shadows from the photo
 * while changing the hue — far more photorealistic than a solid SVG fill.
 *
 * clip-path polygon coordinates (% units):
 *   Shoulder line ~65% down from top, shallow scoop-neck at 70% center.
 *   All values are percentages of the element's own width/height.
 */
function ColorSwatch({
  hex,
  name,
  photoUrl,
  onTryOn,
}: {
  hex: string;
  name: string;
  photoUrl?: string;
  onTryOn?: () => void;
}) {
  const shades = [hex, lightenHex(hex, 0.18), lightenHex(hex, 0.36), lightenHex(hex, 0.55)];

  // Clothing region clip-path (percentage coords on the card image):
  //   Left edge at 65% → peak shoulder at 58% (20% from left) →
  //   neckline left at 62% (35%) → scoop bottom at 68% (50%) →
  //   neckline right at 62% (65%) → peak shoulder at 58% (80%) →
  //   right edge at 65% → bottom-right → bottom-left
  const clothingClip = [
    "0% 65%",
    "20% 58%",
    "35% 62%",
    "50% 68%",
    "65% 62%",
    "80% 58%",
    "100% 65%",
    "100% 100%",
    "0% 100%",
  ].join(", ");

  return (
    <div
      className="flex flex-col overflow-hidden group"
      style={{ border: "1.5px solid #E8DDD0", borderRadius: 10, background: "#fff" }}
    >
      {/* Photo + blend-mode clothing overlay */}
      <div
        className="relative w-full"
        style={{ aspectRatio: "3/4", overflow: "hidden", isolation: "isolate" }}
      >
        {photoUrl ? (
          <>
            <Image
              src={photoUrl}
              alt={name}
              fill
              unoptimized
              className="object-cover"
              style={{ objectPosition: "top center" }}
            />
            {/*
              mix-blend-mode: "color" keeps the photo's luminance (shadows, highlights,
              fabric wrinkles) but replaces the hue+saturation with the palette color.
              clip-path carves out only the clothing region — face/hair untouched.
            */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: hex,
                mixBlendMode: "color",
                opacity: 0.9,
                clipPath: `polygon(${clothingClip})`,
                pointerEvents: "none",
              }}
            />
          </>
        ) : (
          /* No photo fallback — solid color block with clip shape */
          <div style={{ position: "absolute", inset: 0, background: "#EDE3D8" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: hex,
                opacity: 0.88,
                clipPath: `polygon(${clothingClip})`,
              }}
            />
          </div>
        )}

        {/* Color name label */}
        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: "rgba(0,0,0,0.32)" }}>
          <span className="text-[8px] font-semibold text-white truncate block leading-tight">{name}</span>
        </div>

        {/* Try-On button — appears on hover */}
        {onTryOn && (
          <button
            onClick={onTryOn}
            title="AI Virtual Try-On"
            className="absolute top-1 right-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(255,255,255,0.92)", border: "1px solid #E8DDD0", fontSize: 9, color: "#3D2B1F" }}
          >
            <Shirt style={{ width: 10, height: 10 }} />
            <span>Try On</span>
          </button>
        )}
      </div>

      {/* 4-shade strip */}
      <div className="flex" style={{ height: 9 }}>
        {shades.map((s, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: s }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export function ColorAnalysisCard({
  data,
  photoUrl,
  reportId,
}: {
  data: ColorAnalysisResult;
  photoUrl?: string;
  /** If provided, "Try On" buttons appear and call the dress-preview API */
  reportId?: string;
}) {
  /* ── Try-On modal state ─────────────────────────────────────── */
  const [modal, setModal] = useState<{
    open: boolean;
    colorName: string;
    colorHex: string;
    imageUrl: string | null;
    loading: boolean;
    error: string | null;
  }>({ open: false, colorName: "", colorHex: "", imageUrl: null, loading: false, error: null });

  const tryOn = useCallback(
    async (colorName: string, colorHex: string) => {
      if (!reportId) return;
      setModal({ open: true, colorName, colorHex, imageUrl: null, loading: true, error: null });
      try {
        const res = await fetch(`/api/reports/${reportId}/dress-preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ colorName, colorHex }),
        });
        const json = await res.json() as { imageUrl?: string; error?: string };
        if (!res.ok || !json.imageUrl) throw new Error(json.error ?? "Generation failed");
        setModal((m) => ({ ...m, loading: false, imageUrl: json.imageUrl! }));
      } catch (err) {
        setModal((m) => ({ ...m, loading: false, error: (err as Error).message }));
      }
    },
    [reportId],
  );

  const closeModal = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  const neutrals = [
    { hex: "#F2EDE4" }, { hex: "#DDD0C0" }, { hex: "#B0A090" }, { hex: "#8B7D6B" }, { hex: "#5C4F40" },
  ];

  const bestSix  = data.palette.slice(0, 6);
  const avoidSix = data.avoidColors.slice(0, 6);

  const undertoneLabel =
    data.undertone === "Warm" ? "Warm" :
    data.undertone === "Cool" ? "Cool" : "Neutral";

  const characteristics = [
    { icon: <IconSun />,        label: undertoneLabel },
    { icon: <IconLeaf />,       label: "Muted" },
    { icon: <IconHalfCircle />, label: "Soft" },
  ];

  const makeupColors = data.palette.slice(0, 3);

  const pill = "px-4 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-semibold inline-block";
  const pillStyle = { background: "#F0E8DC", color: "#9C7D5B", border: "1px solid #E8DDD0" };
  const sectionTitle = "text-[10px] uppercase tracking-[0.16em] font-bold";

  const metalGradients: Record<string, [string, string]> = {
    gold:    ["#E8C96A", "#C9A83C"],
    rose:    ["#E8B4A0", "#C98070"],
    silver:  ["#E0E0E0", "#9A9A9A"],
    bronze:  ["#C8956B", "#8B5E3C"],
    copper:  ["#D4836A", "#A0503A"],
    platinum:["#D8D8D8", "#A8A8A8"],
  };
  function metalGrad(m: string): string {
    const key = Object.keys(metalGradients).find((k) => m.toLowerCase().includes(k)) ?? "gold";
    return metalGradients[key].join(",");
  }

  return (
    <>
      <DressPreviewModal
        open={modal.open}
        onClose={closeModal}
        colorName={modal.colorName}
        colorHex={modal.colorHex}
        imageUrl={modal.imageUrl}
        loading={modal.loading}
        error={modal.error}
      />

      <div className="overflow-hidden" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", borderRadius: 20 }}>

      {/* ── Top half: photo LEFT + info RIGHT ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row" style={{ minHeight: 380 }}>

        {/* Photo — fills left half, same height as info panel */}
        <div
          className="relative flex-shrink-0"
          style={{
            width: "42%",
            minWidth: 200,
            background: "#EDE3D8",
          }}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt="Your photo"
              fill
              unoptimized
              className="object-cover"
              style={{ objectPosition: "top center" }}
            />
          ) : (
            <div className="flex h-full items-center justify-center" style={{ color: "#9C7D5B" }}>No photo</div>
          )}
        </div>

        {/* Info panel */}
        <div
          className="flex flex-col justify-center gap-3 px-5 py-5 flex-1"
          style={{ background: "#FDFAF6" }}
        >
          {/* Big heading */}
          <h2
            className="text-right text-[1.4rem] font-black uppercase tracking-[0.2em]"
            style={{ color: "#3D2B1F", letterSpacing: "0.18em" }}
          >
            Color Analysis
          </h2>

          {/* Season pill + name */}
          <div className="flex flex-col items-center gap-0.5">
            <span className={pill} style={pillStyle}>Season</span>
            <p
              className="text-[1.6rem] font-black uppercase tracking-[0.05em] text-center leading-tight"
              style={{ color: "#3D2B1F" }}
            >
              {data.season}
            </p>
          </div>

          {/* 4 key palette dots */}
          <div className="flex justify-center gap-2">
            {data.palette.slice(0, 4).map((c) => (
              <span
                key={c.hex}
                className="h-10 w-10 rounded-full"
                style={{ backgroundColor: c.hex, border: "3px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", display: "inline-block" }}
                title={c.name}
              />
            ))}
          </div>

          {/* Characteristics */}
          <div className="flex flex-col items-center gap-1">
            <span className={pill} style={pillStyle}>Characteristics</span>
            <div className="flex gap-5 justify-center mt-0.5">
              {characteristics.map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-0">
                  <span style={{ color: "#9C7D5B" }}>{c.icon}</span>
                  <span className="text-[10px]" style={{ color: "#6B5344" }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Best Neutrals */}
          <div className="flex flex-col items-center gap-1">
            <span className={pill} style={pillStyle}>Best Neutrals</span>
            <div className="flex gap-2 justify-center mt-0.5">
              {neutrals.map((n) => (
                <span
                  key={n.hex}
                  className="h-7 w-7 rounded-full"
                  style={{ backgroundColor: n.hex, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", display: "inline-block" }}
                />
              ))}
            </div>
          </div>

          {/* Clothing observation */}
          {data.clothingObservation && (
            <div
              className="flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{
                background: data.clothingObservation.effect === "flattering"
                  ? "rgba(123,160,91,0.1)" : data.clothingObservation.effect === "clashing"
                  ? "rgba(192,107,62,0.1)" : "rgba(200,169,110,0.1)",
                border: `1px solid ${data.clothingObservation.effect === "flattering"
                  ? "rgba(123,160,91,0.3)" : data.clothingObservation.effect === "clashing"
                  ? "rgba(192,107,62,0.3)" : "rgba(200,169,110,0.25)"}`,
              }}
            >
              <span
                className="h-5 w-5 shrink-0 rounded-full"
                style={{ backgroundColor: data.clothingObservation.hex, border: "2px solid #fff", display: "inline-block" }}
              />
              <p className="text-[10px] leading-snug" style={{ color: "#3D2B1F" }}>
                <span className="font-semibold">{data.clothingObservation.color}</span>
                {data.clothingObservation.effect === "flattering"
                  ? " — flattering for your palette"
                  : data.clothingObservation.effect === "clashing"
                  ? " — clashes with your coloring"
                  : " — neutral for your season"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── COLOR COMPARISON divider ─────────────────────────────────────── */}
      <div
        className="flex items-center justify-center gap-3 py-3 px-6"
        style={{ background: "#F5EFE7", borderTop: "1px solid #E8DDD0", borderBottom: "1px solid #E8DDD0" }}
      >
        <span style={{ color: "#C8A96E", fontSize: 12 }}>✦</span>
        <p className={sectionTitle} style={{ color: "#9C7D5B", letterSpacing: "0.22em" }}>Color Comparison</p>
        <span style={{ color: "#C8A96E", fontSize: 12 }}>✦</span>
      </div>

      {/* ── Best Colors ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: "#7BA05B" }}
          >
            <Check className="h-3 w-3 text-white" />
          </span>
          <p className={sectionTitle} style={{ color: "#3D2B1F" }}>Best Colors</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {bestSix.map((c) => (
            <ColorSwatch
              key={c.hex}
              hex={c.hex}
              name={c.name}
              photoUrl={photoUrl}
              onTryOn={reportId ? () => tryOn(c.name, c.hex) : undefined}
            />
          ))}
        </div>
      </div>

      {/* ── Less Flattering ──────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: "#C06B3E" }}
          >
            <X className="h-3 w-3 text-white" />
          </span>
          <p className={sectionTitle} style={{ color: "#3D2B1F" }}>Less Flattering</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {avoidSix.map((c) => (
            <ColorSwatch key={c.hex} hex={c.hex} name={c.name} photoUrl={photoUrl} />
          ))}
        </div>
      </div>

      {/* ── Bottom 3-col: Metals | Prints | Makeup ───────────────────────── */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3"
        style={{ borderTop: "none" }}
      >
        {/* Best Metals */}
        <div
          className="flex flex-col items-center gap-3 py-6 px-5"
          style={{ borderRight: "1px solid #E8DDD0" }}
        >
          <p className={sectionTitle} style={{ color: "#9C7D5B" }}>Best Metals</p>
          <div className="flex gap-6 justify-center">
            {data.metals.slice(0, 2).map((metal) => (
              <div key={metal} className="flex flex-col items-center gap-1.5">
                <MetalRing gradient={metalGrad(metal)} />
                <span className="text-[11px] font-medium" style={{ color: "#3D2B1F" }}>{metal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Prints */}
        <div
          className="flex flex-col items-center gap-3 py-6 px-5"
          style={{ borderRight: "1px solid #E8DDD0" }}
        >
          <p className={sectionTitle} style={{ color: "#9C7D5B" }}>Best Prints</p>
          <div className="flex gap-3 justify-center">
            {PRINT_SWATCHES.map((p) => <PrintSwatch key={p.label} {...p} />)}
          </div>
        </div>

        {/* Best Makeup */}
        <div className="flex flex-col items-center gap-3 py-6 px-5">
          <p className={sectionTitle} style={{ color: "#9C7D5B" }}>Best Makeup</p>
          <div className="flex gap-4 justify-center">
            {makeupColors.map((c, i) => (
              <div key={c.hex} className="flex flex-col items-center gap-1">
                {i === 0 ? <MakeupBlush hex={c.hex} />
                  : i === 1 ? <MakeupEyeshadow hex={c.hex} />
                  : <MakeupLip hex={c.hex} />}
                <span
                  className="text-[9px] text-center leading-tight max-w-[54px] whitespace-pre-line"
                  style={{ color: "#6B5344" }}
                >
                  {MAKEUP_LABELS[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
