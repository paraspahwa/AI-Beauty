"use client";

import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import type { JourneyHint } from "@/lib/report/journey-hints";

interface Props {
  hint: JourneyHint;
  className?: string;
}

export function NavJourneyPill({ hint, className = "" }: Props) {
  if (!hint.href || !hint.ctaLabel) return null;

  const Icon = hint.tone === "waiting" ? Loader2 : Sparkles;
  const label = hint.title || hint.ctaLabel;

  return (
    <Link
      href={hint.href}
      className={`group inline-flex max-w-[15rem] items-center gap-2 rounded-full border border-terracotta/25 bg-[var(--report-icon-bg)]/60 px-3 py-1.5 text-xs transition hover:border-terracotta/40 hover:bg-[var(--report-icon-bg)] ${className}`}
      title={label}
    >
      <Icon
        className={`h-3.5 w-3.5 shrink-0 text-terracotta ${hint.tone === "waiting" ? "animate-spin" : ""}`}
      />
      <span className="min-w-0 truncate text-ink-stone">
        <span className="text-ink-mist">Next:</span>{" "}
        <span className="font-medium text-ink">{label}</span>
      </span>
      <ArrowRight className="h-3 w-3 shrink-0 text-terracotta opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}
