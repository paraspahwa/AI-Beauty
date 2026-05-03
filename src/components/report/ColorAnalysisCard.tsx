"use client";

import Image from "next/image";
import { Check, X } from "lucide-react";
import type { ColorAnalysisResult } from "@/types/report";

// ── Characteristic icons (inline SVG) ──────────────────────────────────────
function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <circle cx="12" cy="12" r="4" />
      {[0,45,90,135,180,225,270,315].map((deg) => (
        <line key={deg}
          x1={12 + 7 * Math.cos(deg * Math.PI / 180)}
          y1={12 + 7 * Math.sin(deg * Math.PI / 180)}
          x2={12 + 9.5 * Math.cos(deg * Math.PI / 180)}
          y2={12 + 9.5 * Math.sin(deg * Math.PI / 180)}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <path d="M12 22C12 22 4 16 4 10a8 8 0 0 1 16 0c0 6-8 12-8 12z" />
      <path d="M12 22V10" strokeDasharray="2 2" />
    </svg>
  );
}
function IconHalfCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
      <path d="M12 4a8 8 0 0 1 0 16" />
      <path d="M12 4a8 8 0 0 0 0 16" strokeDasharray="2 2" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

// ── Colour strip beneath each comparison photo ────────────────────────────
function ColorStrip({ colors }: { colors: { hex: string }[] }) {
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-b-xl">
      {colors.map((c) => (
        <div key={c.hex} className="flex-1" style={{ backgroundColor: c.hex }} />
      ))}
    </div>
  );
}

// ── Circular print swatch (placeholder pattern) ────────────────────────────
const PRINT_LABELS = ["Soft Florals", "Muted Paisley", "Earthy Jacquard"];
const PRINT_COLORS = ["#C8956B", "#6A8E7F", "#C8A96E"];

// ── Makeup suggestions derived from palette ────────────────────────────────
const MAKEUP_LABELS = ["Peachy\nBlush", "Warm Brown\nEyeshadow", "Coral Nude\nLip"];

