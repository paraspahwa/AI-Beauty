"use client";

import { AnalysisInfographicImage } from "./AnalysisInfographicImage";
import type { ReportVisualAsset } from "@/types/report";

interface Props {
  asset?: ReportVisualAsset;
}

export function StyleGuideInfographic({ asset }: Props) {
  return (
    <section>
      <p className="foil-label mb-2">Style Guide</p>
      <h2 className="mb-4 font-display text-2xl text-ink">
        Your Personal Style Board
      </h2>
      <AnalysisInfographicImage
        asset={asset}
        title="Style Guide"
        loadingMessage="Generating your personal style guide…"
        aspectRatio="3/4"
      />
    </section>
  );
}
