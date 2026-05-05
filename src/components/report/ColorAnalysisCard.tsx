"use client";

import * as React from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";
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

/* ─── Characteristic icons ─────────────────────────────────────────────── */
function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10">
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10">
      <path d="M12 22C12 22 4 16 4 10a8 8 0 0 1 16 0c0 6-8 12-8 12z" />
      <path d="M12 22V10" strokeDasharray="2 2" />
    </svg>
  );
}
function IconHalfCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10">
      <path d="M12 4a8 8 0 0 1 0 16" />
      <path d="M12 4a8 8 0 0 0 0 16" strokeDasharray="2 2" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}

/* ─── Metal ring icon ──────────────────────────────────────────────────── */
function MetalRing({ gradient }: { gradient: string }) {
  return (
    <svg viewBox="0 0 56 56" className="h-16 w-16 drop-shadow-md">
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
function PrintSwatch({ bg, pat, label }: { bg: string; pat: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 56 56" className="h-16 w-16 drop-shadow-md">
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
    <svg viewBox="0 0 56 56" className="h-16 w-16 drop-shadow-md">
      <circle cx="28" cy="28" r="26" fill={hex} />
      <ellipse cx="28" cy="32" rx="14" ry="8" fill={hex} stroke="#fff" strokeWidth="1.2" opacity="0.7" />
      <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}
function MakeupEyeshadow({ hex }: { hex: string }) {
  return (
    <svg viewBox="0 0 56 56" className="h-16 w-16 drop-shadow-md">
      <circle cx="28" cy="28" r="26" fill={hex} />
      <path d="M10 30 Q28 18 46 30" fill={hex} stroke="#fff" strokeWidth="1.3" opacity="0.8" />
      <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}
function MakeupLip({ hex }: { hex: string }) {
  return (
    <svg viewBox="0 0 56 56" className="h-16 w-16 drop-shadow-md">
      <circle cx="28" cy="28" r="26" fill={hex} />
      <path d="M12 28 C16 20 22 18 28 22 C34 18 40 20 44 28 C40 38 34 40 28 36 C22 40 16 38 12 28Z"
        fill="#fff" opacity="0.25" />
      <path d="M18 28 C22 23 28 23 28 28" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.6" />
      <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

/* ─── Data types (defined before SEASON_PRESETS for co-location) ────────── */
type Swatch = { name: string; hex: string };
type PrintStyle = { label: string; bg: string; pat: string };

type SeasonPreset = {
  characteristics: [string, string, string];
  hero: Swatch[];          // 4 dots shown under season name
  bestColors: Swatch[];    // 6 comparison swatches
  avoidColors: Swatch[];   // 6 less-flattering swatches
  neutrals: Swatch[];      // 5 neutral dots
  metals: string[];        // 2 metals
  prints: PrintStyle[];    // 3 circular prints
  makeup: Swatch[];        // 3 makeup items
};

/* ─── Canonical season preset table ────────────────────────────────────── */
const SEASON_PRESETS: Record<string, SeasonPreset> = {
  "Soft Autumn": {
    characteristics: ["Warm", "Muted", "Soft"],
    hero: [
      { name: "Olive",      hex: "#7A7A3A" },
      { name: "Terracotta", hex: "#C2673A" },
      { name: "Teal",       hex: "#3E8FA0" },
      { name: "Tan",        hex: "#C9A882" },
    ],
    bestColors: [
      { name: "Olive Green",   hex: "#7A7A3A" },
      { name: "Terracotta",    hex: "#C2673A" },
      { name: "Muted Teal",    hex: "#3E8FA0" },
      { name: "Mustard",       hex: "#C9A020" },
      { name: "Warm Brown",    hex: "#9A6240" },
      { name: "Dusty Rose",    hex: "#D4907E" },
    ],
    avoidColors: [
      { name: "Black",       hex: "#202020" },
      { name: "Pure White",  hex: "#F4F1ED" },
      { name: "Icy Gray",    hex: "#C9C5C6" },
      { name: "Hot Pink",    hex: "#C2185B" },
      { name: "Pastel Blue", hex: "#9DD3E8" },
      { name: "Royal Blue",  hex: "#2450A4" },
    ],
    neutrals: [
      { name: "Cream",       hex: "#F2E7D7" },
      { name: "Camel",       hex: "#D8BE98" },
      { name: "Warm Taupe",  hex: "#B79B81" },
      { name: "Olive Taupe", hex: "#8E8168" },
      { name: "Espresso",    hex: "#5E4C3D" },
    ],
    metals: ["Gold", "Rose Gold"],
    prints: [
      { label: "Soft Florals",    bg: "#B36B4A", pat: "#D4956A" },
      { label: "Muted Paisley",   bg: "#6A8579", pat: "#8FA79C" },
      { label: "Earthy Jacquard", bg: "#C9AB72", pat: "#E0CDA0" },
    ],
    makeup: [
      { name: "Peachy\nBlush",         hex: "#E87761" },
      { name: "Warm Brown\nEyeshadow", hex: "#9A6240" },
      { name: "Coral Nude\nLip",       hex: "#D97863" },
    ],
  },

  "Deep Autumn": {
    characteristics: ["Warm", "Rich", "Deep"],
    hero: [
      { name: "Burgundy",    hex: "#7A2233" },
      { name: "Rust",        hex: "#A84425" },
      { name: "Forest",      hex: "#3B5E3A" },
      { name: "Dark Camel",  hex: "#A0784A" },
    ],
    bestColors: [
      { name: "Burgundy",     hex: "#7A2233" },
      { name: "Rust",         hex: "#A84425" },
      { name: "Forest Green", hex: "#3B5E3A" },
      { name: "Dark Olive",   hex: "#5C5A2A" },
      { name: "Espresso",     hex: "#4A2E1E" },
      { name: "Deep Teal",    hex: "#1F5C60" },
    ],
    avoidColors: [
      { name: "Pastel Pink",  hex: "#F4C2C2" },
      { name: "Icy Lavender", hex: "#D5C9E8" },
      { name: "Light Gray",   hex: "#D0D0D0" },
      { name: "Mint",         hex: "#B2DFD0" },
      { name: "Baby Blue",    hex: "#AED6F1" },
      { name: "Pale Yellow",  hex: "#FFF9C4" },
    ],
    neutrals: [
      { name: "Warm Cream",  hex: "#EDE0CC" },
      { name: "Camel",       hex: "#C4A06A" },
      { name: "Coffee",      hex: "#8C6040" },
      { name: "Dark Taupe",  hex: "#6B4E38" },
      { name: "Espresso",    hex: "#3E271A" },
    ],
    metals: ["Gold", "Bronze"],
    prints: [
      { label: "Rich Florals",   bg: "#7A2233", pat: "#C24A5A" },
      { label: "Animal Print",   bg: "#9A7040", pat: "#4A2E1E" },
      { label: "Earthy Damask",  bg: "#5C5A2A", pat: "#A8A050" },
    ],
    makeup: [
      { name: "Brick\nBlush",          hex: "#C05040" },
      { name: "Deep Bronze\nEyeshadow", hex: "#7A4828" },
      { name: "Terracotta\nLip",        hex: "#B84A38" },
    ],
  },

  "Autumn": {
    characteristics: ["Warm", "Muted", "Earthy"],
    hero: [
      { name: "Rust",       hex: "#B5451B" },
      { name: "Olive",      hex: "#7A7228" },
      { name: "Pumpkin",    hex: "#D2692A" },
      { name: "Brown",      hex: "#8C5A35" },
    ],
    bestColors: [
      { name: "Rust",         hex: "#B5451B" },
      { name: "Olive Green",  hex: "#7A7228" },
      { name: "Pumpkin",      hex: "#D2692A" },
      { name: "Warm Brown",   hex: "#8C5A35" },
      { name: "Golden Ochre", hex: "#C89030" },
      { name: "Deep Teal",    hex: "#285E60" },
    ],
    avoidColors: [
      { name: "Pure Black",  hex: "#111111" },
      { name: "Cool White",  hex: "#EEF0F2" },
      { name: "Fuchsia",     hex: "#C2185B" },
      { name: "Icy Blue",    hex: "#AED6F1" },
      { name: "Lilac",       hex: "#D7BDE2" },
      { name: "Silver Gray", hex: "#BFC9CA" },
    ],
    neutrals: [
      { name: "Ivory",      hex: "#F4E9D8" },
      { name: "Camel",      hex: "#D4A96A" },
      { name: "Warm Beige", hex: "#B58A60" },
      { name: "Cocoa",      hex: "#8A5E40" },
      { name: "Dark Brown", hex: "#523420" },
    ],
    metals: ["Gold", "Bronze"],
    prints: [
      { label: "Autumn Florals", bg: "#B5451B", pat: "#E07050" },
      { label: "Earthy Paisley", bg: "#7A7228", pat: "#C0B850" },
      { label: "Woven Jacquard", bg: "#C89030", pat: "#F0D870" },
    ],
    makeup: [
      { name: "Warm Peach\nBlush",       hex: "#E8845A" },
      { name: "Bronze\nEyeshadow",        hex: "#9A7040" },
      { name: "Warm Coral\nLip",          hex: "#D06040" },
    ],
  },

  "Soft Summer": {
    characteristics: ["Cool", "Muted", "Soft"],
    hero: [
      { name: "Dusty Rose",  hex: "#C48A98" },
      { name: "Soft Blue",   hex: "#7A9DB5" },
      { name: "Mauve",       hex: "#A87E90" },
      { name: "Sage",        hex: "#8EA898" },
    ],
    bestColors: [
      { name: "Dusty Rose",   hex: "#C48A98" },
      { name: "Soft Blue",    hex: "#7A9DB5" },
      { name: "Mauve",        hex: "#A87E90" },
      { name: "Sage Green",   hex: "#8EA898" },
      { name: "Lavender",     hex: "#A898C0" },
      { name: "Dusty Purple", hex: "#886888" },
    ],
    avoidColors: [
      { name: "Orange",      hex: "#E87040" },
      { name: "Bright Red",  hex: "#CC2200" },
      { name: "Black",       hex: "#202020" },
      { name: "Neon Green",  hex: "#39FF14" },
      { name: "Bright Gold", hex: "#D4A820" },
      { name: "Rust",        hex: "#B5451B" },
    ],
    neutrals: [
      { name: "Soft White",  hex: "#F1EEF0" },
      { name: "Rose Beige",  hex: "#DDD0C8" },
      { name: "Mushroom",    hex: "#B2A59F" },
      { name: "Slate Taupe", hex: "#8D8487" },
      { name: "Soft Navy",   hex: "#4F596B" },
    ],
    metals: ["Silver", "Rose Gold"],
    prints: [
      { label: "Watercolor Florals", bg: "#C58A97", pat: "#E7BBC5" },
      { label: "Soft Paisley",        bg: "#6D90A2", pat: "#AFC8D4" },
      { label: "Dusty Jacquard",      bg: "#C6B2A8", pat: "#E4D7D1" },
    ],
    makeup: [
      { name: "Rose\nBlush",         hex: "#D98A99" },
      { name: "Soft Taupe\nEyeshadow", hex: "#9B8C88" },
      { name: "Muted Rose\nLip",      hex: "#C47483" },
    ],
  },

  "Summer": {
    characteristics: ["Cool", "Muted", "Soft"],
    hero: [
      { name: "Soft Blue",   hex: "#7090B0" },
      { name: "Rose",        hex: "#C08090" },
      { name: "Lavender",    hex: "#A090B8" },
      { name: "Soft Teal",   hex: "#608090" },
    ],
    bestColors: [
      { name: "Powder Blue",   hex: "#7090B0" },
      { name: "Dusty Rose",    hex: "#C08090" },
      { name: "Lavender",      hex: "#A090B8" },
      { name: "Soft Teal",     hex: "#608090" },
      { name: "Soft Plum",     hex: "#806878" },
      { name: "Ash Blue",      hex: "#5E7888" },
    ],
    avoidColors: [
      { name: "Orange",        hex: "#E87040" },
      { name: "Warm Brown",    hex: "#9A6240" },
      { name: "Gold",          hex: "#D4A820" },
      { name: "Rust",          hex: "#B5451B" },
      { name: "Olive",         hex: "#7A7228" },
      { name: "Bright Yellow", hex: "#FFE000" },
    ],
    neutrals: [
      { name: "Soft White", hex: "#F0EEF2" },
      { name: "Cool Beige", hex: "#D8D0CC" },
      { name: "Mauve Gray", hex: "#B0A8AC" },
      { name: "Blue Gray",  hex: "#808898" },
      { name: "Slate",      hex: "#505A68" },
    ],
    metals: ["Silver", "Platinum"],
    prints: [
      { label: "Soft Stripes",   bg: "#7090B0", pat: "#C0D0E0" },
      { label: "Floral Paisley", bg: "#C08090", pat: "#E8C0C8" },
      { label: "Cool Jacquard",  bg: "#A090B8", pat: "#D0C8E0" },
    ],
    makeup: [
      { name: "Pink\nBlush",          hex: "#D090A0" },
      { name: "Taupe\nEyeshadow",      hex: "#9888A0" },
      { name: "Cool Rose\nLip",        hex: "#B87888" },
    ],
  },

  "Light Summer": {
    characteristics: ["Cool", "Light", "Soft"],
    hero: [
      { name: "Powder Pink", hex: "#E8C0C8" },
      { name: "Sky Blue",    hex: "#A8C8E0" },
      { name: "Soft Violet", hex: "#C8B8D8" },
      { name: "Ice Gray",    hex: "#D0D0D8" },
    ],
    bestColors: [
      { name: "Powder Pink",   hex: "#E8C0C8" },
      { name: "Sky Blue",      hex: "#A8C8E0" },
      { name: "Soft Violet",   hex: "#C8B8D8" },
      { name: "Mint",          hex: "#B0D8C8" },
      { name: "Lavender",      hex: "#C0B0D0" },
      { name: "Peach",         hex: "#F0C8B8" },
    ],
    avoidColors: [
      { name: "Black",         hex: "#202020" },
      { name: "Deep Brown",    hex: "#4A2E1E" },
      { name: "Bright Orange", hex: "#E87040" },
      { name: "Neon Yellow",   hex: "#FFEF00" },
      { name: "Rust",          hex: "#B5451B" },
      { name: "Olive",         hex: "#7A7228" },
    ],
    neutrals: [
      { name: "Icy White",  hex: "#F5F3F8" },
      { name: "Pale Rose",  hex: "#EAD8DC" },
      { name: "Cool Beige", hex: "#CCC4C8" },
      { name: "Soft Lilac", hex: "#B8B0C0" },
      { name: "Muted Blue", hex: "#8898A8" },
    ],
    metals: ["Silver", "Rose Gold"],
    prints: [
      { label: "Pastel Florals", bg: "#E8C0C8", pat: "#F8E0E4" },
      { label: "Soft Watercolor", bg: "#A8C8E0", pat: "#D0E8F4" },
      { label: "Airy Lace",       bg: "#C8B8D8", pat: "#E8E0F0" },
    ],
    makeup: [
      { name: "Petal\nBlush",          hex: "#F0A8B8" },
      { name: "Soft Mauve\nEyeshadow", hex: "#A898A8" },
      { name: "Sheer Rose\nLip",        hex: "#D898A8" },
    ],
  },

  "Spring": {
    characteristics: ["Warm", "Clear", "Fresh"],
    hero: [
      { name: "Coral",       hex: "#E8704A" },
      { name: "Warm Yellow", hex: "#F0C040" },
      { name: "Aqua",        hex: "#40B8C0" },
      { name: "Peach",       hex: "#F0A888" },
    ],
    bestColors: [
      { name: "Coral",       hex: "#E8704A" },
      { name: "Warm Yellow", hex: "#F0C040" },
      { name: "Aqua",        hex: "#40B8C0" },
      { name: "Peach",       hex: "#F0A888" },
      { name: "Warm Green",  hex: "#78B840" },
      { name: "Salmon",      hex: "#F08070" },
    ],
    avoidColors: [
      { name: "Black",        hex: "#202020" },
      { name: "Cool Gray",    hex: "#9098A0" },
      { name: "Burgundy",     hex: "#7A2233" },
      { name: "Cool Purple",  hex: "#7060A8" },
      { name: "Deep Navy",    hex: "#1A2A4A" },
      { name: "Icy Lavender", hex: "#D5C9E8" },
    ],
    neutrals: [
      { name: "Ivory",       hex: "#F7F0E4" },
      { name: "Oat",         hex: "#E2D0B4" },
      { name: "Warm Beige",  hex: "#CBAA86" },
      { name: "Golden Khaki",hex: "#A58B62" },
      { name: "Cocoa",       hex: "#76563C" },
    ],
    metals: ["Gold", "Rose Gold"],
    prints: [
      { label: "Fresh Florals",  bg: "#F08A68", pat: "#FFD2BE" },
      { label: "Light Paisley",  bg: "#7CC7B5", pat: "#B8E6DB" },
      { label: "Sunny Jacquard", bg: "#E2BB62", pat: "#F5E0A6" },
    ],
    makeup: [
      { name: "Apricot\nBlush",       hex: "#F08A68" },
      { name: "Honey Bronze\nEyeshadow", hex: "#B57942" },
      { name: "Warm Coral\nLip",       hex: "#E66F5C" },
    ],
  },

  "Soft Spring": {
    characteristics: ["Warm", "Muted", "Fresh"],
    hero: [
      { name: "Peach",      hex: "#EDA880" },
      { name: "Soft Teal",  hex: "#70B0A0" },
      { name: "Warm Beige", hex: "#D8C09A" },
      { name: "Sage",       hex: "#98B080" },
    ],
    bestColors: [
      { name: "Peach",       hex: "#EDA880" },
      { name: "Soft Teal",   hex: "#70B0A0" },
      { name: "Warm Beige",  hex: "#D8C09A" },
      { name: "Sage Green",  hex: "#98B080" },
      { name: "Butter",      hex: "#EDD890" },
      { name: "Soft Salmon", hex: "#E89888" },
    ],
    avoidColors: [
      { name: "Black",       hex: "#202020" },
      { name: "Royal Blue",  hex: "#2450A4" },
      { name: "Neon Pink",   hex: "#FF00AA" },
      { name: "Pure White",  hex: "#FFFFFF" },
      { name: "Charcoal",    hex: "#404040" },
      { name: "Cobalt",      hex: "#0048B0" },
    ],
    neutrals: [
      { name: "Warm Ivory",  hex: "#F5ECD8" },
      { name: "Sand",        hex: "#DEC898" },
      { name: "Camel",       hex: "#C0A070" },
      { name: "Warm Taupe",  hex: "#9E8060" },
      { name: "Cocoa",       hex: "#705040" },
    ],
    metals: ["Gold", "Rose Gold"],
    prints: [
      { label: "Soft Florals",  bg: "#EDA880", pat: "#F8CCA8" },
      { label: "Muted Paisley", bg: "#70B0A0", pat: "#A8D4C8" },
      { label: "Warm Jacquard", bg: "#D8C09A", pat: "#F0DEBB" },
    ],
    makeup: [
      { name: "Warm Peach\nBlush",       hex: "#F0A070" },
      { name: "Light Bronze\nEyeshadow", hex: "#A87848" },
      { name: "Salmon\nLip",             hex: "#E08070" },
    ],
  },

  "Light Spring": {
    characteristics: ["Warm", "Light", "Clear"],
    hero: [
      { name: "Butter",   hex: "#F5E080" },
      { name: "Aqua",     hex: "#78D0C0" },
      { name: "Blush",    hex: "#F0B8A0" },
      { name: "Mint",     hex: "#A8E0A0" },
    ],
    bestColors: [
      { name: "Butter Yellow", hex: "#F5E080" },
      { name: "Aqua",          hex: "#78D0C0" },
      { name: "Blush",         hex: "#F0B8A0" },
      { name: "Mint",          hex: "#A8E0A0" },
      { name: "Warm Coral",    hex: "#F09070" },
      { name: "Soft Gold",     hex: "#E8C870" },
    ],
    avoidColors: [
      { name: "Black",        hex: "#202020" },
      { name: "Burgundy",     hex: "#7A2233" },
      { name: "Cool Gray",    hex: "#9098A0" },
      { name: "Deep Navy",    hex: "#1A2A4A" },
      { name: "Olive",        hex: "#7A7228" },
      { name: "Cool Purple",  hex: "#7060A8" },
    ],
    neutrals: [
      { name: "Ivory",       hex: "#FAF2E0" },
      { name: "Warm Beige",  hex: "#EAD8B8" },
      { name: "Honey",       hex: "#D8B880" },
      { name: "Light Camel", hex: "#C09860" },
      { name: "Warm Taupe",  hex: "#9A7848" },
    ],
    metals: ["Gold", "Rose Gold"],
    prints: [
      { label: "Bright Florals", bg: "#F0B8A0", pat: "#FAD8C8" },
      { label: "Tropical Print", bg: "#78D0C0", pat: "#B8F0E8" },
      { label: "Light Paisley",  bg: "#F5E080", pat: "#FAF0B0" },
    ],
    makeup: [
      { name: "Peachy\nBlush",         hex: "#F5A888" },
      { name: "Warm Sand\nEyeshadow",   hex: "#C09860" },
      { name: "Light Coral\nLip",       hex: "#F09070" },
    ],
  },

  "Bright Spring": {
    characteristics: ["Warm", "Bright", "Clear"],
    hero: [
      { name: "Bright Coral", hex: "#F05530" },
      { name: "Turquoise",    hex: "#00BCD4" },
      { name: "Bright Yellow",hex: "#FFD600" },
      { name: "Warm Red",     hex: "#E83020" },
    ],
    bestColors: [
      { name: "Bright Coral",  hex: "#F05530" },
      { name: "Turquoise",     hex: "#00BCD4" },
      { name: "Bright Yellow", hex: "#FFD600" },
      { name: "Warm Red",      hex: "#E83020" },
      { name: "Kelly Green",   hex: "#40A828" },
      { name: "Bright Peach",  hex: "#F09060" },
    ],
    avoidColors: [
      { name: "Muted Olive",  hex: "#8A8048" },
      { name: "Dusty Rose",   hex: "#C48A98" },
      { name: "Muted Teal",   hex: "#507888" },
      { name: "Brown",        hex: "#7A5030" },
      { name: "Mauve",        hex: "#9A7080" },
      { name: "Gray",         hex: "#909090" },
    ],
    neutrals: [
      { name: "Warm White",   hex: "#F8F0E0" },
      { name: "Bright Beige", hex: "#E8D0A8" },
      { name: "Warm Tan",     hex: "#D0A870" },
      { name: "Camel",        hex: "#B88850" },
      { name: "Warm Brown",   hex: "#906030" },
    ],
    metals: ["Gold", "Rose Gold"],
    prints: [
      { label: "Vivid Florals", bg: "#F05530", pat: "#FFB040" },
      { label: "Tropical",      bg: "#00BCD4", pat: "#80E8F0" },
      { label: "Bold Paisley",  bg: "#FFD600", pat: "#FFF080" },
    ],
    makeup: [
      { name: "Bright Coral\nBlush",    hex: "#F06040" },
      { name: "Warm Gold\nEyeshadow",   hex: "#C09030" },
      { name: "Bright Coral\nLip",      hex: "#E84828" },
    ],
  },

  "Winter": {
    characteristics: ["Cool", "Bright", "Deep"],
    hero: [
      { name: "True Red",   hex: "#CC1122" },
      { name: "Navy",       hex: "#1A2A5A" },
      { name: "Emerald",    hex: "#0A6B3A" },
      { name: "Icy Pink",   hex: "#F0C0D0" },
    ],
    bestColors: [
      { name: "True Red",   hex: "#CC1122" },
      { name: "Navy",       hex: "#1A2A5A" },
      { name: "Emerald",    hex: "#0A6B3A" },
      { name: "Icy Pink",   hex: "#F0C0D0" },
      { name: "Bright Blue",hex: "#0050C0" },
      { name: "Fuchsia",    hex: "#C81878" },
    ],
    avoidColors: [
      { name: "Warm Orange", hex: "#E87040" },
      { name: "Peach",       hex: "#F0A888" },
      { name: "Gold",        hex: "#D4A820" },
      { name: "Rust",        hex: "#B5451B" },
      { name: "Olive",       hex: "#7A7228" },
      { name: "Warm Brown",  hex: "#9A6240" },
    ],
    neutrals: [
      { name: "Icy White",  hex: "#F5F5F8" },
      { name: "Cool Gray",  hex: "#D5D7DC" },
      { name: "Steel",      hex: "#A0A6AF" },
      { name: "Charcoal",   hex: "#5B6068" },
      { name: "Black",      hex: "#24272C" },
    ],
    metals: ["Silver", "Platinum"],
    prints: [
      { label: "High Contrast", bg: "#2F3138", pat: "#8892A0" },
      { label: "Jewel Paisley", bg: "#0F5E74", pat: "#58A8B8" },
      { label: "Icy Jacquard",  bg: "#C6CBD4", pat: "#EEF1F5" },
    ],
    makeup: [
      { name: "Berry\nBlush",      hex: "#B84368" },
      { name: "Charcoal\nEyeshadow", hex: "#514C52" },
      { name: "Rose Plum\nLip",    hex: "#A74762" },
    ],
  },

  "Deep Winter": {
    characteristics: ["Cool", "Rich", "Deep"],
    hero: [
      { name: "Deep Plum",  hex: "#5A1848" },
      { name: "True Black", hex: "#202020" },
      { name: "Jewel Teal", hex: "#0A5060" },
      { name: "Icy White",  hex: "#E8E8F0" },
    ],
    bestColors: [
      { name: "Deep Plum",    hex: "#5A1848" },
      { name: "True Black",   hex: "#202020" },
      { name: "Jewel Teal",   hex: "#0A5060" },
      { name: "Burgundy",     hex: "#7A1830" },
      { name: "Deep Emerald", hex: "#0A4828" },
      { name: "Cobalt",       hex: "#1038A0" },
    ],
    avoidColors: [
      { name: "Orange",       hex: "#E87040" },
      { name: "Gold",         hex: "#D4A820" },
      { name: "Camel",        hex: "#C4A06A" },
      { name: "Warm Brown",   hex: "#9A6240" },
      { name: "Peach",        hex: "#F0A888" },
      { name: "Dusty Rose",   hex: "#C48A98" },
    ],
    neutrals: [
      { name: "True White",  hex: "#F0F0F5" },
      { name: "Cool Gray",   hex: "#C8C8D0" },
      { name: "Slate",       hex: "#808090" },
      { name: "Charcoal",    hex: "#484858" },
      { name: "Deep Black",  hex: "#1A1A20" },
    ],
    metals: ["Silver", "Platinum"],
    prints: [
      { label: "Bold Contrast",  bg: "#202020", pat: "#F0F0F5" },
      { label: "Jewel Tones",    bg: "#0A5060", pat: "#5A1848" },
      { label: "Cool Damask",    bg: "#C8C8D0", pat: "#808090" },
    ],
    makeup: [
      { name: "Deep Berry\nBlush",    hex: "#9A2850" },
      { name: "Smoky\nEyeshadow",     hex: "#404050" },
      { name: "Deep Plum\nLip",       hex: "#7A1848" },
    ],
  },

  "Bright Winter": {
    characteristics: ["Cool", "Bright", "Clear"],
    hero: [
      { name: "Icy Pink",    hex: "#F080A8" },
      { name: "True Blue",   hex: "#0050E0" },
      { name: "Emerald",     hex: "#00A050" },
      { name: "True Red",    hex: "#E00020" },
    ],
    bestColors: [
      { name: "Icy Pink",    hex: "#F080A8" },
      { name: "True Blue",   hex: "#0050E0" },
      { name: "Emerald",     hex: "#00A050" },
      { name: "True Red",    hex: "#E00020" },
      { name: "Sapphire",    hex: "#0838A0" },
      { name: "Hot Pink",    hex: "#E02080" },
    ],
    avoidColors: [
      { name: "Muted Taupe", hex: "#A89888" },
      { name: "Dusty Rose",  hex: "#C48A98" },
      { name: "Camel",       hex: "#C4A06A" },
      { name: "Olive",       hex: "#7A7228" },
      { name: "Orange",      hex: "#E87040" },
      { name: "Warm Brown",  hex: "#9A6240" },
    ],
    neutrals: [
      { name: "Bright White", hex: "#F8F8FF" },
      { name: "Icy Silver",   hex: "#D8D8E8" },
      { name: "Cool Gray",    hex: "#A8A8B8" },
      { name: "Slate",        hex: "#686878" },
      { name: "True Black",   hex: "#181820" },
    ],
    metals: ["Silver", "Platinum"],
    prints: [
      { label: "Graphic Florals", bg: "#E00020", pat: "#F080A8" },
      { label: "Jewel Paisley",   bg: "#0050E0", pat: "#80A8F0" },
      { label: "High Contrast",   bg: "#181820", pat: "#F8F8FF" },
    ],
    makeup: [
      { name: "Hot Pink\nBlush",      hex: "#E04888" },
      { name: "Cool Taupe\nEyeshadow", hex: "#807880" },
      { name: "Berry Red\nLip",        hex: "#C02060" },
    ],
  },
};

/** Normalize raw season string → canonical preset key */
function normalizeSeasonKey(season: string): string {
  const s = season.trim();
  if (SEASON_PRESETS[s]) return s;
  // Try case-insensitive match
  const lower = s.toLowerCase();
  const found = Object.keys(SEASON_PRESETS).find(
    (k) => k.toLowerCase() === lower,
  );
  if (found) return found;
  // Partial match: "soft autumn" inside longer string
  const partial = Object.keys(SEASON_PRESETS).find(
    (k) => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower),
  );
  return partial ?? "Soft Autumn"; // safe fallback
}

/* ─── Comparison photo card ─────────────────────────────────────────────── */
/**
 * Comparison thumbnail.
 * Priority:
 *   1. aiPreviewUrl — real Replicate SDXL inpainted photo (best quality)
 *   2. photoUrl + CSS clip overlay — deterministic CSS clothing recolour
 *   3. Solid colour block fallback (no photo available)
 */
function ColorSwatch({
  hex,
  name,
  aiPreviewUrl,
  generating = false,
}: {
  hex: string;
  name: string;
  aiPreviewUrl?: string;
  generating?: boolean;
}) {
  // After 3 minutes stop spinning and fall back to color circle
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    if (!generating) return;
    const t = setTimeout(() => setTimedOut(true), 3 * 60 * 1000);
    return () => clearTimeout(t);
  }, [generating]);

  const showSkeleton = generating && !timedOut;
  const shades = [hex, lightenHex(hex, 0.18), lightenHex(hex, 0.36), lightenHex(hex, 0.55)];

  return (
    <div
      className="flex flex-col overflow-hidden group"
      style={{ border: "1.5px solid #E8DDD0", borderRadius: 10, background: "#fff" }}
    >
      <div
        className="relative w-full"
        style={{ aspectRatio: "3/4", overflow: "hidden", isolation: "isolate" }}
      >
        {aiPreviewUrl ? (
          <Image
            src={aiPreviewUrl}
            alt={name}
            fill
            unoptimized
            className="object-cover"
            style={{ objectPosition: "top center" }}
          />
        ) : showSkeleton ? (
          /* Skeleton — only shown while actively waiting for AI preview */
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1"
            style={{ background: "#F5EFE7" }}
          >
            <div className="h-10 w-10 rounded-full animate-pulse" style={{ backgroundColor: hex, opacity: 0.6 }} />
            <span className="text-[8px] text-center px-1" style={{ color: "#9C7D5B" }}>Generating…</span>
          </div>
        ) : (
          /* Static color circle — no AI preview available */
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "#F5EFE7" }}
          >
            <div className="h-12 w-12 rounded-full" style={{ backgroundColor: hex }} />
          </div>
        )}

        {/* Color name label */}
        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: "rgba(0,0,0,0.32)" }}>
          <span className="text-[8px] font-semibold text-white truncate block leading-tight">{name}</span>
        </div>

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
  bestColorPreviewUrls,
  avoidColorPreviewUrls,
  swatchesGenerating = false,
}: {
  data: ColorAnalysisResult;
  photoUrl?: string;
  /**
   * True while the visuals route is actively running.
   * Only show the Generating skeleton during this window.
   */
  swatchesGenerating?: boolean;
  /**
   * Optional array of signed URLs for AI-generated clothing colour previews.
   * Index N maps to bestColors[N]. Indices 0-5 = best colors.
   */
  bestColorPreviewUrls?: (string | undefined)[];
  /**
   * Optional array of signed URLs for avoid-color clothing previews.
   * Index N maps to avoidColors[N]. Indices 0-5 = avoid colors.
   */
  avoidColorPreviewUrls?: (string | undefined)[];
}) {
  const presetKey = normalizeSeasonKey(data.season);
  // Guard: normalizeSeasonKey always returns a valid key (falls back to "Soft Autumn"),
  // but we defensively fall back here too to avoid a runtime crash on unexpected input.
  const preset = SEASON_PRESETS[presetKey] ?? SEASON_PRESETS["Soft Autumn"]!;

  const bestSix = preset.bestColors;
  const avoidSix = preset.avoidColors;

  const characteristics = [
    { icon: <IconSun />,        label: preset.characteristics[0] },
    { icon: <IconLeaf />,       label: preset.characteristics[1] },
    { icon: <IconHalfCircle />, label: preset.characteristics[2] },
  ];

  const neutrals = preset.neutrals;
  const makeupColors = preset.makeup;

  const pill = "px-5 py-1 rounded-full text-[10px] uppercase tracking-[0.16em] font-semibold inline-block";
  const pillStyle = { background: "#F0E8DC", color: "#9C7D5B", border: "1px solid #E8DDD0" };
  const sectionTitle = "text-[11px] uppercase tracking-[0.16em] font-bold";

  const metalGradients: Record<string, [string, string]> = {
    gold:    ["#E8C96A", "#C9A83C"],
    rose:    ["#E8B4A0", "#C98070"],
    silver:  ["#E0E0E0", "#9A9A9A"],
    bronze:  ["#C8956B", "#8B5E3C"],
    copper:  ["#D4836A", "#A0503A"],
    platinum:["#D8D8D8", "#A8A8A8"],
  };
  function metalGrad(m: string): string {
    const lower = m.toLowerCase();
    // Sort keys longest-first so "rose gold" matches "rose gold" before "rose" or "gold".
    const key =
      Object.keys(metalGradients)
        .sort((a, b) => b.length - a.length)
        .find((k) => lower.includes(k)) ?? "gold";
    return metalGradients[key].join(",");
  }

  return (
    <div className="overflow-hidden" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0", borderRadius: 12 }}>

      {/* ── Top half: photo LEFT + info RIGHT ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row">

        {/* Photo — fills left half, same height as info panel */}
        <div
          className="relative flex-shrink-0 w-full md:w-[53%]"
          style={{
            aspectRatio: "0.785 / 1",
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
          className="flex flex-col justify-center gap-6 px-8 py-8 flex-1"
          style={{ background: "#FDFAF6" }}
        >
          {/* Big heading */}
          <h2
            className="text-right text-[2rem] font-black uppercase tracking-[0.16em] leading-none"
            style={{ color: "#3D2B1F" }}
          >
            Color Analysis
          </h2>

          {/* Season pill + name */}
          <div className="flex flex-col items-center gap-2">
            <span className={pill} style={pillStyle}>Season</span>
            <p
              className="text-[1.9rem] font-black uppercase tracking-[0.07em] text-center leading-tight"
              style={{ color: "#3D2B1F" }}
            >
              {data.season}
            </p>
          </div>

          {/* 4 key palette dots */}
          <div className="flex justify-center gap-4">
            {preset.hero.map((c) => (
              <span
                key={c.hex}
                className="h-14 w-14 rounded-full"
                style={{ backgroundColor: c.hex, border: "3px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", display: "inline-block" }}
                title={c.name}
              />
            ))}
          </div>

          {/* Characteristics */}
          <div className="flex flex-col items-center gap-2">
            <span className={pill} style={pillStyle}>Characteristics</span>
            <div className="flex gap-10 justify-center mt-1">
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
            <div className="flex gap-4 justify-center mt-1">
              {neutrals.map((n) => (
                <span
                  key={n.hex}
                  className="h-11 w-11 rounded-full"
                  style={{ backgroundColor: n.hex, border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", display: "inline-block" }}
                  title={n.name}
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
          {bestSix.map((c, i) => (
            <ColorSwatch
              key={c.hex}
              hex={c.hex}
              name={c.name}
              aiPreviewUrl={bestColorPreviewUrls?.[i]}
              generating={swatchesGenerating && !bestColorPreviewUrls?.[i]}
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
          {avoidSix.map((c, i) => (
            <ColorSwatch
              key={c.hex}
              hex={c.hex}
              name={c.name}
              aiPreviewUrl={avoidColorPreviewUrls?.[i]}
              generating={swatchesGenerating && !avoidColorPreviewUrls?.[i]}
            />
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
            {preset.metals.slice(0, 2).map((metal) => (
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
            {preset.prints.map((p) => <PrintSwatch key={p.label} {...p} />)}
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
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
