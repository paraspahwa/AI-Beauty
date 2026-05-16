"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, ChevronDown, AlertCircle } from "lucide-react";
import type { IngredientAnalysisResult, IngredientFlag } from "@/app/api/ingredients/analyze/route";
import { fadeUp, staggerContainer } from "@/lib/animations";

// ── Colour map for verdicts ──────────────────────────────────────────────────
const VERDICT_CONFIG: Record<
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

// ── Score ring component ─────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const pct = score / 10;
  const r = 34;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  const color =
    score >= 8 ? "#EC4899" : score >= 6 ? "#D97706" : score >= 4 ? "#F59E0B" : "#E11D48";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
      <svg width={88} height={88} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={44} cy={44} r={r} fill="none" stroke="rgba(61,12,30,0.08)" strokeWidth={6} />
        <motion.circle
          cx={44}
          cy={44}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold text-ink leading-none">{score}</span>
        <span className="text-[10px] text-ink-stone leading-none mt-0.5">/ 10</span>
      </div>
    </div>
  );
}

// ── Ingredient flag row ───────────────────────────────────────────────────────
function FlagRow({ flag }: { flag: IngredientFlag }) {
  const [open, setOpen] = React.useState(false);
  const cfg = VERDICT_CONFIG[flag.verdict];

  return (
    <div
      className="rounded-xl px-3 py-2.5 cursor-pointer select-none"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="shrink-0 h-2 w-2 rounded-full"
          style={{ background: cfg.dot }}
        />
        <span className="flex-1 text-sm font-medium text-ink truncate">{flag.name}</span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ color: cfg.text, background: `${cfg.bg}` }}
        >
          {cfg.label}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 transition-transform"
          style={{ color: "rgba(61,12,30,0.35)", transform: open ? "rotate(180deg)" : undefined }}
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="text-xs leading-relaxed mt-2 pl-[18px] overflow-hidden"
            style={{ color: cfg.text }}
          >
            {flag.reason}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  /** Optional skin profile from the user's report — enriches the AI analysis */
  skinContext?: {
    type: string;
    concerns: string[];
  };
}

export function IngredientAnalyzer({ skinContext }: Props) {
  const [ingredients, setIngredients] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<IngredientAnalysisResult | null>(null);

  const charCount = ingredients.length;
  const MAX_CHARS = 4000;
  const tooLong = charCount > MAX_CHARS;

  async function handleAnalyze() {
    if (!ingredients.trim() || loading || tooLong) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ingredients/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: ingredients.trim(), skinContext }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Analysis failed. Please try again.");
        return;
      }

      setResult(data as IngredientAnalysisResult);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Group flags by verdict for display
  const groups = result
    ? ({
        beneficial: result.flags.filter((f) => f.verdict === "beneficial"),
        caution: result.flags.filter((f) => f.verdict === "caution"),
        avoid: result.flags.filter((f) => f.verdict === "avoid"),
        neutral: result.flags.filter((f) => f.verdict === "neutral"),
      } as const)
    : null;

  return (
    <div className="aurora-card rounded-3xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(139,92,246,0.15) 100%)" }}
        >
          <Sparkles className="h-5 w-5" style={{ color: "#EC4899" }} />
        </div>
        <div>
          <h3 className="font-semibold text-ink text-base leading-snug">
            AI Ingredient Analyser
          </h3>
          <p className="text-xs text-ink-stone mt-0.5 leading-relaxed">
            Paste any skincare ingredient list.{" "}
            {skinContext
              ? `Analysis is personalised for your ${skinContext.type.toLowerCase()} skin.`
              : "Add a skin profile for personalised results."}
          </p>
        </div>
      </div>

      {/* Textarea */}
      <div className="space-y-1.5">
        <textarea
          className="w-full rounded-2xl bg-white/70 border border-pink-100 px-4 py-3 text-sm text-ink placeholder:text-ink-stone/50 focus:outline-none focus:ring-2 focus:ring-pink-200 resize-none leading-relaxed transition-shadow"
          rows={5}
          maxLength={MAX_CHARS + 200}
          placeholder={`Paste ingredient list here…\ne.g. Aqua, Glycerin, Niacinamide, Hyaluronic Acid, Dimethicone, Fragrance…`}
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          aria-label="Ingredient list input"
        />
        <div className="flex items-center justify-between px-1">
          {tooLong ? (
            <span className="text-[11px] text-rose-600 font-medium">
              Too long — trim to {MAX_CHARS.toLocaleString()} characters
            </span>
          ) : (
            <span className="text-[11px] text-ink-stone">
              {charCount > 0 ? `${charCount.toLocaleString()} / ${MAX_CHARS.toLocaleString()} chars` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!ingredients.trim() || loading || tooLong}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-2xl font-semibold text-sm text-white transition-opacity disabled:opacity-40 active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)",
          transition: "opacity 0.15s, transform 0.1s",
        }}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analysing…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analyse Ingredients
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
            style={{ background: "rgba(225,29,72,0.07)", border: "1px solid rgba(225,29,72,0.2)" }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#E11D48" }} />
            <p className="text-sm" style={{ color: "#BE123C" }}>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && groups && (
          <motion.div
            key="results"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-5 pt-1"
          >
            {/* Score + summary */}
            <motion.div variants={fadeUp} className="flex items-start gap-5">
              <ScoreRing score={result.overallScore} />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-ink leading-relaxed">{result.summary}</p>
                {result.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(236,72,153,0.1)", color: "#BE185D" }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}
                {result.concerns.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.concerns.map((c, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(217,119,6,0.08)", color: "#B45309" }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Ingredient flags — ordered: avoid, caution, beneficial, neutral */}
            {(["avoid", "caution", "beneficial", "neutral"] as const).map((verdict) => {
              const flags = groups[verdict];
              if (!flags.length) return null;
              return (
                <motion.div key={verdict} variants={fadeUp} className="space-y-2">
                  <p
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: VERDICT_CONFIG[verdict].text }}
                  >
                    {VERDICT_CONFIG[verdict].label}
                  </p>
                  <div className="space-y-2">
                    {flags.map((flag, i) => (
                      <FlagRow key={i} flag={flag} />
                    ))}
                  </div>
                </motion.div>
              );
            })}

            <motion.p variants={fadeUp} className="text-[10px] text-ink-stone/60 text-center pt-1">
              Analysis is informational and does not replace professional dermatology advice.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
