"use client";

import * as React from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import type { HairstyleResult } from "@/types/report";

// ── Animation CSS ────────────────────────────────────────────────────────────
const HAIR_CSS = `
/* Filled hair silhouette fade-in */
@keyframes hair-fill-in {
  from { opacity: 0; transform: scaleY(0.96); transform-origin: top center; }
  to   { opacity: 1; transform: scaleY(1);    transform-origin: top center; }
}
.hair-fill {
  opacity: 0;
  animation: hair-fill-in 0.55s cubic-bezier(0.4,0,0.2,1) forwards;
}

/* Sheen highlight stroke draw */
@keyframes hair-sheen {
  from { stroke-dashoffset: 80; opacity: 0; }
  to   { stroke-dashoffset: 0;  opacity: 1; }
}
.hair-sheen {
  stroke-dasharray: 80;
  stroke-dashoffset: 80;
  animation: hair-sheen 0.5s 0.4s ease forwards;
}

/* Length diagram: recommended line draws in left-to-right */
@keyframes length-line-draw {
  from { stroke-dashoffset: 120; opacity: 0.3; }
  to   { stroke-dashoffset: 0;   opacity: 1; }
}
.length-rec-line {
  stroke-dasharray: 120;
  stroke-dashoffset: 120;
  animation: length-line-draw 0.7s 0.3s cubic-bezier(0.4,0,0.2,1) forwards;
}

/* Length diagram: recommended line gentle glow-pulse after draw */
@keyframes length-glow {
  0%, 100% { opacity: 1; filter: drop-shadow(0 0 0px #C8A96E); }
  50%       { opacity: 0.82; filter: drop-shadow(0 0 3px #C8A96E); }
}
.length-rec-glow {
  animation: length-line-draw 0.7s 0.3s cubic-bezier(0.4,0,0.2,1) forwards,
             length-glow 2.2s 1.0s ease-in-out infinite;
}

/* Style card hover: expand description overlay */
.style-card { position: relative; }
.style-card .desc-overlay {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.22s ease, transform 0.22s ease;
  pointer-events: none;
}
.style-card:hover .desc-overlay {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
`;

// ── Inline icons ─────────────────────────────────────────────────────────────
function IconWave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M2 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" strokeLinecap="round" />
    </svg>
  );
}
function IconScissors() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}
function IconSparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
    </svg>
  );
}
// Reference-matching feature icons
function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <path d="M1 12C3.5 7 7.5 4 12 4s8.5 3 11 8c-2.5 5-6.5 8-11 8S3.5 17 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconCheekbone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      {/* simplified face outline with cheekbone highlight curve */}
      <path d="M12 3 C7 3 4 7 4 12 C4 17 7 21 12 21 C17 21 20 17 20 12 C20 7 17 3 12 3 Z" />
      <path d="M6 13 C7.5 15 10 16 12 16" strokeLinecap="round" />
      <path d="M18 13 C16.5 15 14 16 12 16" strokeLinecap="round" />
    </svg>
  );
}
function IconLips() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <path d="M7 14 C8 17 10 18 12 18 C14 18 16 17 17 14" strokeLinecap="round" />
      <path d="M7 14 C8 11 10 10 12 10 C14 10 16 11 17 14" strokeLinecap="round" />
      <path d="M9 14 C10 13 14 13 15 14" strokeLinecap="round" />
    </svg>
  );
}
function IconDryer() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <path d="M3 8 L14 8 C17 8 20 10 20 13 C20 16 17 18 14 18 L3 18 Z" />
      <line x1="14" y1="13" x2="22" y2="13" strokeLinecap="round" />
      <line x1="3" y1="18" x2="3" y2="21" strokeLinecap="round" />
      <line x1="17" y1="5" x2="19" y2="3" strokeLinecap="round" />
      <line x1="20" y1="7" x2="22" y2="6" strokeLinecap="round" />
    </svg>
  );
}
function IconSpray() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
      <rect x="4" y="10" width="8" height="11" rx="1.5" />
      <path d="M12 14 L15 14 L15 11 L12 11" />
      <line x1="15" y1="12.5" x2="18" y2="12.5" strokeLinecap="round" />
      <circle cx="18" cy="10" r="0.8" fill="currentColor" />
      <circle cx="20" cy="12" r="0.8" fill="currentColor" />
      <circle cx="19" cy="14" r="0.8" fill="currentColor" />
      <line x1="7" y1="10" x2="7" y2="7" strokeLinecap="round" />
      <line x1="7" y1="7" x2="11" y2="7" strokeLinecap="round" />
    </svg>
  );
}

