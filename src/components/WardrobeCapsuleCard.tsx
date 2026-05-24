"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, RefreshCw, Sparkles, Shirt, ShoppingBag } from "lucide-react";
import type { ColorAnalysisResult, SkinAnalysisResult } from "@/types/report";
import type { GeneratedCapsule, CapsuleItem } from "@/app/api/capsule/generate/route";

// ── Types ─────────────────────────────────────────────────────────────────────
interface StylePrefsData {
  color_season: string | null;
  undertone: string | null;
  skin_type: string | null;
  prefs: Record<string, unknown> | null;
}
interface LatestData {
  color_analysis: ColorAnalysisResult | null;
  skin_analysis: SkinAnalysisResult | null;
}
interface Props {
  prefs: StylePrefsData | null;
  latest: LatestData | null;
  /** Pre-loaded cached capsule from SSR (avoids a client fetch on first paint) */
  initialCapsule?: GeneratedCapsule | null;
}

// ── Affiliate link helpers ─────────────────────────────────────────────────────
// Amazon: set NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG in Vercel env vars (e.g. "yoursite-21")
// Myntra: set NEXT_PUBLIC_MYNTRA_AFFILIATE_SID (via Admitad/VCommission tracking SID)
function myntraUrl(q: string): string {
  const sid = process.env.NEXT_PUBLIC_MYNTRA_AFFILIATE_SID ?? "";
  const base = `https://www.myntra.com/${encodeURIComponent(q)}`;
  return sid ? `${base}?utm_source=affiliate&sid=${encodeURIComponent(sid)}` : base;
}
function amazonUrl(q: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG ?? "";
  const base = `https://www.amazon.in/s?k=${encodeURIComponent(q)}`;
  return tag ? `${base}&tag=${encodeURIComponent(tag)}` : base;
}

// ── Category badge styles ──────────────────────────────────────────────────────
const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  Base:     { bg: "rgba(17,24,39,0.18)",   color: "rgba(17,24,39,0.72)" },
  Colour:   { bg: "rgba(17,24,39,0.15)",   color: "#111827" },
  Neutral:  { bg: "rgba(17,24,39,0.15)",   color: "#A69CC4" },
  Pattern:  { bg: "rgba(99,162,130,0.15)",    color: "#63A282" },
  Evening:  { bg: "rgba(17,24,39,0.15)",   color: "#fffafc" },
  Occasion: { bg: "rgba(220,160,200,0.15)",   color: "#D8A0C8" },
};

