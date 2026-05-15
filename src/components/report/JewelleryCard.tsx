"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ExternalLink, Gem, ShoppingBag, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { FaceShapeResult, ColorAnalysisResult } from "@/types/report";
import type { JewelleryRecommendation, JewelleryProduct, JewelleryCategory, PriceRange } from "@/types/jewellery";
import { getJewelleryRecommendations, buildProductReason } from "@/lib/jewellery-rules";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { track } from "@/lib/track";

// ── Category display config ───────────────────────────────────────────────────

const CATEGORY_META: Record<JewelleryCategory, { label: string; emoji: string }> = {
  earrings: { label: "Earrings",  emoji: "✦" },
  necklace: { label: "Necklace",  emoji: "◎" },
  rings:    { label: "Rings",     emoji: "◇" },
  bangles:  { label: "Bangles",   emoji: "⌾" },
};

// ── Price filter config ───────────────────────────────────────────────────────

const PRICE_FILTERS: { value: PriceRange | "all"; label: string }[] = [
  { value: "all",     label: "All" },
  { value: "budget",  label: "Under ₹299" },
  { value: "mid",     label: "₹299–999" },
  { value: "premium", label: "₹999+" },
];

function filterByPrice(products: JewelleryProduct[], range: PriceRange | "all"): JewelleryProduct[] {
  if (range === "all")     return products;
  if (range === "budget")  return products.filter((p) => p.priceINR < 299);
  if (range === "mid")     return products.filter((p) => p.priceINR >= 299 && p.priceINR <= 999);
  return products.filter((p) => p.priceINR > 999);
}

// ── Metal badge strip ─────────────────────────────────────────────────────────

function MetalBadgeStrip({ badges }: { badges: { metal: string; hex: string }[] }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-5">
      <span className="text-xs text-pink-700/60 self-center mr-1">Your metals:</span>
      {badges.map((b) => (
        <span
          key={b.metal}
          className="flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3 py-1 text-xs font-medium text-pink-800"
        >
          <span
            className="inline-block h-3 w-3 rounded-full border border-white shadow-sm"
            style={{ background: b.hex }}
          />
          {b.metal}
        </span>
      ))}
    </div>
  );
}

// ── Single product card ───────────────────────────────────────────────────────

function JewelleryProductCard({
  product,
  reason,
  colorAnalysis,
  category,
}: {
  product: JewelleryProduct;
  reason: string;
  colorAnalysis: ColorAnalysisResult;
  category: JewelleryCategory;
}) {
  const platform = product.url.includes("amazon") ? "Amazon" : "Myntra";

  return (
    <motion.a
      variants={fadeUp}
      href={product.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => track("jewellery_shop_click", { category, platform, product: product.name })}
      className="group flex flex-col gap-2.5 rounded-xl border border-pink-100 bg-white/80 p-4 hover:shadow-md hover:border-pink-300 transition-all cursor-pointer"
    >
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {product.badge && (
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 border border-pink-200 px-2 py-0.5 text-[10px] font-semibold text-pink-700">
            <Gem className="h-2.5 w-2.5" />
            {product.badge}
          </span>
        )}
        {product.hypoallergenic && (
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Hypoallergenic
          </span>
        )}
        <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-medium text-orange-600">
          {platform}
        </span>
      </div>

      {/* Name & brand */}
      <div>
        <p className="text-sm font-semibold text-pink-900 line-clamp-2 leading-snug">{product.name}</p>
        <p className="text-xs text-pink-700/60 mt-0.5">{product.brand}</p>
      </div>

      {/* Personalized reason */}
      <p className="text-xs italic text-pink-800/55 line-clamp-2">{reason}</p>

      {/* Price + CTA */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-sm font-bold text-pink-900">
          ₹{product.priceINR.toLocaleString("en-IN")}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 group-hover:text-pink-800 group-hover:underline transition-colors">
          Shop Now <ExternalLink className="h-3 w-3" />
        </span>
      </div>
    </motion.a>
  );
}

// ── Category section ──────────────────────────────────────────────────────────

function JewellerySection({
  rec,
  colorAnalysis,
  priceFilter,
}: {
  rec: JewelleryRecommendation;
  colorAnalysis: ColorAnalysisResult;
  priceFilter: PriceRange | "all";
}) {
  const meta = CATEGORY_META[rec.category];
  const filtered = React.useMemo(
    () => filterByPrice(rec.recommended, priceFilter),
    [rec.recommended, priceFilter]
  );

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <span className="text-pink-400 font-light text-lg leading-none">{meta.emoji}</span>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-pink-800">{meta.label}</h3>
      </div>

      {/* Reasons */}
      <div className="rounded-xl bg-pink-50/60 border border-pink-100 px-4 py-3 space-y-1">
        <p className="text-xs text-pink-800/80 leading-relaxed">{rec.faceReason}</p>
        <p className="text-xs text-pink-700/60 leading-relaxed">{rec.colorReason}</p>
      </div>

      {/* Avoid list */}
      {rec.avoid.length > 0 && (
        <div className="flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">
            <span className="font-semibold">Avoid: </span>
            {rec.avoid.map((a) => a.replace(/_/g, " ")).join(", ")}
          </p>
        </div>
      )}

      {/* Product grid */}
      {filtered.length > 0 ? (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {filtered.map((product) => (
            <JewelleryProductCard
              key={product.url}
              product={product}
              reason={buildProductReason(product, colorAnalysis)}
              colorAnalysis={colorAnalysis}
              category={rec.category}
            />
          ))}
        </motion.div>
      ) : (
        <p className="text-xs text-pink-700/50 text-center py-4">
          No items in this price range — try a different filter.
        </p>
      )}
    </div>
  );
}