// ── Colour helpers ───────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return `rgba(28,14,4,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Per-style accent colour for card header band ──────────────────────────────
function styleAccentFromStyle(name: string): { band: string; text: string } {
  const s = name.toLowerCase();
  if (s.includes("long") || s.includes("layer"))           return { band: "#F0E6D3", text: "#8B5A2B" };
  if (s.includes("bob") || s.includes("lob"))              return { band: "#E8EDF5", text: "#2B4B8B" };
  if (s.includes("bang") || s.includes("fringe"))          return { band: "#EDE8F5", text: "#5A2B8B" };
  if (s.includes("updo") || s.includes("bun") || s.includes("pony")) return { band: "#E8F5EC", text: "#2B7A4A" };
  if (s.includes("wavy") || s.includes("wave"))            return { band: "#F5EDE8", text: "#8B5A2B" };
  if (s.includes("curl") || s.includes("afro") || s.includes("coil")) return { band: "#F5E8F0", text: "#8B2B6A" };
  if (s.includes("pixie") || s.includes("short"))          return { band: "#E8F5F5", text: "#2B7B8B" };
  if (s.includes("straight") || s.includes("sleek"))       return { band: "#F5F0E8", text: "#8B7A2B" };
  if (s.includes("textured") || s.includes("shag"))        return { band: "#EFF5E8", text: "#4A8B2B" };
  return { band: "#F5EFE7", text: "#9C7D5B" };
}

