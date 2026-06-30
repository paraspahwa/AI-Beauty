"use client";

import { useEffect, useState } from "react";

const PINGS = [
  "Priya M. just completed her analysis · Mumbai · 2 min ago",
  "Emma discovered her Soft Autumn palette · 5 min ago",
  "Sarah K. unlocked her spectacles guide · Delhi · 3 min ago",
  "Ananya tried 4 makeup looks virtually · 7 min ago",
  "Zara matched her seasonal undertone · London · just now",
  "Meera got her AM/PM skin routine · Bangalore · 4 min ago",
  "Rhea picked her perfect frame shape · 6 min ago",
  "Lina found her seasonal color palette · 1 min ago",
  "Aisha previewed 3 hairstyle cuts · Chennai · 8 min ago",
  "Sofia skipped 6 products that didn't suit her · 9 min ago",
];

export function ActivityTicker() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  if (!visible) return null;

  const duplicated = [...PINGS, ...PINGS];

  return (
    <div className="relative z-10 shrink-0 overflow-hidden border-b border-terracotta/15 bg-[var(--color-surface)]/70 py-2 text-xs text-ink-stone backdrop-blur-sm">
      <div
        className="animate-marquee-left flex w-max gap-14 whitespace-nowrap"
        style={{ "--marquee-duration": "42s" } as React.CSSProperties}
      >
        {duplicated.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