// ── Free tier teaser ──────────────────────────────────────────────────────────

function JewelleryPaywallTeaser({ earrings, colorAnalysis }: {
  earrings: JewelleryRecommendation;
  colorAnalysis: ColorAnalysisResult;
}) {
  const product = earrings.recommended[0];
  if (!product) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs text-pink-700/60 italic">{earrings.faceReason}</p>
        <JewelleryProductCard
          product={product}
          reason={buildProductReason(product, colorAnalysis)}
          colorAnalysis={colorAnalysis}
          category="earrings"
        />
      </div>

      {/* Paywall blur */}
      <div className="relative">
        <div className="grid grid-cols-2 gap-3 opacity-30 blur-sm pointer-events-none select-none" aria-hidden>
          {earrings.recommended.slice(1, 3).map((p) => (
            <div key={p.url} className="h-28 rounded-xl bg-pink-100 border border-pink-200" />
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-white/90 border border-pink-200 p-3 shadow-sm">
            <ShoppingBag className="h-5 w-5 text-pink-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-pink-900">Unlock full jewellery guide</p>
            <p className="text-xs text-pink-700/65 mt-0.5">Earrings, necklace, rings & bangles — curated for your face shape and color season</p>
          </div>
          <Link
            href="/upload"
            className="rounded-full bg-pink-600 px-5 py-2 text-xs font-semibold text-white hover:bg-pink-700 transition-colors"
            onClick={() => track("jewellery_paywall_cta")}
          >
            Get Full Report — ₹299
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  faceShape: FaceShapeResult;
  colorAnalysis: ColorAnalysisResult;
  isPaid: boolean;
}

export function JewelleryCard({ faceShape, colorAnalysis, isPaid }: Props) {
  const [priceFilter, setPriceFilter] = React.useState<PriceRange | "all">("all");

  const guide = React.useMemo(
    () => getJewelleryRecommendations(faceShape, colorAnalysis),
    [faceShape, colorAnalysis]
  );

  const PAID_CATEGORIES: JewelleryCategory[] = ["earrings", "necklace", "rings", "bangles"];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(236,72,153,0.10)", border: "1px solid rgba(236,72,153,0.20)" }}
        >
          <Gem className="h-5 w-5 text-pink-500" />
        </div>
        <div>
          <h2 className="font-semibold text-pink-900">AI Jewellery Guide</h2>
          <p className="text-xs text-pink-700/60 mt-0.5 leading-relaxed">
            Curated for your {faceShape.shape} face shape and {colorAnalysis.season} color season.
            Links earn us a small affiliate commission at no extra cost to you.
          </p>
        </div>
      </motion.div>

      {/* Metal badge strip */}
      <motion.div variants={fadeUp}>
        <MetalBadgeStrip badges={guide.metalBadges} />
      </motion.div>

      {!isPaid ? (
        /* Free tier — earring teaser only */
        <motion.div variants={fadeUp}>
          <JewelleryPaywallTeaser earrings={guide.earrings} colorAnalysis={colorAnalysis} />
        </motion.div>
      ) : (
        <>
          {/* Price filter pills */}
          <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
            {PRICE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setPriceFilter(f.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                  priceFilter === f.value
                    ? "bg-pink-600 text-white border-pink-600"
                    : "bg-white text-pink-700 border-pink-200 hover:border-pink-400"
                }`}
              >
                {f.label}
              </button>
            ))}
          </motion.div>

          {/* Category sections */}
          <div className="space-y-8 divide-y divide-pink-100">
            {PAID_CATEGORIES.map((cat, i) => (
              <motion.div key={cat} variants={fadeUp} className={i > 0 ? "pt-7" : ""}>
                <JewellerySection
                  rec={guide[cat]}
                  colorAnalysis={colorAnalysis}
                  priceFilter={priceFilter}
                />
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
