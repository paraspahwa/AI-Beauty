"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ExternalLink, ShoppingBag } from "lucide-react";
import type { ColorAnalysisResult, SkinAnalysisResult } from "@/types/report";

// ── Types ─────────────────────────────────────────────────────────────────────
interface StylePrefsData {
  color_season: string | null;
  undertone: string | null;
  skin_type: string | null;
  prefs: { metals?: string[]; palette?: string[] } | null;
}
interface LatestData {
  color_analysis: ColorAnalysisResult | null;
  skin_analysis: SkinAnalysisResult | null;
}
interface Props {
  prefs: StylePrefsData | null;
  latest: LatestData | null;
}

// ── Capsule catalogue ─────────────────────────────────────────────────────────
type CapsuleItem = {
  number: number;
  category: string;
  name: string;
  why: string;
  hex: string;
  myntra?: string;
  amazon?: string;
};

const SEASON_CAPSULES: Record<string, CapsuleItem[]> = {
  "Autumn": [
    { number: 1, category: "Base", name: "Camel coat", why: "Your warm golden undertone makes camel the perfect neutral outerwear", hex: "#C4A882", myntra: "camel coat women", amazon: "camel overcoat women" },
    { number: 2, category: "Base", name: "Chocolate trousers", why: "Deep chocolate grounds your earthy palette and works with everything", hex: "#5C3A1E", myntra: "chocolate brown trousers", amazon: "dark brown pants women" },
    { number: 3, category: "Base", name: "Olive crewneck", why: "Olive is a signature Autumn tone that flatters your warm skin beautifully", hex: "#6B7045", myntra: "olive green crewneck", amazon: "olive sweater women" },
    { number: 4, category: "Colour", name: "Terracotta midi dress", why: "Your season's hero colour — warm, earthy, and luminous on your skin", hex: "#C17A5F", myntra: "terracotta midi dress", amazon: "terracotta dress women" },
    { number: 5, category: "Colour", name: "Rust-orange kurta", why: "Rust is your power colour for Indian occasions", hex: "#B7410E", myntra: "rust orange kurta", amazon: "rust kurta women" },
    { number: 6, category: "Colour", name: "Mustard blouse", why: "Mustard yellow lights up your face and works for day and evening looks", hex: "#E1A820", myntra: "mustard yellow top", amazon: "mustard blouse women" },
    { number: 7, category: "Neutral", name: "Cream linen shirt", why: "Warm ivory replaces harsh white and pairs seamlessly with your palette", hex: "#F5ECD7", myntra: "cream linen shirt women", amazon: "ivory linen top women" },
    { number: 8, category: "Neutral", name: "Tan leather belt", why: "A warm tan accessory ties any outfit in your palette together", hex: "#A0522D", amazon: "tan leather belt women" },
    { number: 9, category: "Pattern", name: "Paisley print scarf", why: "Earth-tone paisley prints are quintessential Autumn and versatile", hex: "#8B6655", myntra: "paisley scarf women", amazon: "paisley print scarf" },
    { number: 10, category: "Evening", name: "Burgundy wrap dress", why: "Deep burgundy is your evening power move — rich, warm, and striking", hex: "#722F37", myntra: "burgundy wrap dress", amazon: "burgundy wrap dress women" },
  ],
  "Spring": [
    { number: 1, category: "Base", name: "Warm white shirt", why: "Off-white (not stark white) works with your warm golden undertone", hex: "#FDF5E6", myntra: "off white shirt women", amazon: "warm white blouse women" },
    { number: 2, category: "Base", name: "Light camel trousers", why: "Light camel is your go-to neutral — warm, bright, and universally flattering", hex: "#D4A76A", myntra: "camel trousers women", amazon: "light tan pants women" },
    { number: 3, category: "Base", name: "Denim jacket", why: "Light wash denim with warm undertones suits your Spring brightness", hex: "#7FA1C3", myntra: "light denim jacket women", amazon: "light wash denim jacket women" },
    { number: 4, category: "Colour", name: "Coral wrap dress", why: "Coral is your signature Spring colour — warm, vivid, and skin-glowing", hex: "#FF6B6B", myntra: "coral wrap dress", amazon: "coral dress women" },
    { number: 5, category: "Colour", name: "Warm turquoise kurta", why: "Bright turquoise pops against your warm skin in a uniquely Spring way", hex: "#40E0D0", myntra: "turquoise kurta women", amazon: "turquoise top women" },
    { number: 6, category: "Colour", name: "Peach blouse", why: "Peach is near your natural blush and creates a lit-from-within effect", hex: "#FFCBA4", myntra: "peach top women", amazon: "peach blouse women" },
    { number: 7, category: "Neutral", name: "Ivory linen co-ord", why: "Warm ivory co-ords are a capsule essential for Spring's fresh warmth", hex: "#FFFFF0", myntra: "ivory co-ord set women", amazon: "linen co-ord set women" },
    { number: 8, category: "Neutral", name: "Gold hoop earrings", why: "Gold jewellery is your metal — it amplifies your warm Spring glow", hex: "#FFD700", amazon: "gold hoop earrings women" },
    { number: 9, category: "Pattern", name: "Floral midi skirt", why: "Warm-toned florals in coral and yellow capture your Spring season perfectly", hex: "#E8A87C", myntra: "floral midi skirt women", amazon: "floral skirt women" },
    { number: 10, category: "Evening", name: "Gold-tone saree", why: "A warm gold saree is your showstopper occasion piece", hex: "#C5A028", myntra: "gold saree women", amazon: "golden saree women" },
  ],
  "Summer": [
    { number: 1, category: "Base", name: "Soft white shirt", why: "Pure cool white harmonises with your cool-toned, rosy complexion", hex: "#F0F0F0", myntra: "white shirt women", amazon: "white cotton shirt women" },
    { number: 2, category: "Base", name: "Navy blue trousers", why: "Navy is the definitive Summer neutral — cool, elegant, and universally flattering", hex: "#1F3A5F", myntra: "navy trousers women", amazon: "navy pants women" },
    { number: 3, category: "Base", name: "Light grey blazer", why: "Cool grey sits perfectly in your muted, cool Summer palette", hex: "#B0B0B0", myntra: "grey blazer women", amazon: "light grey blazer women" },
    { number: 4, category: "Colour", name: "Dusty rose midi dress", why: "Your signature Summer hue — a muted, cool pink that glows on cool skin", hex: "#C4837A", myntra: "dusty rose dress", amazon: "dusty pink midi dress women" },
    { number: 5, category: "Colour", name: "Lavender kurta", why: "Lavender is peak Summer — soft, cool-toned, and irresistibly feminine", hex: "#9B89C4", myntra: "lavender kurta women", amazon: "lavender top women" },
    { number: 6, category: "Colour", name: "Sky blue saree", why: "Soft sky blue is your occasion colour — cool, luminous, and striking", hex: "#87CEEB", myntra: "sky blue saree", amazon: "light blue saree women" },
    { number: 7, category: "Neutral", name: "Mauve cardigan", why: "A cool mauve layering piece works in every Summer occasion", hex: "#C09EAC", myntra: "mauve cardigan women", amazon: "mauve sweater women" },
    { number: 8, category: "Neutral", name: "Silver drop earrings", why: "Silver is your jewellery metal — it enhances your cool, rosy complexion", hex: "#C0C0C0", amazon: "silver drop earrings women" },
    { number: 9, category: "Pattern", name: "Floral in blue & pink", why: "Cool-toned florals bring out your season's romantic, soft aesthetic", hex: "#A9C4D4", myntra: "floral blue pink dress women", amazon: "floral blue dress women" },
    { number: 10, category: "Evening", name: "Plum anarkali", why: "Deep plum is your evening showstopper — a regal cool-toned impact colour", hex: "#7B2D8B", myntra: "plum anarkali", amazon: "dark purple anarkali women" },
  ],
  "Winter": [
    { number: 1, category: "Base", name: "Pure white shirt", why: "Bright white (not cream) gives you the stark, clean contrast Winter craves", hex: "#FFFFFF", myntra: "white formal shirt women", amazon: "white cotton shirt women" },
    { number: 2, category: "Base", name: "Black straight trousers", why: "Black is Winter's ultimate neutral — high contrast, sharp, and powerful", hex: "#1A1A1A", myntra: "black straight trousers women", amazon: "black trousers women" },
    { number: 3, category: "Base", name: "Charcoal grey coat", why: "Deep charcoal is a Winter staple that creates effortless sophistication", hex: "#36454F", myntra: "charcoal coat women", amazon: "charcoal overcoat women" },
    { number: 4, category: "Colour", name: "Emerald green blazer", why: "Emerald is a Winter jewel tone that creates stunning contrast on your cool skin", hex: "#046307", myntra: "emerald green blazer women", amazon: "emerald blazer women" },
    { number: 5, category: "Colour", name: "Royal blue saree", why: "Royal blue is your power occasion colour — cool, vivid, unmistakable", hex: "#4169E1", myntra: "royal blue saree", amazon: "royal blue saree women" },
    { number: 6, category: "Colour", name: "Fuchsia midi dress", why: "Bright fuchsia creates electric contrast with your cool Winter colouring", hex: "#FF00FF", myntra: "fuchsia dress women", amazon: "hot pink midi dress women" },
    { number: 7, category: "Neutral", name: "Navy roll-neck", why: "Deep navy is Winter's sophisticated alternative to black for layering", hex: "#003153", myntra: "navy turtleneck women", amazon: "navy blue roll neck sweater" },
    { number: 8, category: "Neutral", name: "Platinum stud earrings", why: "Platinum and silver jewellery complements your cool Winter complexion perfectly", hex: "#E5E4E2", amazon: "platinum stud earrings women" },
    { number: 9, category: "Pattern", name: "Houndstooth scarf", why: "High-contrast black and white prints are quintessential Winter chic", hex: "#2F2F2F", myntra: "houndstooth scarf women", amazon: "black white houndstooth scarf" },
    { number: 10, category: "Evening", name: "Burgundy velvet dress", why: "Deep burgundy velvet is your evening power move — rich, cool-toned, regal", hex: "#722F37", myntra: "burgundy velvet dress women", amazon: "dark red velvet dress women" },
  ],
};

