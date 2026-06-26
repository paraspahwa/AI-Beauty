"use client";

import type { StyleGuideResult } from "@/types/report";

interface Props {
  data: StyleGuideResult;
}

export function StyleGuideCard({ data }: Props) {
  return (
    <section
      className="rounded-3xl p-6 sm:p-8"
      style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9C7D5B" }}>
        Style Guide
      </p>
      <h2 className="text-2xl font-normal mb-2" style={{ color: "#2C1A10", fontFamily: "Georgia, serif" }}>
        {data.primaryStyle}
      </h2>
      <p className="text-sm mb-6" style={{ color: "#6B5344" }}>
        {data.identitySummary}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-ink">Secondary influences</h3>
          <ul className="text-sm text-ink-stone space-y-1">
            {data.secondaryStyles.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2 text-ink">Your vibe</h3>
          <div className="flex flex-wrap gap-2">
            {data.vibeTraits.map((t) => (
              <span
                key={t}
                className="rounded-full px-3 py-1 text-xs"
                style={{ background: "rgba(17,24,39,0.06)", color: "#3D2B1F" }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-ink">Wardrobe essentials</h3>
          <ul className="text-sm text-ink-stone space-y-1">
            {data.wardrobeEssentials.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2 text-ink">Flattering silhouettes</h3>
          <ul className="text-sm text-ink-stone space-y-1">
            {data.silhouettes.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2 text-ink">Color direction</h3>
        <p className="text-xs text-ink-stone mb-2">Neutrals</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {data.colorDirection.neutrals.map((c) => (
            <span key={c} className="rounded-full px-3 py-1 text-xs bg-white border border-[#E8DDD0]">
              {c}
            </span>
          ))}
        </div>
        <p className="text-xs text-ink-stone mb-2">Accents</p>
        <div className="flex flex-wrap gap-2">
          {data.colorDirection.accents.map((c) => (
            <span key={c} className="rounded-full px-3 py-1 text-xs bg-white border border-[#E8DDD0]">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2 text-ink">Style notes</h3>
        <ul className="text-sm text-ink-stone space-y-1">
          {data.styleNotes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
