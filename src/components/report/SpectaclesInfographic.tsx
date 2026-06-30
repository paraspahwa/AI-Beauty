"use client";

import type { ReportVisualAsset } from "@/types/report";
import { AnalysisInfographicImage } from "./AnalysisInfographicImage";

interface Props {
  asset?: ReportVisualAsset;
}

export function SpectaclesInfographic({ asset }: Props) {
  return (
    <AnalysisInfographicImage
      asset={asset}
      title="Spectacles guide"
      loadingMessage="Generating your spectacles guide…"
    />
  );
}
