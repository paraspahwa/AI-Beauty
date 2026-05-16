"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  GitCompare,
  Trophy,
  ShoppingBag,
  ChevronDown,
  AlertCircle,
  Minus,
} from "lucide-react";
import type { ProductComparisonResult, ProductComparisonSide } from "@/app/api/ingredients/compare/route";
import type { IngredientFlag } from "@/app/api/ingredients/analyze/route";
import { affiliateSearchLinks } from "@/lib/affiliates";
import { fadeUp, staggerContainer } from "@/lib/animations";

// ── Colour map for verdicts (reuse same palette as IngredientAnalyzer) ────────
const VERDICT_CFG: Record<
  IngredientFlag["verdict"],
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  beneficial: {
    label: "Beneficial",
    bg: "rgba(236,72,153,0.08)",
    text: "#BE185D",
    border: "rgba(236,72,153,0.25)",
    dot: "#EC4899",
  },
  neutral: {
    label: "Neutral",
    bg: "rgba(61,12,30,0.05)",
    text: "rgba(61,12,30,0.5)",
    border: "rgba(61,12,30,0.12)",
    dot: "rgba(61,12,30,0.3)",
  },
  caution: {
    label: "Caution",
    bg: "rgba(217,119,6,0.08)",
    text: "#B45309",
    border: "rgba(217,119,6,0.25)",
    dot: "#D97706",
  },
  avoid: {
    label: "Avoid",
    bg: "rgba(225,29,72,0.07)",
    text: "#BE123C",
    border: "rgba(225,29,72,0.25)",
    dot: "#E11D48",
  },
};

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score, isWinner }: { score: number; isWinner: boolean }) {
  const color =
    score >= 8 ? "#EC4899" : score >= 6 ? "#D97706" : score >= 4 ? "#F59E0B" : "#E11D48";
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl px-4 py-2.5"
      style={{
        background: isWinner
          ? "linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(139,92,246,0.12) 100%)"
          : "rgba(61,12,30,0.04)",
        border: isWinner ? "1.5px solid rgba(236,72,153,0.3)" : "1px solid rgba(61,12,30,0.08)",
      }}
    >
      <span className="text-2xl font-bold leading-none" style={{ color }}>
        {score}
      </span>
      <span className="text-[10px] text-ink-stone leading-none mt-0.5">/ 10</span>
    </div>
  );
}

// ── Collapsible flag row ──────────────────────────────────────────────────────
function FlagRow({ flag }: { flag: IngredientFlag }) {
  const [open, setOpen] = React.useState(false);
  const cfg = VERDICT_CFG[flag.verdict];
  return (
    <div
      className="rounded-xl px-3 py-2 cursor-pointer select-none"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0 h-2 w-2 rounded-full" style={{ background: cfg.dot }} />
        <span className="flex-1 text-xs font-medium text-ink truncate">{flag.name}</span>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ color: cfg.text }}
        >
          {cfg.label}
        </span>
        <ChevronDown
          className="h-3 w-3 shrink-0 transition-transform"
          style={{
            color: "rgba(61,12,30,0.35)",
            transform: open ? "rotate(180deg)" : undefined,
          }}
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            className="text-[11px] leading-relaxed mt-1.5 pl-4 overflow-hidden"
            style={{ color: cfg.text }}
          >
            {flag.reason}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Product column (one side of comparison) ───────────────────────────────────