// ── Per-style hairstyle SVG overlay ─────────────────────────────────────────
// viewBox 0 0 100 140 — head oval: cx=50 cy=38 rx=18 ry=22
// Crown y≈16, Chin y≈60, Ears x≈32/68 y≈38
// Each style uses FILLED semi-transparent dark shapes so cards look visually distinct.
function HairOverlay({ style, animate = false, delay = 0, hairColor }: { style: string; animate?: boolean; delay?: number; hairColor?: string }) {
  const s = style.toLowerCase();
  // Use provided hair colour (from AI analysis) or fall back to dark warm-brown
  const fill    = hairColor ? hexToRgba(hairColor, 0.76) : "rgba(28,14,4,0.72)";
  // Sheen: lighter version of the hair colour for gloss highlights
  const sheen   = hairColor ? hexToRgba(hairColor, 0.38) : "rgba(190,140,75,0.55)";
  const fillCls = animate ? "hair-fill" : "";
  const fillSty = animate ? ({ animationDelay: `${delay}s` } as React.CSSProperties) : {};
  const sheenCls = animate ? "hair-sheen" : "";

  let shapes: React.ReactNode;

  if (s.includes("long layer") || (s.includes("long") && !s.includes("bob"))) {
    // Long layers — wide flowing mass past the frame bottom
    shapes = (
      <>
        <path d="M34 22 C18 32 8 62 6 95 C4 122 8 140 8 140 L28 140 C26 120 22 98 24 76 C26 56 30 38 36 26 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M66 22 C82 32 92 62 94 95 C96 122 92 140 92 140 L72 140 C74 120 78 98 76 76 C74 56 70 38 64 26 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M34 22 C38 12 62 12 66 22 C60 17 40 17 34 22 Z" fill={fill} className={fillCls} style={fillSty} />
        <path d="M12 68 C10 82 12 98 14 114" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M88 68 C90 82 88 98 86 114" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M18 88 C20 100 22 114 20 126" stroke={sheen} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7" className={sheenCls} />
        <path d="M82 88 C80 100 78 114 80 126" stroke={sheen} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7" className={sheenCls} />
      </>
    );
  } else if (s.includes("bob") || s.includes("lob")) {
    const cutY = s.includes("lob") ? 90 : 75;
    shapes = (
      <>
        <path d={`M34 22 C18 32 16 55 16 ${cutY} L84 ${cutY} C84 55 82 32 66 22 C60 17 40 17 34 22 Z`}
          fill={fill} className={fillCls} style={fillSty} />
        <line x1="16" y1={cutY} x2="84" y2={cutY} stroke={sheen} strokeWidth="2" strokeLinecap="round" />
        <path d={`M24 28 L20 ${cutY - 5}`} stroke={sheen} strokeWidth="1.4" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d={`M76 28 L80 ${cutY - 5}`} stroke={sheen} strokeWidth="1.4" fill="none" strokeLinecap="round" className={sheenCls} />
      </>
    );
  } else if (s.includes("bang") || s.includes("fringe")) {
    shapes = (
      <>
        <path d="M34 22 C16 36 10 72 8 112 L24 116 C22 80 26 54 32 34 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M66 22 C84 36 90 72 92 112 L76 116 C78 80 74 54 68 34 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M32 22 C38 12 62 12 68 22 C58 18 42 20 36 26 C30 28 32 26 32 22 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M34 20 C44 24 56 22 66 18" stroke={sheen} strokeWidth="1.8" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M10 60 C8 74 10 88 8 100" stroke={sheen} strokeWidth="1.4" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M90 60 C92 74 90 88 92 100" stroke={sheen} strokeWidth="1.4" fill="none" strokeLinecap="round" className={sheenCls} />
      </>
    );
  } else if (s.includes("updo") || s.includes("bun") || s.includes("ponytail") || s.includes("pony")) {
    const isPony = s.includes("pony");
    shapes = (
      <>
        <path d="M34 28 C26 22 28 14 38 12 L50 10 L62 12 C72 14 74 22 66 28 C60 20 40 20 34 28 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M34 30 C28 38 30 48 32 54" stroke={fill} strokeWidth="8" strokeLinecap="round" fill="none" className={fillCls} style={fillSty} />
        <path d="M66 30 C72 38 70 48 68 54" stroke={fill} strokeWidth="8" strokeLinecap="round" fill="none" className={fillCls} style={fillSty} />
        {isPony ? (
          <path d="M50 8 C56 4 64 16 58 48 C54 70 52 92 54 122"
            stroke={fill} strokeWidth="12" fill="none" strokeLinecap="round" className={fillCls} style={fillSty} />
        ) : (
          <>
            <ellipse cx="50" cy="7" rx="10" ry="8" fill={fill} className={fillCls} style={fillSty} />
            <path d="M42 10 C46 14 54 14 58 10" stroke={sheen} strokeWidth="1.4" fill="none" className={sheenCls} />
          </>
        )}
      </>
    );
  } else if (s.includes("wavy") || s.includes("wave")) {
    shapes = (
      <>
        <path d="M34 22 C12 36 6 64 8 88 C10 106 6 120 8 140 L24 140 C22 122 26 108 24 90 C22 68 24 48 34 30 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M66 22 C88 36 94 64 92 88 C90 106 94 120 92 140 L76 140 C78 122 74 108 76 90 C78 68 76 48 66 30 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M34 22 C40 12 60 12 66 22 C60 17 40 17 34 22 Z" fill={fill} className={fillCls} style={fillSty} />
        <path d="M10 56 C8 66 14 74 10 84 C6 94 12 102 10 112" stroke={sheen} strokeWidth="2" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M90 56 C92 66 86 74 90 84 C94 94 88 102 90 112" stroke={sheen} strokeWidth="2" fill="none" strokeLinecap="round" className={sheenCls} />
      </>
    );
  } else if (s.includes("curl") || s.includes("coil") || s.includes("afro")) {
    // Afro/Curly — large halo volume extending well beyond the head oval
    shapes = (
      <>
        <path d="M50 2 C18 0 2 18 2 40 C2 60 14 70 22 68 C16 80 10 96 12 124 L30 128 C26 106 28 88 30 72 L30 68 C20 60 14 52 14 40 C14 22 28 12 50 10 C72 12 86 22 86 40 C86 52 80 60 70 68 L70 72 C72 88 74 106 70 128 L88 124 C90 96 84 80 78 68 C86 70 98 60 98 40 C98 18 82 0 50 2 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M18 28 C14 34 18 42 24 38" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M82 28 C86 34 82 42 76 38" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M26 14 C22 18 24 24 28 22" stroke={sheen} strokeWidth="1.4" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M74 14 C78 18 76 24 72 22" stroke={sheen} strokeWidth="1.4" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M50 4 C46 8 48 14 52 12 C56 10 56 4 50 4" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
      </>
    );
  } else if (s.includes("pixie") || s.includes("short")) {
    // Pixie — tight to skull, ends just below ears
    shapes = (
      <>
        <path d="M34 28 C22 36 20 48 22 60 L78 60 C80 48 78 36 66 28 C60 22 40 22 34 28 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M38 24 C42 16 50 13 58 16 L62 22" stroke={fill} strokeWidth="9" strokeLinecap="round" fill="none" className={fillCls} style={fillSty} />
        <path d="M24 36 C22 44 22 52 24 58" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M76 36 C78 44 78 52 76 58" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M40 22 C42 18 46 16 50 16" stroke={sheen} strokeWidth="1.2" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M50 16 C54 16 58 18 60 22" stroke={sheen} strokeWidth="1.2" fill="none" strokeLinecap="round" className={sheenCls} />
      </>
    );
  } else if (s.includes("straight") || s.includes("sleek")) {
    // Sleek straight — smooth parallel mass, wide gloss stripe
    shapes = (
      <>
        <path d="M34 22 C18 36 16 62 14 92 C12 118 16 134 16 140 L30 140 C28 132 24 112 26 88 C28 62 30 40 36 28 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M66 22 C82 36 84 62 86 92 C88 118 84 134 84 140 L70 140 C72 132 76 112 74 88 C72 62 70 40 64 28 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M34 22 C40 12 60 12 66 22 C60 17 40 17 34 22 Z" fill={fill} className={fillCls} style={fillSty} />
        {/* Wide glossy highlight stripe — key visual for sleek */}
        <path d="M40 18 L30 140" stroke="rgba(255,230,180,0.50)" strokeWidth="5" strokeLinecap="round" />
        <path d="M44 17 L34 140" stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeLinecap="round" />
      </>
    );
  } else if (s.includes("textured") || s.includes("shag")) {
    // Shag — layered jagged edges with notched sheen
    shapes = (
      <>
        <path d="M34 24 C14 38 10 68 10 96 C10 118 14 134 14 140 L28 140 C26 130 22 114 22 94 C22 70 24 46 32 30 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M66 24 C86 38 90 68 90 96 C90 118 86 134 86 140 L72 140 C74 130 78 114 78 94 C78 70 76 46 68 30 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M34 24 C40 12 60 12 66 24 C60 18 40 18 34 24 Z" fill={fill} className={fillCls} style={fillSty} />
        <path d="M12 66 C16 62 20 68 24 64 C28 60 32 66 36 62" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M88 66 C84 62 80 68 76 64 C72 60 68 66 64 62" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M12 90 C16 86 20 92 24 88" stroke={sheen} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.85" className={sheenCls} />
        <path d="M88 90 C84 86 80 92 76 88" stroke={sheen} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.85" className={sheenCls} />
        <path d="M36 22 C40 16 46 18 50 20 C54 18 60 16 64 22" stroke={sheen} strokeWidth="1.8" fill="none" strokeLinecap="round" className={sheenCls} />
      </>
    );
  } else {
    // Default: medium loose wave
    shapes = (
      <>
        <path d="M34 24 C16 38 14 66 14 100 L28 104 C24 76 24 52 32 32 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M66 24 C84 38 86 66 86 100 L72 104 C76 76 76 52 68 32 Z"
          fill={fill} className={fillCls} style={fillSty} />
        <path d="M34 24 C40 14 60 14 66 24 C60 18 40 18 34 24 Z" fill={fill} className={fillCls} style={fillSty} />
        <path d="M16 55 C14 66 18 76 14 86" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
        <path d="M84 55 C86 66 82 76 86 86" stroke={sheen} strokeWidth="1.6" fill="none" strokeLinecap="round" className={sheenCls} />
      </>
    );
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 140"
      preserveAspectRatio="xMidYMid meet"
    >
      {shapes}
    </svg>
  );
}

