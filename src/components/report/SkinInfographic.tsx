"use client";

import type { ReportVisualAsset } from "@/types/report";
import { AnalysisInfographicImage } from "./AnalysisInfographicImage";

interface Props {
  asset?: ReportVisualAsset;
}

export function SkinInfographic({ asset }: Props) {
  return (
    <AnalysisInfographicImage
      asset={asset}
      title="Skin analysis"
      loadingMessage="Generating your skin analysis…"
    />
  );
}