// ── Main component ──────────────────────────────────────────────────────────
function ColorSwatch({ hex, name, photoUrl }: { hex: string; name: string; photoUrl?: string }) {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden" style={{ border: "1px solid #E8DDD0" }}>
      <div className="w-full relative" style={{ aspectRatio: "3/4" }}>
        {photoUrl ? (
          <>
            <Image src={photoUrl} alt={name} fill unoptimized className="object-cover object-center" />
            {/* colour wash overlay */}
            <div className="absolute inset-0" style={{ backgroundColor: hex, mixBlendMode: "multiply", opacity: 0.55 }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${hex}44 0%, ${hex}99 100%)` }} />
        )}
        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: "rgba(0,0,0,0.28)" }}>
          <span className="text-[9px] font-medium text-white truncate block">{name}</span>
        </div>
      </div>
      <div className="flex h-3">
        {[hex, hex + "CC", hex + "99", hex + "66"].map((h, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: h }} />
        ))}
      </div>
    </div>
  );
}

export function ColorAnalysisCard({
  data,
  photoUrl,
}: {
  data: ColorAnalysisResult;
  photoUrl?: string;
}) {
  // derive 4 neutrals (greige tones) from avoidColors or palette tail
  const neutrals = [
    { hex: "#F2EDE4" },
    { hex: "#DDD0C0" },
    { hex: "#B0A090" },
    { hex: "#8B7D6B" },
    { hex: "#5C4F40" },
  ];

  // best 6 palette colours (for comparison row)
  const bestSix = data.palette.slice(0, 6);
  // avoid 6
  const avoidSix = data.avoidColors.slice(0, 6);

  const characteristics = [
    { icon: <IconSun />,        label: data.undertone === "Warm" ? "Warm" : data.undertone === "Cool" ? "Cool" : "Neutral" },
    { icon: <IconLeaf />,       label: "Muted" },
    { icon: <IconHalfCircle />, label: "Soft" },
  ];

  const makeupColors = data.palette.slice(0, 3);

  const sectionTitle =
    "text-[10px] uppercase tracking-[0.18em] font-semibold text-center";
  const warmBrown = { color: "#9C7D5B" };

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}
    >
      {/* ── Top half: photo LEFT + info RIGHT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2">

        {/* Photo */}
        <div className="relative min-h-[320px] md:min-h-[460px]" style={{ background: "#EDE3D8" }}>
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt="Your photo"
              fill
              unoptimized
              className="object-cover object-center"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm" style={{ color: "#9C7D5B" }}>
              No photo
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="flex flex-col justify-center gap-5 px-8 py-8" style={{ background: "#FDFAF6" }}>
          {/* Title */}
          <h2
            className="text-3xl font-black uppercase tracking-[0.12em] text-right"
            style={{ color: "#3D2B1F", letterSpacing: "0.1em" }}
          >
            Color Analysis
          </h2>

          {/* Season */}
          <div className="flex flex-col items-end gap-2">
            <span
              className="px-4 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold"
              style={{ background: "#F0E8DC", color: "#9C7D5B", border: "1px solid #E8DDD0" }}
            >
              Season
            </span>
            <p
              className="text-2xl font-black uppercase tracking-[0.08em]"
              style={{ color: "#3D2B1F" }}
            >
              {data.season}
            </p>
          </div>

          {/* 4 key palette dots */}
          <div className="flex justify-end gap-3">
            {data.palette.slice(0, 4).map((c) => (
              <span
                key={c.hex}
                className="h-11 w-11 rounded-full shadow-md"
                style={{ backgroundColor: c.hex, border: "2px solid #fff" }}
                title={c.name}
              />
            ))}
          </div>

          {/* Characteristics */}
          <div className="flex flex-col items-end gap-2">
            <span
              className="px-4 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold"
              style={{ background: "#F0E8DC", color: "#9C7D5B", border: "1px solid #E8DDD0" }}
            >
              Characteristics
            </span>
            <div className="flex gap-5">
              {characteristics.map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-1">
                  <span style={{ color: "#9C7D5B" }}>{c.icon}</span>
                  <span className="text-[11px]" style={{ color: "#6B5344" }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Best Neutrals */}
          <div className="flex flex-col items-end gap-2">
            <span
              className="px-4 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold"
              style={{ background: "#F0E8DC", color: "#9C7D5B", border: "1px solid #E8DDD0" }}
            >
              Best Neutrals
            </span>
            <div className="flex gap-3">
              {neutrals.map((n) => (
                <span
                  key={n.hex}
                  className="h-9 w-9 rounded-full shadow-sm"
                  style={{ backgroundColor: n.hex, border: "2px solid #fff" }}
                />
              ))}
            </div>
          </div>

          {/* Clothing observation banner (only when present) */}
          {data.clothingObservation && (
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3 mt-1"
              style={{
                background: data.clothingObservation.effect === "flattering"
                  ? "rgba(123,160,91,0.12)"
                  : data.clothingObservation.effect === "clashing"
                    ? "rgba(192,107,62,0.12)"
                    : "rgba(200,169,110,0.1)",
                border: `1px solid ${data.clothingObservation.effect === "flattering" ? "rgba(123,160,91,0.3)" : data.clothingObservation.effect === "clashing" ? "rgba(192,107,62,0.3)" : "rgba(200,169,110,0.25)"}`,
              }}
            >
              <span
                className="h-7 w-7 shrink-0 rounded-full shadow"
                style={{ backgroundColor: data.clothingObservation.hex, border: "2px solid #fff" }}
              />
              <p className="text-[11px] leading-snug" style={{ color: "#3D2B1F" }}>
                <span className="font-semibold">{data.clothingObservation.color}</span>
                {data.clothingObservation.effect === "flattering"
                  ? " ✓ aligns with your palette"
                  : data.clothingObservation.effect === "clashing"
                    ? " ✗ clashes with your coloring"
                    : " — neutral for your season"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── COLOR COMPARISON divider ── */}
      <div
        className="flex items-center justify-center gap-3 py-4 px-6"
        style={{ background: "#F5EFE7", borderTop: "1px solid #E8DDD0", borderBottom: "1px solid #E8DDD0" }}
      >
        <span style={{ color: "#C8A96E" }}>✦</span>
        <p className={sectionTitle} style={warmBrown}>Color Comparison</p>
        <span style={{ color: "#C8A96E" }}>✦</span>
      </div>

      {/* ── Best Colors row ── */}
      <div className="px-5 pt-5 pb-3" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center gap-2 mb-3">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: "#7BA05B" }}
          >
            <Check className="h-3.5 w-3.5 text-white" />
          </span>
          <p className={sectionTitle} style={{ color: "#3D2B1F" }}>Best Colors</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {bestSix.map((c) => (
            <ColorSwatch key={c.hex} hex={c.hex} name={c.name} photoUrl={photoUrl} />
          ))}
        </div>
      </div>

      {/* ── Less Flattering row ── */}
      <div className="px-5 pt-3 pb-5" style={{ borderBottom: "1px solid #E8DDD0" }}>
        <div className="flex items-center gap-2 mb-3">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: "#C06B3E" }}
          >
            <X className="h-3.5 w-3.5 text-white" />
          </span>
          <p className={sectionTitle} style={{ color: "#3D2B1F" }}>Less Flattering</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {avoidSix.map((c) => (
            <ColorSwatch key={c.hex} hex={c.hex} name={c.name} photoUrl={photoUrl} />
          ))}
        </div>
      </div>

      {/* ── Bottom 3-col: Metals | Prints | Makeup ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ "--tw-divide-opacity": 1, borderTop: "1px solid #E8DDD0" } as React.CSSProperties}>

        {/* Best Metals */}
        <div className="flex flex-col items-center gap-4 py-6 px-5">
          <p className={sectionTitle} style={warmBrown}>Best Metals</p>
          <div className="flex gap-6 justify-center">
            {data.metals.slice(0, 2).map((metal) => {
              const isGold = metal.toLowerCase().includes("gold") && !metal.toLowerCase().includes("rose");
              const isRose = metal.toLowerCase().includes("rose");
              const bg = isGold ? "linear-gradient(135deg,#E8C96A,#C9A83C)"
                       : isRose ? "linear-gradient(135deg,#E8B4A0,#C98070)"
                       : "linear-gradient(135deg,#E0E0E0,#A0A0A0)";
              return (
                <div key={metal} className="flex flex-col items-center gap-2">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold shadow-md"
                    style={{ background: bg, color: "#fff" }}
                  >
                    ◯
                  </span>
                  <span className="text-xs font-medium" style={{ color: "#3D2B1F" }}>{metal}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Best Prints */}
        <div className="flex flex-col items-center gap-4 py-6 px-5">
          <p className={sectionTitle} style={warmBrown}>Best Prints</p>
          <div className="flex gap-4 justify-center">
            {PRINT_LABELS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <span
                  className="h-14 w-14 rounded-full shadow-md flex items-center justify-center text-white text-xs font-medium"
                  style={{
                    background: `radial-gradient(circle at 40% 40%, ${PRINT_COLORS[i]}CC, ${PRINT_COLORS[i]})`,
                    border: "2px solid #fff",
                  }}
                >
                  ✿
                </span>
                <span className="text-[10px] text-center leading-tight max-w-[48px]" style={{ color: "#6B5344" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Makeup */}
        <div className="flex flex-col items-center gap-4 py-6 px-5">
          <p className={sectionTitle} style={warmBrown}>Best Makeup</p>
          <div className="flex gap-4 justify-center">
            {makeupColors.map((c, i) => (
              <div key={c.hex} className="flex flex-col items-center gap-1.5">
                <span
                  className="h-14 w-14 rounded-full shadow-md"
                  style={{ backgroundColor: c.hex, border: "2px solid #fff" }}
                />
                <span className="text-[10px] text-center leading-tight max-w-[56px] whitespace-pre-line" style={{ color: "#6B5344" }}>
                  {MAKEUP_LABELS[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