// ── Hair texture inference ──────────────────────────────────────────────────
function textureFromStyle(name: string): { label: string; color: string; bg: string } {
  const s = name.toLowerCase();
  if (s.includes("straight") || s.includes("sleek") || s.includes("pixie") ||
      s.includes("short") || s.includes("bob") || s.includes("lob"))
    return { label: "Straight", color: "#1D4ED8", bg: "#DBEAFE" };
  if (s.includes("curl") || s.includes("coil") || s.includes("afro") ||
      s.includes("wave") || s.includes("wavy"))
    return { label: "Curly/Wavy", color: "#7C3AED", bg: "#F3E8FF" };
  return { label: "Wavy", color: "#B45309", bg: "#FEF3C7" };
}

// ── Maintenance level inference ───────────────────────────────────────────────
function maintenanceFromStyle(name: string): { level: 1 | 2 | 3; label: string } {
  const s = name.toLowerCase();
  if (s.includes("pixie") || s.includes("short") || s.includes("bob") || s.includes("sleek"))
    return { level: 1, label: "Low" };
  if (s.includes("curl") || s.includes("afro") || s.includes("updo") ||
      s.includes("bun") || s.includes("textured") || s.includes("shag"))
    return { level: 3, label: "High" };
  return { level: 2, label: "Medium" };
}

