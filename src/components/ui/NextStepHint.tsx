"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type { JourneyHint } from "@/lib/report/journey-hints";
import { fadeUp } from "@/lib/animations";

interface Props {
  hint: JourneyHint;
  onAction?: () => void;
  className?: string;
}

const toneStyles: Record<JourneyHint["tone"], string> = {
  info: "border-terracotta/15 bg-[var(--report-icon-bg)]/50",
  action: "border-terracotta/35 bg-gradient-to-br from-terracotta/8 via-transparent to-rose-gold/5",
  success: "border-emerald-600/25 bg-emerald-50/80 dark:bg-emerald-950/20",
  waiting: "border-dashed border-terracotta/25 bg-[var(--infographic-frame)]/60",
};

export function NextStepHint({ hint, onAction, className = "" }: Props) {
  const Icon =
    hint.tone === "success"
      ? CheckCircle2
      : hint.tone === "waiting"
        ? Loader2
        : Sparkles;

  function handleScroll() {
    if (!hint.scrollToId) return;
    document.getElementById(hint.scrollToId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCta() {
    if (hint.action === "paywall") {
      onAction?.();
      return;
    }
    if (hint.scrollToId) {
      handleScroll();
      return;
    }
  }

  const cta =
    hint.ctaLabel &&
    (hint.href ? (
      <Link
        href={hint.href}
        className="inline-flex items-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-[var(--btn-fg)] transition hover:bg-espresso/90"
      >
        {hint.ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    ) : (
      <button
        type="button"
        onClick={handleCta}
        className="inline-flex items-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-[var(--btn-fg)] transition hover:bg-espresso/90"
      >
        {hint.ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    ));

  return (
    <motion.aside
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={`rounded-2xl border px-5 py-4 sm:px-6 sm:py-5 ${toneStyles[hint.tone]} ${className}`}
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-terracotta/20 bg-[var(--report-photo-bg)]">
            <Icon
              className={`h-5 w-5 text-terracotta ${hint.tone === "waiting" ? "animate-spin" : ""}`}
            />
          </div>
          <div className="min-w-0">
            {hint.step && (
              <p className="foil-label mb-1.5 border-none p-0 text-[10px] tracking-[0.2em]">
                {hint.step}
              </p>
            )}
            <p className="font-display text-lg leading-snug text-ink sm:text-xl">{hint.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-stone">{hint.body}</p>
          </div>
        </div>
        {cta && <div className="shrink-0 sm:pt-1">{cta}</div>}
      </div>
    </motion.aside>
  );
}
