"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const REPORT_ITEMS = [
  "Top lipstick families",
  "Best frame geometry",
  "Hair length recommendations",
  "AM and PM skin routine",
];

export function HeroReportCard() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % REPORT_ITEMS.length), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card-soft relative">
      <div className="absolute right-4 top-4 rounded-full bg-terracotta/15 px-3 py-1 text-xs font-semibold text-terracotta">
        Sample Report
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-stone">
        <Sparkles className="h-4 w-4 text-terracotta animate-pulse" />
        Renovaara preview
      </div>
      <h2 className="mt-3 text-2xl text-ink">Soft Autumn profile</h2>
      <p className="mt-2 text-sm text-ink-stone">
        Warm undertone, balanced oval face shape, medium contrast features.
      </p>
      <div className="mt-5 space-y-2">
        {REPORT_ITEMS.map((item, idx) => (
          <div
            key={item}
            className={`flex items-center justify-between rounded-xl border px-4 py-2.5 transition-all duration-500 ${
              active === idx
                ? "border-terracotta/60 bg-terracotta/10 scale-[1.02] shadow-sm"
                : "border-terracotta/20 bg-white/70"
            }`}
          >
            <span className="text-sm text-ink-stone">{item}</span>
            <CheckCircle2
              className={`h-4 w-4 transition-colors duration-500 ${
                active === idx ? "text-terracotta" : "text-terracotta/40"
              }`}
            />
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-ink-mist animate-pulse">
        AI analysis running…
      </p>
    </div>
  );
}