function ProductColumn({
  label,
  name,
  side,
  isWinner,
  buyLinks,
}: {
  label: "A" | "B";
  name: string;
  side: ProductComparisonSide;
  isWinner: boolean;
  buyLinks: { amazon: string; nykaa: string };
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-4"
      style={{
        background: isWinner
          ? "linear-gradient(160deg, rgba(236,72,153,0.06) 0%, rgba(139,92,246,0.06) 100%)"
          : "rgba(61,12,30,0.02)",
        border: isWinner
          ? "1.5px solid rgba(236,72,153,0.2)"
          : "1px solid rgba(61,12,30,0.07)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: isWinner
              ? "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)"
              : "rgba(61,12,30,0.1)",
            color: isWinner ? "#fff" : "rgba(61,12,30,0.5)",
          }}
        >
          {label}
        </span>
        <p className="flex-1 text-sm font-semibold text-ink leading-snug line-clamp-2">{name}</p>
        {isWinner && (
          <Trophy className="h-4 w-4 shrink-0" style={{ color: "#EC4899" }} />
        )}
      </div>

      {/* Score */}
      <div className="flex items-center gap-3">
        <ScoreBadge score={side.score} isWinner={isWinner} />
        <div className="flex-1 space-y-1">
          {side.highlights.slice(0, 2).map((h, i) => (
            <p
              key={i}
              className="text-[11px] leading-snug"
              style={{ color: "#BE185D" }}
            >
              + {h}
            </p>
          ))}
          {side.concerns.slice(0, 2).map((c, i) => (
            <p
              key={i}
              className="text-[11px] leading-snug"
              style={{ color: "#B45309" }}
            >
              ⚠ {c}
            </p>
          ))}
        </div>
      </div>

      {/* Flags */}
      {side.flags.length > 0 && (
        <div className="space-y-1.5">
          {(["avoid", "caution", "beneficial", "neutral"] as const).map((v) => {
            const group = side.flags.filter((f) => f.verdict === v);
            return group.map((flag, i) => <FlagRow key={`${v}-${i}`} flag={flag} />);
          })}
        </div>
      )}

      {/* Affiliate buy buttons */}
      {name !== "Product A" && name !== "Product B" && (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-stone">
            Buy this product
          </p>
          <a
            href={buyLinks.amazon}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-opacity hover:opacity-80 active:scale-[0.97]"
            style={{ background: "#FF9900", color: "#000" }}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Amazon India
          </a>
          <a
            href={buyLinks.nykaa}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-opacity hover:opacity-80 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #FC2779 0%, #FF6B6B 100%)",
              color: "#fff",
            }}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Nykaa
          </a>
        </div>
      )}
    </div>
  );
}

// ── Editable product input panel ──────────────────────────────────────────────
function ProductInput({
  label,
  name,
  ingredients,
  onNameChange,
  onIngredientsChange,
}: {
  label: "A" | "B";
  name: string;
  ingredients: string;
  onNameChange: (v: string) => void;
  onIngredientsChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)" }}
        >
          {label}
        </span>
        <input
          type="text"
          maxLength={100}
          placeholder={`Product ${label} name (optional)`}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="flex-1 rounded-xl bg-white/70 border border-pink-100 px-3 py-1.5 text-sm text-ink placeholder:text-ink-stone/50 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-shadow"
          aria-label={`Product ${label} name`}
        />
      </div>
      <textarea
        className="w-full rounded-2xl bg-white/70 border border-pink-100 px-4 py-3 text-sm text-ink placeholder:text-ink-stone/50 focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none leading-relaxed transition-shadow"
        rows={4}
        maxLength={4200}
        placeholder={`Paste ${label === "A" ? "first" : "second"} product's ingredient list…`}
        value={ingredients}
        onChange={(e) => onIngredientsChange(e.target.value)}
        aria-label={`Product ${label} ingredients`}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  skinContext?: {
    type: string;
    concerns: string[];
  };
}

