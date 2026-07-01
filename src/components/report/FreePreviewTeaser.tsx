"use client";

import type { ColorAnalysisResult } from "@/types/report";

interface Props {
  colorAnalysis?: ColorAnalysisResult;
  summary?: string;
  teaserOnly?: boolean;
}

export function FreePreviewTeaser({ colorAnalysis, summary, teaserOnly = true }: Props) {
  if (!colorAnalysis && !summary) return null;

  return (
    <div className="report-surface-panel mt-6 rounded-3xl p-6">
      {colorAnalysis ? (
        <div className="mb-4">
          <p className="foil-label mb-2 border-none p-0">Your color season preview</p>
          {teaserOnly ? (
            <>
              <h3 className="font-display text-2xl text-ink">
                ? season — try a look to reveal
              </h3>
              <p className="mt-2 text-sm text-ink-stone">
                Your undertone and palette unlock as you explore looks in Try &amp; Shop.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-display text-2xl text-ink">
                {colorAnalysis.season}
              </h3>
              <p className="mt-1 text-sm text-ink-stone">
                Undertone: {colorAnalysis.undertone}
              </p>
              {colorAnalysis.palette?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {colorAnalysis.palette.slice(0, 4).map((c) => (
                    <span key={c.hex} className="report-chip inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: c.hex }} />
                      {c.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {summary ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-ink-stone">
          {summary}
        </p>
      ) : null}
    </div>
  );
}
