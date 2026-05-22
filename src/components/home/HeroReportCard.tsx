"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const STUDIO_ITEMS = [
  "Soft glam makeup preview",
  "Curtain bangs and layers",
  "Warm gold frame styling",
  "Date-night outfit palette",
  "Saved look ready to download",
];

export function HeroReportCard() {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      if (!hovering) setActive((i) => (i + 1) % STUDIO_ITEMS.length);
    }, 1400);
    return () => clearInterval(t);
  }, [hovering]);

  return (
    <div
      className="card-soft relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="absolute right-4 top-4 rounded-full bg-terracotta/15 px-3 py-1 text-xs font-semibold text-terracotta">
        Live AI Studio
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-stone">
        <Sparkles className="h-4 w-4 text-terracotta animate-pulse" />
        Renovaara studio preview
      </div>
      <h2 className="mt-3 text-2xl text-ink">Your lookboard updates live</h2>
      <p className="mt-2 text-sm text-ink-stone">
        Try ideas first, save what flatters you most, then open a full report when you want the reasoning behind every choice.
      </p>
      <div className="mt-5 space-y-2">
        {STUDIO_ITEMS.map((item, idx) => (
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
        Studio generation running…
      </p>
    </div>
  );
}
