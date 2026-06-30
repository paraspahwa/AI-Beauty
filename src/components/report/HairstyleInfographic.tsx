"use client";

import type { ReportVisualAsset } from "@/types/report";
import { AnalysisInfographicImage } from "./AnalysisInfographicImage";

interface Props {
  asset?: ReportVisualAsset;
}

export function HairstyleInfographic({ asset }: Props) {
  return (
    <AnalysisInfographicImage
      asset={asset}
      title="Hairstyle analysis"
      loadingMessage="Generating your hairstyle analysis…"
    />
  );
}
