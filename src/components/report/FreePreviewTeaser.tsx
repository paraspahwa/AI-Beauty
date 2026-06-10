"use client";

import type { ColorAnalysisResult } from "@/types/report";

interface Props {
  colorAnalysis?: ColorAnalysisResult;
  summary?: string;
  /** When true, mask full season reveal for progressive unlock. */
  teaserOnly?: boolean;
}

export function FreePreviewTeaser({ colorAnalysis, summary, teaserOnly = true }: Props) {
  if (!colorAnalysis && !summary) return null;

  return (
    <div className="mt-6 rounded-3xl p-6" style={{ background: "#FDFAF6", border: "1px solid #E8DDD0" }}>
      {colorAnalysis ? (
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9C7D5B" }}>
            Your color season preview
          </p>
          {teaserOnly ? (
            <>
              <h3 className="text-2xl font-normal" style={{ color: "#2C1A10", fontFamily: "Georgia, serif" }}>
                ? season — try a look to reveal
              </h3>
              <p className="text-sm mt-2" style={{ color: "#6B5344" }}>
                Your undertone and palette unlock as you explore looks in Try &amp; Shop.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-normal" style={{ color: "#2C1A10", fontFamily: "Georgia, serif" }}>
                {colorAnalysis.season}
              </h3>
              <p className="text-sm mt-1" style={{ color: "#6B5344" }}>
                Undertone: {colorAnalysis.undertone}
              </p>
              {colorAnalysis.palette?.length ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  {colorAnalysis.palette.slice(0, 4).map((c) => (
                    <span
                      key={c.hex}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
                      style={{ background: "rgba(17,24,39,0.06)", color: "#3D2B1F" }}
                    >
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
        <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "#6B5344" }}>
          {summary}
        </p>
      ) : null}
    </div>
  );
}
