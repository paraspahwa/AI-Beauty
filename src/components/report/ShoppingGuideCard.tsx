"use client";

import * as React from "react";
import { ExternalLink, ShoppingBag, Sparkles } from "lucide-react";
import type { CompiledReport } from "@/types/report";

// ── Platform metadata ─────────────────────────────────────────────────────────
type Platform = "myntra" | "nykaa" | "amazon" | "lenskart";

const PLATFORMS: Record<Platform, { label: string; bg: string; color: string }> = {
  myntra:   { label: "Myntra",   bg: "rgba(255,58,58,0.10)",    color: "#FF3A3A" },
  nykaa:    { label: "Nykaa",    bg: "rgba(252,87,87,0.10)",    color: "#E84C4C" },
  amazon:   { label: "Amazon",   bg: "rgba(255,153,0,0.12)",    color: "#D68900" },
  lenskart: { label: "Lenskart", bg: "rgba(53,154,162,0.10)",   color: "#359AA2" },
};

// ── URL builder helpers ───────────────────────────────────────────────────────
function myntra(q: string)   { return `https://www.myntra.com/${encodeURIComponent(q)}`; }
function nykaa(q: string)    { return `https://www.nykaa.com/search/result/?q=${encodeURIComponent(q)}&root=true`; }
function amazon(q: string)   { return `https://www.amazon.in/s?k=${encodeURIComponent(q)}`; }
function lenskart(q: string) { return `https://www.lenskart.com/search?q=${encodeURIComponent(q)}`; }

// ── Types ─────────────────────────────────────────────────────────────────────
type ShopLink = { label: string; url: string; platform: Platform };
type ShopSection = { icon: string; title: string; description: string; links: ShopLink[] };

// ── Season → palette keyword mapping ─────────────────────────────────────────
const SEASON_COLORS: Record<string, string[]> = {
  "Warm Autumn":   ["terracotta", "rust brown", "olive green", "camel", "mustard yellow"],
  "Deep Autumn":   ["burnt orange", "dark olive", "burgundy brown", "chocolate", "rust"],
  "Soft Autumn":   ["warm taupe", "dusty sage", "peach", "camel", "muted coral"],
  "Autumn":        ["terracotta", "olive green", "camel", "rust", "mustard"],
  "Light Spring":  ["peach", "warm coral", "mint green", "warm ivory", "soft gold"],
  "Warm Spring":   ["coral", "warm yellow", "turquoise", "peach", "bright gold"],
  "Bright Spring": ["coral red", "turquoise", "bright yellow", "hot pink", "lime"],
  "Spring":        ["coral", "peach", "warm yellow", "mint", "turquoise"],
  "Soft Summer":   ["dusty pink", "mauve", "soft lavender", "sky blue", "powder blue"],
  "Light Summer":  ["powder pink", "periwinkle", "soft blue", "lavender", "blush"],
  "Cool Summer":   ["dusky rose", "steel blue", "soft plum", "cool lavender", "navy"],
  "Summer":        ["dusty pink", "lavender", "sky blue", "mauve", "blush"],
  "Deep Winter":   ["burgundy", "navy blue", "emerald green", "black", "ruby red"],
  "Cool Winter":   ["royal blue", "icy pink", "deep plum", "bright white", "emerald"],
  "Bright Winter": ["electric blue", "bright fuchsia", "emerald", "jet black", "cherry red"],
  "Winter":        ["burgundy", "navy", "emerald", "royal blue", "black"],
};

// ── Undertone → foundation/lip color terms ────────────────────────────────────
const UNDERTONE_FOUNDATION: Record<string, { foundation: string; lipColor: string }> = {
  Warm:    { foundation: "warm undertone foundation",    lipColor: "terracotta lipstick" },
  Cool:    { foundation: "cool undertone foundation",    lipColor: "berry lip color" },
  Neutral: { foundation: "neutral undertone foundation", lipColor: "nude pink lipstick" },
};

// ── Skin type → serum/product terms ──────────────────────────────────────────
const SKIN_PRODUCTS: Record<string, string[]> = {
  Oily:        ["oil control serum", "niacinamide serum", "mattifying moisturizer"],
  Dry:         ["hyaluronic acid serum", "rich moisturizer cream", "hydrating face oil"],
  Combination: ["niacinamide serum", "lightweight moisturizer", "balancing toner"],
  Sensitive:   ["aloe vera gel", "centella asiatica serum", "fragrance free moisturizer"],
  Normal:      ["vitamin c serum", "hydrating toner", "spf moisturizer"],
};