export function ProductComparisonCard({ skinContext }: Props) {
  const [nameA, setNameA] = React.useState("");
  const [ingA, setIngA] = React.useState("");
  const [nameB, setNameB] = React.useState("");
  const [ingB, setIngB] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ProductComparisonResult | null>(null);

  const canCompare =
    ingA.trim().length >= 10 &&
    ingB.trim().length >= 10 &&
    ingA.length <= 4000 &&
    ingB.length <= 4000;

  async function handleCompare() {
    if (!canCompare || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ingredients/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productA: { name: nameA.trim() || "Product A", ingredients: ingA.trim() },
          productB: { name: nameB.trim() || "Product B", ingredients: ingB.trim() },
          skinContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Comparison failed. Please try again.");
        return;
      }
      setResult(data as ProductComparisonResult);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const resolvedNameA = nameA.trim() || "Product A";
  const resolvedNameB = nameB.trim() || "Product B";
  const linksA = affiliateSearchLinks(resolvedNameA);
  const linksB = affiliateSearchLinks(resolvedNameB);

  return (
    <div className="aurora-card rounded-3xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(236,72,153,0.15) 100%)",
          }}
        >
          <GitCompare className="h-5 w-5" style={{ color: "#8B5CF6" }} />
        </div>
        <div>
          <h3 className="font-semibold text-ink text-base leading-snug">
            Product Comparison
          </h3>
          <p className="text-xs text-ink-stone mt-0.5 leading-relaxed">
            Paste ingredient lists of two products to see which suits you better.{" "}
            {skinContext
              ? `Personalised for your ${skinContext.type.toLowerCase()} skin.`
              : ""}
          </p>
        </div>
      </div>

      {/* Product inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProductInput
          label="A"
          name={nameA}
          ingredients={ingA}
          onNameChange={setNameA}
          onIngredientsChange={setIngA}
        />
        <div className="hidden sm:flex items-center justify-center">
          <Minus
            className="h-5 w-5"
            style={{ color: "rgba(61,12,30,0.2)", transform: "rotate(90deg) scaleX(2)" }}
          />
        </div>
        <ProductInput
          label="B"
          name={nameB}
          ingredients={ingB}
          onNameChange={setNameB}
          onIngredientsChange={setIngB}
        />
      </div>

      {/* Compare button */}
      <button
        onClick={handleCompare}
        disabled={!canCompare || loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-semibold text-sm text-white disabled:opacity-40 active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
          transition: "opacity 0.15s, transform 0.1s",
        }}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Comparing…
          </>
        ) : (
          <>
            <GitCompare className="h-4 w-4" />
            Compare Products
          </>
        )}
      </button>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2.5 rounded-2xl px-4 py-3"
            style={{
              background: "rgba(225,29,72,0.07)",
              border: "1px solid rgba(225,29,72,0.2)",
            }}
          >
            <AlertCircle
              className="h-4 w-4 shrink-0 mt-0.5"
              style={{ color: "#E11D48" }}
            />
            <p className="text-sm" style={{ color: "#BE123C" }}>
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            key="results"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-5 pt-1"
          >
            {/* Winner banner */}
            <motion.div variants={fadeUp}>
              <div
                className="rounded-2xl px-5 py-4"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(139,92,246,0.1) 100%)",
                  border: "1px solid rgba(236,72,153,0.2)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4" style={{ color: "#EC4899" }} />
                  <span className="text-sm font-bold text-ink">
                    {result.winner === "tie"
                      ? "It's a tie!"
                      : `${result.winner === "A" ? resolvedNameA : resolvedNameB} wins`}
                  </span>
                </div>
                <p className="text-xs text-ink leading-relaxed">{result.winnerReason}</p>
                {result.recommendation && (
                  <p className="text-xs text-ink-stone leading-relaxed mt-2 pt-2"
                    style={{ borderTop: "1px solid rgba(236,72,153,0.15)" }}>
                    {result.recommendation}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Side-by-side breakdown */}
            <motion.div
              variants={fadeUp}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <ProductColumn
                label="A"
                name={resolvedNameA}
                side={result.productA}
                isWinner={result.winner === "A"}
                buyLinks={linksA}
              />
              <ProductColumn
                label="B"
                name={resolvedNameB}
                side={result.productB}
                isWinner={result.winner === "B"}
                buyLinks={linksB}
              />
            </motion.div>

            {/* Disclaimer */}
            <motion.p
              variants={fadeUp}
              className="text-[10px] text-ink-stone/60 text-center pt-1"
            >
              Buy links are affiliate links — Renovaara may earn a small commission at no
              extra cost to you. Analysis is informational and does not replace professional
              dermatology advice.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
