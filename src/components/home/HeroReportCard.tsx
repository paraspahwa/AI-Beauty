"use client";

import { Sparkles } from "lucide-react";
import { BeforeAfterReveal } from "@/components/BeforeAfterReveal";
import { toBeforeAfterItems } from "@/lib/home-content";

const heroSample = toBeforeAfterItems()[0];

export function HeroReportCard() {
  if (!heroSample) {
    return null;
  }

  return (
    <div className="card-soft relative overflow-hidden">
      <div className="absolute right-4 top-4 z-10 rounded-full bg-terracotta/15 px-3 py-1 text-xs font-semibold text-terracotta">
        Sample report
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-stone">
        <Sparkles className="h-4 w-4 text-terracotta animate-pulse" />
        Renovaara report preview
      </div>
      <h2 className="mt-3 text-2xl text-ink">See what your report includes</h2>
      <p className="mt-2 text-sm text-ink-stone">
        Drag to compare sample results — then upload your selfie for a personalised analysis.
      </p>
      <div className="mt-5">
        <BeforeAfterReveal
          beforeUrl={heroSample.beforeSrc}
          afterUrl={heroSample.afterSrc}
          className="mx-auto w-full max-w-md"
        />
      </div>
      <p className="mt-4 text-center text-xs text-ink-mist">
        {heroSample.title} · sample result
      </p>
    </div>
  );
}
