"use client";

import type { ReportVisualAsset } from "@/types/report";
import { AnalysisInfographicImage } from "./AnalysisInfographicImage";

interface Props {
  asset?: ReportVisualAsset;
}

export function ColorInfographic({ asset }: Props) {
  return (
    <AnalysisInfographicImage
      asset={asset}
      title="Color analysis"
      loadingMessage="Generating your color analysis…"
    />
  );
}