// Fall back sub-seasons to parent
function getCapsule(season: string): CapsuleItem[] {
  if (SEASON_CAPSULES[season]) return SEASON_CAPSULES[season];
  for (const key of Object.keys(SEASON_CAPSULES)) {
    if (season.toLowerCase().includes(key.toLowerCase())) return SEASON_CAPSULES[key];
  }
  return SEASON_CAPSULES["Autumn"]; // final fallback
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  Base:    { bg: "rgba(255,255,255,0.07)", color: "rgba(240,232,216,0.5)" },
  Colour:  { bg: "rgba(201,149,107,0.12)", color: "#C9956B" },
  Neutral: { bg: "rgba(123,110,158,0.12)", color: "#A69CC4" },
  Pattern: { bg: "rgba(99,162,130,0.12)", color: "#63A282" },
  Evening: { bg: "rgba(232,200,144,0.12)", color: "#E8C990" },
};

// ── Component ─────────────────────────────────────────────────────────────────
export function WardrobeCapsuleCard({ prefs, latest }: Props) {
  const [activeFilter, setActiveFilter] = React.useState<string>("All");

  const season   = prefs?.color_season ?? latest?.color_analysis?.season ?? "Autumn";
  const undertone = prefs?.undertone   ?? latest?.color_analysis?.undertone ?? "Warm";
  const skinType  = prefs?.skin_type   ?? latest?.skin_analysis?.type ?? null;

  const capsule = React.useMemo(() => getCapsule(season), [season]);
  const categories = ["All", ...Array.from(new Set(capsule.map((i) => i.category)))];
  const filtered = activeFilter === "All" ? capsule : capsule.filter((i) => i.category === activeFilter);

  function myntraUrl(q: string) { return `https://www.myntra.com/${encodeURIComponent(q)}`; }
  function amazonUrl(q: string) { return `https://www.amazon.in/s?k=${encodeURIComponent(q)}`; }

  return (
    <div className="space-y-6">
      {/* Season header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(201,149,107,0.15) 0%, rgba(123,110,158,0.08) 100%)",
          border: "1px solid rgba(201,149,107,0.22)",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.35em] font-semibold mb-1" style={{ color: "#C8A96E" }}>
          Your 10-Piece Capsule
        </p>
        <h2 className="font-serif text-2xl" style={{ color: "#F0E8D8" }}>
          {season} · {undertone} undertone
        </h2>
        <p className="mt-1 text-sm" style={{ color: "rgba(240,232,216,0.5)" }}>
          A curated wardrobe built for your exact colour season
          {skinType ? ` and ${skinType.toLowerCase()} skin` : ""}.
          Every piece works with every other piece.
        </p>
      </motion.div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const active = activeFilter === cat;
          const style = active ? { background: "linear-gradient(135deg,#C9956B,#E8C990)", color: "#3D2B1F" } : { background: "rgba(255,255,255,0.05)", color: "rgba(240,232,216,0.5)", border: "1px solid rgba(255,255,255,0.08)" };
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
              style={style}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Capsule items */}
      <div className="space-y-3">
        {filtered.map((item, idx) => {
          const catStyle = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS["Base"];
          return (
            <motion.div
              key={item.number}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * idx }}
              className="flex items-start gap-4 rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* Colour swatch */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className="h-10 w-10 rounded-xl shadow-md"
                  style={{ background: item.hex, border: "2px solid rgba(255,255,255,0.1)" }}
                />
                <span className="text-[10px] font-bold" style={{ color: "rgba(240,232,216,0.25)" }}>
                  {item.number.toString().padStart(2, "0")}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: "#F0E8D8" }}>{item.name}</p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={catStyle}
                  >
                    {item.category}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(240,232,216,0.5)" }}>
                  {item.why}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {item.myntra && (
                    <a
                      href={myntraUrl(item.myntra)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-medium transition-opacity hover:opacity-70"
                      style={{ color: "#FF3A3A" }}
                    >
                      Myntra <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {item.amazon && (
                    <a
                      href={amazonUrl(item.amazon)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-medium transition-opacity hover:opacity-70"
                      style={{ color: "#D68900" }}
                    >
                      Amazon <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-[11px]" style={{ color: "rgba(240,232,216,0.2)" }}>
        Pre-filled search links · StyleAI is not affiliated with any retailer
      </p>
    </div>
  );
}
