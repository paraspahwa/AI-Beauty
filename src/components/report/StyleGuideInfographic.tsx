"use client";

import { AnalysisInfographicImage } from "./AnalysisInfographicImage";
import type { ReportVisualAsset } from "@/types/report";

interface Props {
  asset?: ReportVisualAsset;
}

export function StyleGuideInfographic({ asset }: Props) {
  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#9C7D5B" }}>
        Style Guide
      </p>
      <h2 className="text-2xl font-normal mb-4" style={{ color: "#2C1A10", fontFamily: "Georgia, serif" }}>
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