// ── Skeleton loader ────────────────────────────────────────────────────────────
function CapsuleSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-2xl p-4" style={{ background: "rgba(17,24,39,0.08)", border: "1px solid rgba(17,24,39,0.14)" }}>
          <div className="h-10 w-10 rounded-xl shrink-0" style={{ background: "rgba(17,24,39,0.18)" }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded-full w-1/3" style={{ background: "rgba(17,24,39,0.18)" }} />
            <div className="h-2.5 rounded-full w-3/4" style={{ background: "rgba(17,24,39,0.12)" }} />
            <div className="h-2.5 rounded-full w-1/2" style={{ background: "rgba(17,24,39,0.12)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Single item card ───────────────────────────────────────────────────────────
function ItemCard({ item, index }: { item: CapsuleItem; index: number }) {
  const catStyle = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES["Base"];
  const mUrl = item.myntraQuery ? myntraUrl(item.myntraQuery) : null;
  const aUrl = item.amazonQuery ? amazonUrl(item.amazonQuery) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.03 * index, duration: 0.3 }}
      className="flex items-start gap-4 rounded-2xl p-4"
      style={{ background: "rgba(17,24,39,0.08)", border: "1px solid rgba(17,24,39,0.14)" }}
    >
      {/* Colour swatch + number */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div
          className="h-11 w-11 rounded-xl shadow-lg"
          style={{ background: item.hex, border: "2px solid rgba(255,255,255,0.12)" }}
          title={item.hex}
        />
        <span className="text-[10px] font-bold tabular-nums" style={{ color: "rgba(17,24,39,0.35)" }}>
          {String(item.number).padStart(2, "0")}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className="text-sm font-semibold" style={{ color: "#111827" }}>{item.name}</p>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={catStyle}>
            {item.category}
          </span>
        </div>

        <p className="text-xs leading-relaxed mb-1" style={{ color: "rgba(17,24,39,0.62)" }}>
          {item.why}
        </p>

        {/* Fabric note */}
        {item.fabric && (
          <p className="flex items-center gap-1 text-[10px] mb-2" style={{ color: "rgba(200,169,110,0.65)" }}>
            <Shirt className="h-3 w-3 shrink-0" />
            {item.fabric}
          </p>
        )}

        {/* Shop links */}
        <div className="flex items-center gap-4 flex-wrap">
          {mUrl && (
            <a
              href={mUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: "#FF3A3A" }}
            >
              Myntra <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
          {aUrl && (
            <a
              href={aUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-semibold transition-opacity hover:opacity-70"
              style={{ color: "#F39C12" }}
            >
              Amazon <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function WardrobeCapsuleCard({ prefs, latest, initialCapsule }: Props) {
  const [capsule, setCapsule] = React.useState<GeneratedCapsule | null>(initialCapsule ?? null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<string>("All");

  const season    = capsule?.season    ?? prefs?.color_season ?? latest?.color_analysis?.season    ?? "—";
  const undertone = capsule?.undertone ?? prefs?.undertone    ?? latest?.color_analysis?.undertone ?? "—";
  const skinType  = prefs?.skin_type   ?? latest?.skin_analysis?.type ?? null;
  const metals    = latest?.color_analysis?.metals ?? [];
  const paletteSwatches = latest?.color_analysis?.palette?.slice(0, 6) ?? [];

  // On mount: silently fetch cached capsule if not pre-loaded
  React.useEffect(() => {
    if (capsule) return;
    fetch("/api/capsule/generate")
      .then((r) => r.json())
      .then((d: { capsule?: GeneratedCapsule }) => { if (d.capsule) setCapsule(d.capsule); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(force = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/capsule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json() as { capsule?: GeneratedCapsule; error?: string };
      if (!res.ok || !data.capsule) {
        setError(data.error ?? "Generation failed. Please try again.");
      } else {
        setCapsule(data.capsule);
        setActiveFilter("All");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const items = capsule?.items ?? [];
  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = activeFilter === "All" ? items : items.filter((i) => i.category === activeFilter);
  const hasData = !!prefs?.color_season || !!latest?.color_analysis;

  return (
    <div className="space-y-6">

      {/* ── Profile header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(17,24,39,0.15) 0%, rgba(17,24,39,0.08) 100%)",
          border: "1px solid rgba(17,24,39,0.22)",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.35em] font-semibold mb-1" style={{ color: "#C8A96E" }}>
          Your Bespoke Capsule
        </p>
        <h2 className="font-sans text-2xl mb-1" style={{ color: "#111827" }}>
          {season} · {undertone} Undertone
        </h2>
        <p className="text-sm mb-4" style={{ color: "rgba(17,24,39,0.55)" }}>
          AI-curated for your exact colour season
          {skinType ? `, ${skinType.toLowerCase()} skin` : ""}
          {metals.length > 0 ? `, ${metals.slice(0, 2).join(" & ")} metals` : ""}.
          Every piece works with every other piece.
        </p>

        {/* Hero image — paid users only */}
        {capsule?.heroImageUrl && (
          <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(17,24,39,0.2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capsule.heroImageUrl}
              alt="Your curated capsule wardrobe"
              className="w-full object-cover"
              style={{ maxHeight: "220px" }}
            />
          </div>
        )}

        {/* Live palette swatches */}
        {paletteSwatches.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(17,24,39,0.55)" }}>
              Your palette
            </span>
            {paletteSwatches.map((c) => (
              <span
                key={c.hex}
                className="h-6 w-6 rounded-full inline-block"
                style={{ background: c.hex, border: "1.5px solid rgba(255,255,255,0.15)", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
                title={c.name}
              />
            ))}
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex gap-3 flex-wrap">
          {!capsule ? (
            <button
              onClick={() => generate(false)}
              disabled={loading || !hasData}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "#111827", color: "#3D2B1F" }}
            >
              {loading
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                : <><Sparkles className="h-3.5 w-3.5" /> Generate My Capsule</>
              }
            </button>
          ) : (
            <button
              onClick={() => generate(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: "rgba(17,24,39,0.16)", color: "rgba(17,24,39,0.68)", border: "1px solid rgba(17,24,39,0.20)" }}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Regenerating..." : "Regenerate"}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-xs rounded-xl px-3 py-2" style={{ background: "rgba(192,107,62,0.12)", color: "#E8956B", border: "1px solid rgba(192,107,62,0.2)" }}>
            {error}
          </p>
        )}

        {capsule && (
          <p className="mt-2 text-[10px]" style={{ color: "rgba(17,24,39,0.45)" }}>
            Generated {new Date(capsule.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            {" · "}cached for 30 days
          </p>
        )}
      </motion.div>

      {/* ── No report yet ──────────────────────────────────────────────────── */}
      {!hasData && !capsule && !loading && (
        <div
          className="flex flex-col items-center justify-center gap-3 py-16 rounded-3xl text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(17,24,39,0.18)" }}
        >
          <ShoppingBag className="h-10 w-10 opacity-20" style={{ color: "#111827" }} />
          <p className="text-sm" style={{ color: "rgba(17,24,39,0.5)" }}>
            Complete a beauty analysis first to unlock your personalized capsule.
          </p>
        </div>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────────────── */}
      {loading && <CapsuleSkeleton />}

      {/* ── Generated capsule ──────────────────────────────────────────────── */}
      {!loading && capsule && items.length > 0 && (
        <>
          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = activeFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className="rounded-full px-4 py-1.5 text-xs font-medium transition-all"
                  style={
                    active
                      ? { background: "#111827", color: "#3D2B1F" }
                      : { background: "rgba(17,24,39,0.12)", color: "rgba(17,24,39,0.62)", border: "1px solid rgba(17,24,39,0.18)" }
                  }
                >
                  {cat}
                  {cat !== "All" && (
                    <span className="ml-1 opacity-50">({items.filter((i) => i.category === cat).length})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Item list */}
          <AnimatePresence mode="wait">
            <div key={activeFilter} className="space-y-3">
              {filtered.map((item, idx) => (
                <ItemCard key={item.number} item={item} index={idx} />
              ))}
            </div>
          </AnimatePresence>

          {/* Affiliate disclosure */}
          <p className="text-center text-[10px]" style={{ color: "rgba(17,24,39,0.40)" }}>
            Shopping links may include affiliate tracking · Renovaara earns a small commission at no extra cost to you
          </p>
        </>
      )}
    </div>
  );
}
