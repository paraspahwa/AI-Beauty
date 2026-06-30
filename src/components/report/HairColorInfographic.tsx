"use client";

import type { ReportVisualAsset } from "@/types/report";
import { AnalysisInfographicImage } from "./AnalysisInfographicImage";

interface Props {
  asset?: ReportVisualAsset;
}

export function HairColorInfographic({ asset }: Props) {
  return (
    <AnalysisInfographicImage
      asset={asset}
      title="Hair color analysis"
      loadingMessage="Generating your hair color analysis…"
      aspectRatio="3/2"
    />
  );
}
