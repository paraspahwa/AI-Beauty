/**
 * Canonical color data for each color season.
 * Shared between the UI (ColorAnalysisCard.tsx) and the server-side
 * image-generation pipeline (visuals.ts) so previews always match what is displayed.
 */

export interface SeasonColorEntry {
  name: string;
  hex: string;
}

export interface SeasonColorPalette {
  /** 6 best / most flattering colors */
  best: SeasonColorEntry[];
  /** 6 colors to avoid */
  avoid: SeasonColorEntry[];
}

export const SEASON_COLOR_PALETTES: Record<string, SeasonColorPalette> = {
  "Soft Autumn": {
    best: [
      { name: "Olive Green",   hex: "#7A7A3A" },
      { name: "Terracotta",    hex: "#C2673A" },
      { name: "Muted Teal",    hex: "#3E8FA0" },
      { name: "Mustard",       hex: "#C9A020" },
      { name: "Warm Brown",    hex: "#9A6240" },
      { name: "Dusty Rose",    hex: "#D4907E" },
    ],
    avoid: [
      { name: "Black",       hex: "#202020" },
      { name: "Pure White",  hex: "#F4F1ED" },
      { name: "Icy Gray",    hex: "#C9C5C6" },
      { name: "Hot Pink",    hex: "#C2185B" },
      { name: "Pastel Blue", hex: "#9DD3E8" },
      { name: "Royal Blue",  hex: "#2450A4" },
    ],
  },
  "Deep Autumn": {
    best: [
      { name: "Burgundy",     hex: "#7A2233" },
      { name: "Rust",         hex: "#A84425" },
      { name: "Forest Green", hex: "#3B5E3A" },
      { name: "Dark Olive",   hex: "#5C5A2A" },
      { name: "Espresso",     hex: "#4A2E1E" },
      { name: "Deep Teal",    hex: "#1F5C60" },
    ],
    avoid: [
      { name: "Pastel Pink",  hex: "#F4C2C2" },
      { name: "Icy Lavender", hex: "#D5C9E8" },
      { name: "Light Gray",   hex: "#D0D0D0" },
      { name: "Mint",         hex: "#B2DFD0" },
      { name: "Baby Blue",    hex: "#AED6F1" },
      { name: "Pale Yellow",  hex: "#FFF9C4" },
    ],
  },
  "Autumn": {
    best: [
      { name: "Rust",         hex: "#B5451B" },
      { name: "Olive Green",  hex: "#7A7228" },
      { name: "Pumpkin",      hex: "#D2692A" },
      { name: "Warm Brown",   hex: "#8C5A35" },
      { name: "Golden Ochre", hex: "#C89030" },
      { name: "Deep Teal",    hex: "#285E60" },
    ],
    avoid: [
      { name: "Pure Black",  hex: "#111111" },
      { name: "Cool White",  hex: "#EEF0F2" },
      { name: "Fuchsia",     hex: "#C2185B" },
      { name: "Icy Blue",    hex: "#AED6F1" },
      { name: "Lilac",       hex: "#D7BDE2" },
      { name: "Silver Gray", hex: "#BFC9CA" },
    ],
  },
  "Soft Summer": {
    best: [
      { name: "Dusty Rose",   hex: "#C48A98" },
      { name: "Soft Blue",    hex: "#7A9DB5" },
      { name: "Mauve",        hex: "#A87E90" },
      { name: "Sage Green",   hex: "#8EA898" },
      { name: "Lavender",     hex: "#A898C0" },
      { name: "Dusty Purple", hex: "#886888" },
    ],
    avoid: [
      { name: "Orange",      hex: "#E87040" },
      { name: "Bright Red",  hex: "#CC2200" },
      { name: "Black",       hex: "#202020" },
      { name: "Neon Green",  hex: "#39FF14" },
      { name: "Bright Gold", hex: "#D4A820" },
      { name: "Rust",        hex: "#B5451B" },
    ],
  },
  "Summer": {
    best: [
      { name: "Powder Blue",   hex: "#7090B0" },
      { name: "Dusty Rose",    hex: "#C08090" },
      { name: "Lavender",      hex: "#A090B8" },
      { name: "Soft Teal",     hex: "#608090" },
      { name: "Soft Plum",     hex: "#806878" },
      { name: "Ash Blue",      hex: "#5E7888" },
    ],
    avoid: [
      { name: "Orange",        hex: "#E87040" },
      { name: "Warm Brown",    hex: "#9A6240" },
      { name: "Gold",          hex: "#D4A820" },
      { name: "Rust",          hex: "#B5451B" },
      { name: "Olive",         hex: "#7A7228" },
      { name: "Bright Yellow", hex: "#FFE000" },
    ],
  },
  "Light Summer": {
    best: [
      { name: "Powder Pink",   hex: "#E8C0C8" },
      { name: "Sky Blue",      hex: "#A8C8E0" },
      { name: "Soft Violet",   hex: "#C8B8D8" },
      { name: "Mint",          hex: "#B0D8C8" },
      { name: "Lavender",      hex: "#C0B0D0" },
      { name: "Peach",         hex: "#F0C8B8" },
    ],
    avoid: [
      { name: "Black",         hex: "#202020" },
      { name: "Deep Brown",    hex: "#4A2E1E" },
      { name: "Bright Orange", hex: "#E87040" },
      { name: "Neon Yellow",   hex: "#FFEF00" },
      { name: "Rust",          hex: "#B5451B" },
      { name: "Olive",         hex: "#7A7228" },
    ],
  },
  "Spring": {
    best: [
      { name: "Coral",       hex: "#E8704A" },
      { name: "Warm Yellow", hex: "#F0C040" },
      { name: "Aqua",        hex: "#40B8C0" },
      { name: "Peach",       hex: "#F0A888" },
      { name: "Warm Green",  hex: "#78B840" },
      { name: "Salmon",      hex: "#F08070" },
    ],
    avoid: [
      { name: "Black",        hex: "#202020" },
      { name: "Cool Gray",    hex: "#9098A0" },
      { name: "Burgundy",     hex: "#7A2233" },
      { name: "Cool Purple",  hex: "#7060A8" },
      { name: "Deep Navy",    hex: "#1A2A4A" },
      { name: "Icy Lavender", hex: "#D5C9E8" },
    ],
  },
  "Soft Spring": {
    best: [
      { name: "Peach",       hex: "#EDA880" },
      { name: "Soft Teal",   hex: "#70B0A0" },
      { name: "Warm Beige",  hex: "#D8C09A" },
      { name: "Sage Green",  hex: "#98B080" },
      { name: "Butter",      hex: "#EDD890" },
      { name: "Soft Salmon", hex: "#E89888" },
    ],
    avoid: [
      { name: "Black",       hex: "#202020" },
      { name: "Royal Blue",  hex: "#2450A4" },
      { name: "Neon Pink",   hex: "#FF00AA" },
      { name: "Pure White",  hex: "#FFFFFF" },
      { name: "Charcoal",    hex: "#404040" },
      { name: "Cobalt",      hex: "#0048B0" },
    ],
  },
  "Light Spring": {
    best: [
      { name: "Butter Yellow", hex: "#F5E080" },
      { name: "Aqua",          hex: "#78D0C0" },
      { name: "Blush",         hex: "#F0B8A0" },
      { name: "Mint",          hex: "#A8E0A0" },
      { name: "Warm Coral",    hex: "#F09070" },
      { name: "Soft Gold",     hex: "#E8C870" },
    ],
    avoid: [
      { name: "Black",        hex: "#202020" },
      { name: "Burgundy",     hex: "#7A2233" },
      { name: "Cool Gray",    hex: "#9098A0" },
      { name: "Deep Navy",    hex: "#1A2A4A" },
      { name: "Olive",        hex: "#7A7228" },
      { name: "Cool Purple",  hex: "#7060A8" },
    ],
  },
  "Bright Spring": {
    best: [
      { name: "Bright Coral",  hex: "#F05530" },
      { name: "Turquoise",     hex: "#00BCD4" },
      { name: "Bright Yellow", hex: "#FFD600" },
      { name: "Warm Red",      hex: "#E83020" },
      { name: "Kelly Green",   hex: "#40A828" },
      { name: "Bright Peach",  hex: "#F09060" },
    ],
    avoid: [
      { name: "Muted Olive",  hex: "#8A8048" },
      { name: "Dusty Rose",   hex: "#C48A98" },
      { name: "Muted Teal",   hex: "#507888" },
      { name: "Brown",        hex: "#7A5030" },
      { name: "Mauve",        hex: "#9A7080" },
      { name: "Gray",         hex: "#909090" },
    ],
  },
  "Winter": {
    best: [
      { name: "True Red",   hex: "#CC1122" },
      { name: "Navy",       hex: "#1A2A5A" },
      { name: "Emerald",    hex: "#0A6B3A" },
      { name: "Icy Pink",   hex: "#F0C0D0" },
      { name: "Bright Blue",hex: "#0050C0" },
      { name: "Fuchsia",    hex: "#C81878" },
    ],
    avoid: [
      { name: "Warm Orange", hex: "#E87040" },
      { name: "Peach",       hex: "#F0A888" },
      { name: "Gold",        hex: "#D4A820" },
      { name: "Rust",        hex: "#B5451B" },
      { name: "Olive",       hex: "#7A7228" },
      { name: "Warm Brown",  hex: "#9A6240" },
    ],
  },
  "Deep Winter": {
    best: [
      { name: "Deep Plum",    hex: "#5A1848" },
      { name: "True Black",   hex: "#202020" },
      { name: "Jewel Teal",   hex: "#0A5060" },
      { name: "Burgundy",     hex: "#7A1830" },
      { name: "Deep Emerald", hex: "#0A4828" },
      { name: "Cobalt",       hex: "#1038A0" },
    ],
    avoid: [
      { name: "Orange",       hex: "#E87040" },
      { name: "Gold",         hex: "#D4A820" },
      { name: "Camel",        hex: "#C4A06A" },
      { name: "Warm Brown",   hex: "#9A6240" },
      { name: "Peach",        hex: "#F0A888" },
      { name: "Dusty Rose",   hex: "#C48A98" },
    ],
  },
  "Bright Winter": {
    best: [
      { name: "Icy Pink",    hex: "#F080A8" },
      { name: "True Blue",   hex: "#0050E0" },
      { name: "Emerald",     hex: "#00A050" },
      { name: "True Red",    hex: "#E00020" },
      { name: "Sapphire",    hex: "#0838A0" },
      { name: "Hot Pink",    hex: "#E02080" },
    ],
    avoid: [
      { name: "Muted Taupe", hex: "#A89888" },
      { name: "Dusty Rose",  hex: "#C48A98" },
      { name: "Camel",       hex: "#C4A06A" },
      { name: "Olive",       hex: "#7A7228" },
      { name: "Orange",      hex: "#E87040" },
      { name: "Warm Brown",  hex: "#9A6240" },
    ],
  },
};

/** Normalize a raw season string to a canonical SEASON_COLOR_PALETTES key. */
export function normalizeSeasonKey(season: string): string {
  const s = (season ?? "").trim();
  if (SEASON_COLOR_PALETTES[s]) return s;
  const lower = s.toLowerCase();
  const exact = Object.keys(SEASON_COLOR_PALETTES).find(
    (k) => k.toLowerCase() === lower,
  );
  if (exact) return exact;
  const partial = Object.keys(SEASON_COLOR_PALETTES).find(
    (k) => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower),
  );
  return partial ?? "Soft Autumn";
}
