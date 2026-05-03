"use client";

import Image from "next/image";
import { Check, X } from "lucide-react";
import type { ColorAnalysisResult } from "@/types/report";

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
function ColorSwatch({ hex, name, photoUrl }: { hex: string; name: string; photoUrl?: string }) {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: "1px solid #E8DDD0" }}>
      <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
        {photoUrl ? (
          <>
            <Image src={photoUrl} alt={name} fill unoptimized className="object-cover"
              style={{ objectPosition: "top center" }} />
            <div className="absolute inset-0" style={{ backgroundColor: hex, mixBlendMode: "multiply", opacity: 0.42 }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg,${hex}55,${hex}AA)` }} />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: "rgba(0,0,0,0.30)" }}>
          <span className="text-[9px] font-medium text-white truncate block">{name}</span>
        </div>
      </div>
      {/* 4-shade strip */}
      <div className="flex h-2.5">
        {[`${hex}FF`, `${hex}CC`, `${hex}99`, `${hex}55`].map((h, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: h }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export function ColorAnalysisCard({ data, photoUrl }: { data: ColorAnalysisResult; photoUrl?: string }) {

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

  const pill = "px-4 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold";
  const pillStyle = { background: "#F0E8DC", color: "#9C7D5B", border: "1px solid #E8DDD0" };
  const sectionTitle = "text-[10px] uppercase tracking-[0.18em] font-semibold";

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
    <div className="rounded-3xl overflow-hidden" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>

      {/* ── Top half: photo LEFT + info RIGHT ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2">

        {/* Photo */}
        <div className="relative min-h-[340px] md:min-h-[480px]" style={{ background: "#EDE3D8" }}>
          {photoUrl ? (
            <Image src={photoUrl} alt="Your photo" fill unoptimized className="object-cover"
              style={{ objectPosition: "top center" }} />
          ) : (
            <div className="flex h-full items-center justify-center" style={{ color: "#9C7D5B" }}>No photo</div>
          )}
        </div>

        {/* Info panel */}
        <div className="flex flex-col justify-center gap-6 px-8 py-8" style={{ background: "#FDFAF6" }}>

          {/* Big heading */}
          <h2 className="text-right text-[2rem] font-black uppercase tracking-[0.14em]" style={{ color: "#3D2B1F" }}>
            Color Analysis
          </h2>

          {/* Season */}
          <div className="flex flex-col items-center gap-2">
            <span className={pill} style={pillStyle}>Season</span>
            <p className="text-[1.7rem] font-black uppercase tracking-[0.08em] text-center" style={{ color: "#3D2B1F" }}>
              {data.season}
            </p>
          </div>

          {/* 4 key palette dots */}
          <div className="flex justify-center gap-3">
            {data.palette.slice(0, 4).map((c) => (
              <span key={c.hex} className="h-12 w-12 rounded-full shadow-md"
                style={{ backgroundColor: c.hex, border: "3px solid #fff" }} title={c.name} />
            ))}
          </div>

          {/* Characteristics */}
          <div className="flex flex-col items-center gap-2">
            <span className={pill} style={pillStyle}>Characteristics</span>
            <div className="flex gap-6 justify-center">
              {characteristics.map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-1">
                  <span style={{ color: "#9C7D5B" }}>{c.icon}</span>
                  <span className="text-[12px]" style={{ color: "#6B5344" }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Best Neutrals */}
          <div className="flex flex-col items-center gap-2">
            <span className={pill} style={pillStyle}>Best Neutrals</span>
            <div className="flex gap-3 justify-center">
              {neutrals.map((n) => (
                <span key={n.hex} className="h-9 w-9 rounded-full shadow-sm"
                  style={{ backgroundColor: n.hex, border: "2px solid #fff" }} />
              ))}
            </div>
          </div>

          {/* Clothing observation */}
          {data.clothingObservation && (
            <div className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
              style={{
                background: data.clothingObservation.effect === "flattering"
                  ? "rgba(123,160,91,0.1)" : data.clothingObservation.effect === "clashing"
                  ? "rgba(192,107,62,0.1)" : "rgba(200,169,110,0.1)",
                border: `1px solid ${data.clothingObservation.effect === "flattering"
                  ? "rgba(123,160,91,0.3)" : data.clothingObservation.effect === "clashing"
                  ? "rgba(192,107,62,0.3)" : "rgba(200,169,110,0.25)"}`,
              }}
            >
              <span className="h-6 w-6 shrink-0 rounded-full shadow"
                style={{ backgroundColor: data.clothingObservation.hex, border: "2px solid #fff" }} />
              <p className="text-[11px] leading-snug" style={{ color: "#3D2B1F" }}>
                <span className="font-semibold">{data.clothingObservation.color}</span>
                {data.clothingObservation.effect === "flattering" ? " \u2014 flattering for your palette"
                  : data.clothingObservation.effect === "clashing" ? " \u2014 clashes with your coloring"
                  : " \u2014 neutral for your season"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── COLOR COMPARISON divider ─────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 py-4 px-6"
        style={{ background: "#F5EFE7", borderTop: "1px solid #E8DDD0", borderBottom: "1px solid #E8DDD0" }}>
        <span style={{ color: "#C8A96E" }}>&#10022;</span>
        <p className={sectionTitle} style={{ color: "#9C7D5B" }}>Color Comparison</p>
        <span style={{ color: "#C8A96E" }}>&#10022;</span>
      </div>

      {/* ── Best Colors ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "#7BA05B" }}>
            <Check className="h-3.5 w-3.5 text-white" />
          </span>
          <p className={sectionTitle} style={{ color: "#3D2B1F" }}>Best Colors</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {bestSix.map((c) => <ColorSwatch key={c.hex} hex={c.hex} name={c.name} photoUrl={photoUrl} />)}
        </div>
      </div>

      {/* ── Less Flattering ──────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "#C06B3E" }}>
            <X className="h-3.5 w-3.5 text-white" />
          </span>
          <p className={sectionTitle} style={{ color: "#3D2B1F" }}>Less Flattering</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {avoidSix.map((c) => <ColorSwatch key={c.hex} hex={c.hex} name={c.name} photoUrl={photoUrl} />)}
        </div>
      </div>

      {/* ── Bottom 3-col: Metals | Prints | Makeup ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E8DDD0]">

        {/* Best Metals */}
        <div className="flex flex-col items-center gap-4 py-7 px-5">
          <p className={sectionTitle} style={{ color: "#9C7D5B" }}>Best Metals</p>
          <div className="flex gap-6 justify-center">
            {data.metals.slice(0, 2).map((metal) => (
              <div key={metal} className="flex flex-col items-center gap-2">
                <MetalRing gradient={metalGrad(metal)} />
                <span className="text-xs font-medium" style={{ color: "#3D2B1F" }}>{metal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Prints */}
        <div className="flex flex-col items-center gap-4 py-7 px-5">
          <p className={sectionTitle} style={{ color: "#9C7D5B" }}>Best Prints</p>
          <div className="flex gap-4 justify-center">
            {PRINT_SWATCHES.map((p) => <PrintSwatch key={p.label} {...p} />)}
          </div>
        </div>

        {/* Best Makeup */}
        <div className="flex flex-col items-center gap-4 py-7 px-5">
          <p className={sectionTitle} style={{ color: "#9C7D5B" }}>Best Makeup</p>
          <div className="flex gap-4 justify-center">
            {makeupColors.map((c, i) => (
              <div key={c.hex} className="flex flex-col items-center gap-1.5">
                {i === 0 ? <MakeupBlush hex={c.hex} />
                  : i === 1 ? <MakeupEyeshadow hex={c.hex} />
                  : <MakeupLip hex={c.hex} />}
                <span className="text-[10px] text-center leading-tight max-w-[56px] whitespace-pre-line"
                  style={{ color: "#6B5344" }}>{MAKEUP_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}