// ── Face shape → glasses style terms ─────────────────────────────────────────
const FACE_GLASSES: Record<string, string[]> = {
  Oval:     ["round glasses frames", "wayfarer glasses", "cat eye glasses"],
  Round:    ["rectangular glasses frames", "square frames glasses", "angular glasses"],
  Square:   ["round glasses frames", "oval frames glasses", "rimless glasses"],
  Heart:    ["cat eye glasses frames", "round glasses", "light frame glasses"],
  Diamond:  ["cat eye glasses", "oval frames glasses", "rimless glasses frames"],
  Oblong:   ["square glasses frames", "wide frame glasses", "aviator glasses"],
  Triangle: ["rimmed glasses frames", "cat eye glasses", "semi rimless glasses"],
  "Soft Oval": ["round glasses", "cat eye glasses", "wayfarer frames"],
};

// ── Hairstyle → product terms ─────────────────────────────────────────────────
const HAIR_TYPE_PRODUCTS: Record<string, string[]> = {
  straight:  ["smoothing shampoo", "anti frizz serum", "heat protectant spray"],
  wavy:      ["curl enhancing cream", "sea salt spray", "diffuser friendly shampoo"],
  curly:     ["curl defining cream", "co wash conditioner", "curl refresher spray"],
  coily:     ["moisture rich conditioner", "shea butter hair mask", "twist out gel"],
};

// ── Main generator ────────────────────────────────────────────────────────────
export function generateShoppingSections(report: Partial<CompiledReport>): ShopSection[] {
  const sections: ShopSection[] = [];
  const season    = report.colorAnalysis?.season   ?? "";
  const undertone = report.colorAnalysis?.undertone ?? "Neutral";
  const skinType  = report.skinAnalysis?.type       ?? "Normal";
  const faceShape = report.faceShape?.shape         ?? "";
  const hairType  = (report.hairstyle?.hairType ?? "").toLowerCase();
  const glassesRec = report.glasses?.recommended?.[0]?.style ?? "";

  // ── 1. Wardrobe colours ───────────────────────────────────────────────────
  const seasonKey = Object.keys(SEASON_COLORS).find((k) =>
    season.includes(k) || k.includes(season)
  ) ?? "Autumn";
  const paletteColors = SEASON_COLORS[seasonKey] ?? SEASON_COLORS["Autumn"];

  sections.push({
    icon: "👗",
    title: "Wardrobe Picks",
    description: `Shop your ${season || "personal"} colour palette across clothing and ethnic wear.`,
    links: [
      ...paletteColors.slice(0, 2).map((c) => ({
        label: `${c.charAt(0).toUpperCase() + c.slice(1)} Tops`,
        url: myntra(`${c} top`),
        platform: "myntra" as Platform,
      })),
      {
        label: `${paletteColors[2] ?? "Olive"} Ethnic Wear`,
        url: myntra(`${paletteColors[2] ?? "olive"} kurta`),
        platform: "myntra" as Platform,
      },
      {
        label: `${paletteColors[0] ?? "Terracotta"} Dress`,
        url: amazon(`${paletteColors[0] ?? "terracotta"} dress women`),
        platform: "amazon" as Platform,
      },
    ],
  });

  // ── 2. Base & Foundation ──────────────────────────────────────────────────
  const { foundation, lipColor } = UNDERTONE_FOUNDATION[undertone] ?? UNDERTONE_FOUNDATION["Neutral"];

  sections.push({
    icon: "💄",
    title: "Base & Lip Colours",
    description: `${undertone}-undertone matched foundation and lip shades for your skin.`,
    links: [
      {
        label: `${undertone} Foundation`,
        url: nykaa(foundation),
        platform: "nykaa",
      },
      {
        label: `Matching Lip Colour`,
        url: nykaa(lipColor),
        platform: "nykaa",
      },
      {
        label: `CC Cream ${undertone}`,
        url: nykaa(`cc cream ${undertone.toLowerCase()} undertone`),
        platform: "nykaa",
      },
      {
        label: `Foundation ${skinType} skin`,
        url: amazon(`foundation ${skinType.toLowerCase()} skin ${undertone.toLowerCase()} undertone`),
        platform: "amazon",
      },
    ],
  });

  // ── 3. Skincare Essentials ────────────────────────────────────────────────
  const skinProducts = SKIN_PRODUCTS[skinType] ?? SKIN_PRODUCTS["Normal"];
  const skinConcerns = report.skinAnalysis?.concerns ?? [];
  const primaryConcern = skinConcerns[0] ? `${skinConcerns[0].toLowerCase()} serum` : skinProducts[0];

  sections.push({
    icon: "🌿",
    title: "Skincare Essentials",
    description: `Targeted products for ${skinType.toLowerCase()} skin${skinConcerns.length ? ` with ${skinConcerns[0].toLowerCase()} concern` : ""}.`,
    links: [
      {
        label: `${skinProducts[0].charAt(0).toUpperCase() + skinProducts[0].slice(1)}`,
        url: nykaa(skinProducts[0]),
        platform: "nykaa",
      },
      {
        label: `${skinProducts[1].charAt(0).toUpperCase() + skinProducts[1].slice(1)}`,
        url: nykaa(skinProducts[1]),
        platform: "nykaa",
      },
      {
        label: skinConcerns[0] ? `${skinConcerns[0]} Serum` : `${skinType} Moisturiser`,
        url: amazon(primaryConcern),
        platform: "amazon",
      },
    ],
  });

  // ── 4. Glasses Frames ────────────────────────────────────────────────────
  const glassesTerms = FACE_GLASSES[faceShape] ?? ["oval glasses frames", "round glasses", "cat eye glasses"];
  const glassesQuery = glassesRec
    ? `${glassesRec.toLowerCase()} glasses frames`
    : glassesTerms[0];

  sections.push({
    icon: "👓",
    title: "Glasses Frames",
    description: `Frame styles that complement your ${faceShape || "face"} shape.`,
    links: [
      {
        label: glassesTerms[0].charAt(0).toUpperCase() + glassesTerms[0].slice(1),
        url: lenskart(glassesQuery),
        platform: "lenskart",
      },
      {
        label: glassesTerms[1]?.charAt(0).toUpperCase() + (glassesTerms[1]?.slice(1) ?? ""),
        url: lenskart(glassesTerms[1] ?? "wayfarer glasses"),
        platform: "lenskart",
      },
      {
        label: "Sunglasses",
        url: amazon(`${glassesTerms[0]} sunglasses`),
        platform: "amazon",
      },
    ],
  });

  // ── 5. Hair Care ──────────────────────────────────────────────────────────
  const hairTypeKey = ["straight", "wavy", "curly", "coily"].find((k) => hairType.includes(k)) ?? "straight";
  const hairProducts = HAIR_TYPE_PRODUCTS[hairTypeKey];

  sections.push({
    icon: "💇",
    title: "Hair Care",
    description: `Products for ${hairType || "your"} hair type, curated from your hairstyle analysis.`,
    links: [
      {
        label: hairProducts[0].charAt(0).toUpperCase() + hairProducts[0].slice(1),
        url: nykaa(hairProducts[0]),
        platform: "nykaa",
      },
      {
        label: hairProducts[1].charAt(0).toUpperCase() + hairProducts[1].slice(1),
        url: nykaa(hairProducts[1]),
        platform: "nykaa",
      },
      {
        label: hairProducts[2].charAt(0).toUpperCase() + hairProducts[2].slice(1),
        url: amazon(`${hairProducts[2]} hair`),
        platform: "amazon",
      },
    ],
  });

  return sections;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  report: Partial<CompiledReport>;
}

