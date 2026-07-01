"use client";

import type { StyleGuideResult } from "@/types/report";

interface Props {
  data: StyleGuideResult;
}

export function StyleGuideCard({ data }: Props) {
  return (
    <section className="report-surface-panel rounded-3xl p-6 sm:p-8">
      <p className="foil-label mb-2 border-none p-0">Style Guide</p>
      <h2 className="font-display text-2xl text-ink mb-2">
        {data.primaryStyle}
      </h2>
      <p className="mb-6 text-sm text-ink-stone">
        {data.identitySummary}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Secondary influences</h3>
          <ul className="space-y-1 text-sm text-ink-stone">
            {data.secondaryStyles.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Your vibe</h3>
          <div className="flex flex-wrap gap-2">
            {data.vibeTraits.map((t) => (
              <span key={t} className="report-chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Wardrobe essentials</h3>
          <ul className="space-y-1 text-sm text-ink-stone">
            {data.wardrobeEssentials.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Flattering silhouettes</h3>
          <ul className="space-y-1 text-sm text-ink-stone">
            {data.silhouettes.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-ink">Color direction</h3>
        <p className="mb-2 text-xs text-ink-stone">Neutrals</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {data.colorDirection.neutrals.map((c) => (
            <span key={c} className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs">
              {c}
            </span>
          ))}
        </div>
        <p className="mb-2 text-xs text-ink-stone">Accents</p>
        <div className="flex flex-wrap gap-2">
          {data.colorDirection.accents.map((c) => (
            <span key={c} className="rounded-full border border-terracotta/25 bg-blush/50 px-3 py-1 text-xs text-ink-stone">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-ink">Style notes</h3>
        <ul className="space-y-1 text-sm text-ink-stone">
          {data.styleNotes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