const MAINTENANCE_COLORS: Record<1 | 2 | 3, { filled: string; empty: string }> = {
  1: { filled: "#7BA05B", empty: "#D1FAE5" },
  2: { filled: "#F59E0B", empty: "#FEF3C7" },
  3: { filled: "#C06B3E", empty: "#FDE8DC" },
};

// ── Length diagram ────────────────────────────────────────────────────────────


const HAIR_BENEFITS = ["Adds Volume", "Enhances Texture", "Frames Face Beautifully"];

// ── Main card ─────────────────────────────────────────────────────────────────
type PreviewSlot = { status: string; signedUrl?: string; styleName?: string };

export function HairstyleCard({
  data,
  photoUrl,
  previewUrls,
  previewSlots,
  reportId,
  onRefresh,
  faceShape,
  faceTraits,
  bestFeatures,
  stylingTips,
  hairType,
}: {
  data: HairstyleResult;
  photoUrl?: string;
  /** @deprecated Use previewSlots instead (Phase 5.4) */
  previewUrls?: string[];
  previewSlots?: PreviewSlot[];
  reportId?: string;
  onRefresh?: () => void;
  faceShape?: string;
  faceTraits?: string[];
  bestFeatures?: string[];
  stylingTips?: string[];
  hairType?: string;
}) {
  // No auto-generation — previews are generated on-demand via AI Beauty Studio
  const primaryHairColor  = data.colors[0]?.hex;
  const resolvedHairType  = hairType ?? data.hairType ?? "Wavy / Curly";
  const resolvedFaceShape = faceShape ?? "Oval";
  const resolvedTraits    = (faceTraits ?? ["Full cheeks", "Soft jawline", "Balanced proportions"]).slice(0, 3);
  const resolvedFeatures  = (bestFeatures ?? ["Almond eyes", "Rounded cheeks", "Full lips"]).slice(0, 3);
  const resolvedTips      = (stylingTips ?? data.stylingTips ?? ["Use light layers for movement", "Soft waves add texture", "Avoid heavy straight looks"]).slice(0, 3);

  const bestStyleName = data.styles[0]?.name?.trim().toLowerCase();
  const readyPreviewSlots = (previewSlots ?? []).filter(
    (slot): slot is PreviewSlot & { signedUrl: string } =>
      slot.status === "ready" && typeof slot.signedUrl === "string" && slot.signedUrl.length > 0,
  );
  const matchedBestPreview = bestStyleName
    ? readyPreviewSlots.find((slot) => slot.styleName?.trim().toLowerCase() === bestStyleName)
    : undefined;
  const slotZeroPreview =
    previewSlots?.[0]?.status === "ready" && typeof previewSlots[0]?.signedUrl === "string"
      ? (previewSlots[0] as PreviewSlot & { signedUrl: string })
      : undefined;
  const bestPreview = matchedBestPreview ?? slotZeroPreview ?? readyPreviewSlots[0];
  const heroImageUrl = bestPreview?.signedUrl ?? photoUrl;
  const heroImageAlt = bestPreview?.styleName
    ? `AI curated best hairstyle: ${bestPreview.styleName}`
    : "Your photo";

  const hairGoals = [
    { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5"><ellipse cx="12" cy="14" rx="8" ry="9" /><path d="M8 9 Q12 5 16 9" /></svg>, label: "Frame the face" },
    { icon: <IconWave />, label: "Add movement & volume" },
    { icon: <IconSparkle />, label: "Enhance natural texture" },
  ];

  const sectionTitle = "text-[10px] uppercase tracking-[0.18em] font-semibold text-center mb-4";
  const sT = { color: "#9C7D5B" };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HAIR_CSS }} />
      <div className="rounded-3xl overflow-hidden" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>

        {/* ── Header ── */}
        <div className="text-center pt-8 pb-4 px-6" style={{ borderBottom: "1px solid #E8DDD0" }}>
          <div className="flex items-center justify-center gap-3 mb-1">
            <span style={{ color: "#C8A96E", fontSize: 18 }}>&#10022;</span>
            <h2 className="text-3xl font-serif" style={{ color: "#3D2B1F" }}>Hairstyle Analysis</h2>
            <span style={{ color: "#C8A96E", fontSize: 18 }}>&#10022;</span>
          </div>
          <p className="text-sm" style={{ color: "#9C7D5B" }}>Find Styles That Flatter You</p>
        </div>

        {/* ── Hero 3-col ── */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_220px]" style={{ borderBottom: "1px solid #E8DDD0" }}>

          {/* Left */}
          <div className="p-5 space-y-4" style={{ borderRight: "1px solid #E8DDD0" }}>
            {/* Face shape */}
            <div className="rounded-2xl p-4" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "#9C7D5B" }}>Face Shape</p>
              <p className="font-serif text-base mb-3" style={{ color: "#3D2B1F" }}>{resolvedFaceShape}</p>
              {/* Face outline with hair — matches reference illustration */}
              <svg viewBox="0 0 48 60" fill="none" className="h-14 w-10 mx-auto mb-3">
                {/* hair top */}
                <path d="M10 22 C8 14 10 6 24 5 C38 6 40 14 38 22" fill="#9C7D5B" opacity="0.55" />
                {/* face oval */}
                <ellipse cx="24" cy="32" rx="14" ry="18" stroke="#6B5344" strokeWidth="1.4" fill="none" />
                {/* neck */}
                <line x1="19" y1="49" x2="18" y2="55" stroke="#6B5344" strokeWidth="1.2" />
                <line x1="29" y1="49" x2="30" y2="55" stroke="#6B5344" strokeWidth="1.2" />
                {/* centre guide */}
                <line x1="24" y1="15" x2="24" y2="50" stroke="#9C7D5B" strokeWidth="0.7" strokeDasharray="2 2" opacity="0.5" />
              </svg>
              <ul className="space-y-1.5">
                {resolvedTraits.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#6B5344" }}>
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#7BA05B" }} />{t}
                  </li>
                ))}
              </ul>
            </div>
            {/* Hair Goals */}
            <div className="rounded-2xl p-4" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>Hair Goals</p>
              <ul className="space-y-3">
                {hairGoals.map((g) => (
                  <li key={g.label} className="flex items-center gap-3 text-xs" style={{ color: "#6B5344" }}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>{g.icon}</span>
                    {g.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Centre: single full photo + face guide overlay (matches reference) */}
          <div className="flex items-center justify-center p-6 min-h-[340px]" style={{ background: "#F5EFE7" }}>
            {heroImageUrl ? (
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ maxWidth: 300, aspectRatio: "3/4" }}>
                <Image
                  src={heroImageUrl}
                  alt={heroImageAlt}
                  fill
                  unoptimized
                  className="object-cover"
                  style={{ objectPosition: "top center" }}
                />
                {!bestPreview && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 300 400"
                    style={{ zIndex: 9 }}
                  >
                    <ellipse cx="150" cy="155" rx="90" ry="118"
                      fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.8" strokeDasharray="8 5" />
                    <line x1="150" y1="30" x2="150" y2="275"
                      stroke="rgba(255,255,255,0.40)" strokeWidth="1.2" strokeDasharray="5 4" />
                    <line x1="54" y1="143" x2="246" y2="143"
                      stroke="rgba(255,255,255,0.30)" strokeWidth="1" strokeDasharray="4 3" />
                    <line x1="86" y1="66" x2="128" y2="106" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
                    <circle cx="84" cy="64" r="3" fill="rgba(255,255,255,0.75)" />
                    <line x1="214" y1="66" x2="172" y2="106" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
                    <circle cx="216" cy="64" r="3" fill="rgba(255,255,255,0.75)" />
                    <line x1="48" y1="158" x2="96" y2="158" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
                    <circle cx="46" cy="158" r="3" fill="rgba(255,255,255,0.75)" />
                    <line x1="252" y1="158" x2="204" y2="158" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
                    <circle cx="254" cy="158" r="3" fill="rgba(255,255,255,0.75)" />
                    <line x1="70" y1="236" x2="114" y2="216" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
                    <circle cx="68" cy="238" r="3" fill="rgba(255,255,255,0.65)" />
                    <line x1="230" y1="236" x2="186" y2="216" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
                    <circle cx="232" cy="238" r="3" fill="rgba(255,255,255,0.65)" />
                  </svg>
                )}
                {bestPreview && (
                  <div
                    className="absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ background: "rgba(61,43,31,0.75)", color: "#FDFAF6" }}
                  >
                    AI Best Match
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-2xl" style={{ width: 220, height: 280, background: "#EDE3D8", border: "2px dashed #C8B89A" }}>
                <span style={{ color: "#9C7D5B", fontSize: 36 }}>&#128100;</span>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="p-5 space-y-4" style={{ borderLeft: "1px solid #E8DDD0" }}>
            {/* Best Features */}
            <div className="rounded-2xl p-4" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>Best Features</p>
              <ul className="space-y-3">
                {resolvedFeatures.map((f, i) => {
                  const icon = i === 0 ? <IconEye /> : i === 1 ? <IconCheekbone /> : <IconLips />;
                  return (
                    <li key={i} className="flex items-center gap-3 text-xs" style={{ color: "#6B5344" }}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>
                        {icon}
                      </span>
                      {f}
                    </li>
                  );
                })}
              </ul>
            </div>
            {/* Styling Tips */}
            <div className="rounded-2xl p-4" style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "#9C7D5B" }}>Styling Tips</p>
              <ul className="space-y-3">
                {resolvedTips.map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs" style={{ color: "#6B5344" }}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "#EDE3D8", color: "#9C7D5B" }}>
                      {i === 0 ? <IconDryer /> : i === 1 ? <IconWave /> : <IconSpray />}
                    </span>
                    <span className="leading-tight">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>



        {/* ── Hair Type Match + Color Direction ── */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ borderBottom: "1px solid #E8DDD0" }}>

          {/* Hair Type Match */}
          <div className="px-6 py-6 flex flex-col gap-4" style={{ borderRight: "1px solid #E8DDD0" }}>
            <p className={sectionTitle} style={sT}>Hair Type Match</p>
            {/* horizontal row: big wave icon + type label | benefit pills */}
            <div className="flex items-center gap-6">
              {/* icon + label */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <span
                  className="flex h-20 w-20 items-center justify-center rounded-full text-3xl"
                  style={{ background: "#EDE3D8", color: "#9C7D5B", lineHeight: 1 }}
                >
                  &#8779;
                </span>
                <p className="text-[11px] font-semibold text-center whitespace-nowrap" style={{ color: "#3D2B1F" }}>{resolvedHairType}</p>
              </div>
              {/* benefit pills in a row */}
              <div className="flex flex-col gap-2">
                {HAIR_BENEFITS.map((b) => (
                  <div key={b} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: "#7BA05B" }}>
                      <Check className="h-3 w-3 text-white" />
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: "#6B5344" }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Color Direction */}
          <div className="px-6 py-6 flex flex-col gap-4">
            <p className={sectionTitle} style={sT}>Best Color Direction</p>
            <div className="flex flex-wrap gap-4 justify-center">
              {data.colors.map((c) => {
                // Compute a lighter highlight colour for the gradient sheen
                const base = c.hex.replace("#", "");
                const rr = Math.min(255, parseInt(base.slice(0, 2), 16) + 55).toString(16).padStart(2, "0");
                const gg = Math.min(255, parseInt(base.slice(2, 4), 16) + 40).toString(16).padStart(2, "0");
                const bb2 = Math.min(255, parseInt(base.slice(4, 6), 16) + 30).toString(16).padStart(2, "0");
                const highlightHex = `#${rr}${gg}${bb2}`;
                const gradId = `hc-${c.hex.replace("#", "")}`;
                return (
                  <div key={c.hex} className="flex flex-col items-center gap-1.5">
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <defs>
                        <radialGradient id={gradId} cx="35%" cy="30%" r="65%">
                          <stop offset="0%"   stopColor={highlightHex} />
                          <stop offset="55%"  stopColor={c.hex} />
                          <stop offset="100%" stopColor={hexToRgba(c.hex, 1).replace("rgba", "rgb").replace(",1)", ")")} />
                        </radialGradient>
                      </defs>
                      <circle cx="26" cy="26" r="24" fill={`url(#${gradId})`} />
                      <circle cx="26" cy="26" r="24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                      {/* subtle gloss highlight */}
                      <ellipse cx="20" cy="18" rx="7" ry="5" fill="rgba(255,255,255,0.18)" />
                    </svg>
                    <p className="text-[10px] text-center leading-tight max-w-[56px]" style={{ color: "#6B5344" }}>{c.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Top Recommended Styles ── */}
        <div className="px-6 py-6" style={{ borderBottom: "1px solid #E8DDD0", background: "#FDFAF6" }}>
          <p className={sectionTitle} style={sT}>Top Recommended Styles</p>

          <div className="space-y-3">
            {data.styles.slice(0, 3).map((style, index) => {
              const accent = styleAccentFromStyle(style.name);
              const texture = textureFromStyle(style.name);
              const maintenance = maintenanceFromStyle(style.name);

              return (
                <div
                  key={`${style.name}-${index}`}
                  className="rounded-2xl p-4 flex items-start gap-3"
                  style={{ background: "#F5EFE7", border: "1px solid #E8DDD0" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                        style={{ background: accent.band, color: accent.text }}
                      >
                        {index + 1}
                      </span>
                      <h4 className="font-serif text-sm truncate" style={{ color: "#3D2B1F" }}>
                        {style.name}
                      </h4>
                    </div>

                    <p className="text-xs leading-relaxed" style={{ color: "#6B5344" }}>{style.description}</p>

                    <div className="mt-2 flex items-center gap-2 text-[10px]">
                      <span className="rounded-full px-2 py-0.5" style={{ background: texture.bg, color: texture.color }}>
                        {texture.label}
                      </span>
                      <span className="rounded-full px-2 py-0.5" style={{ background: "#EFE7DD", color: "#6B5344" }}>
                        {maintenance.label} maintenance
                      </span>
                    </div>
                  </div>

                  {index === 0 && bestPreview?.signedUrl && (
                    <div
                      className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-xl"
                      style={{ border: "1px solid #E8DDD0" }}
                    >
                      <Image
                        src={bestPreview.signedUrl}
                        alt={`Top recommended style preview: ${style.name}`}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer tagline pill ── matches reference */}
        <div className="flex justify-center py-5 px-6" style={{ background: "#FDFAF6" }}>
          <div
            className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-[0.14em] uppercase text-center"
            style={{ background: "#F0E4D2", color: "#9C7D5B", border: "1px solid #E0CEBC" }}
          >
            &#9825;&nbsp;{data.styles[0]?.name ?? "Natural Layers"} · Your Personalised Style Guide&nbsp;&#10022;
          </div>
        </div>
      </div>
    </>
  );
}