export function ShoppingGuideCard({ report }: Props) {
  const sections = React.useMemo(() => generateShoppingSections(report), [report]);

  return (
    <div
      className="rounded-3xl p-6 sm:p-8 space-y-8"
      style={{
        background: "#FDFAF6",
        border: "1px solid #EDE6DD",
        boxShadow: "0 4px 24px rgba(61,43,31,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="h-5 w-5" style={{ color: "#C17A5F" }} />
            <span
              className="text-[10px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: "#C8A96E" }}
            >
              Shop Your Look
            </span>
          </div>
          <h2 className="font-serif text-2xl" style={{ color: "#3D2B1F" }}>
            Curated For You
          </h2>
          <p className="mt-1 text-sm" style={{ color: "#7A6A5A" }}>
            Hand-picked shopping searches based on your personal colour season, skin type, and face analysis.
          </p>
        </div>
        <div
          className="shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium"
          style={{ background: "rgba(201,149,107,0.12)", color: "#C17A5F", border: "1px solid rgba(201,149,107,0.25)" }}
        >
          <Sparkles className="h-3 w-3" />
          AI-curated
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((sec) => (
          <div key={sec.title} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{sec.icon}</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#3D2B1F" }}>{sec.title}</p>
                <p className="text-xs" style={{ color: "#9C7D5B" }}>{sec.description}</p>
              </div>
            </div>

            {/* Links grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {sec.links.map((link) => {
                const plat = PLATFORMS[link.platform];
                return (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-1.5 rounded-2xl px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      background: plat.bg,
                      border: `1px solid ${plat.color}25`,
                    }}
                  >
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: plat.color }}
                    >
                      {plat.label}
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium leading-tight" style={{ color: "#3D2B1F" }}>
                        {link.label}
                      </span>
                      <ExternalLink
                        className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                        style={{ color: plat.color }}
                      />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-[11px]" style={{ color: "#B0A090" }}>
        These are pre-filled search links. StyleAI is not affiliated with any retailer.
        Results depend on retailer inventory.
      </p>
    </div>
  );
}
