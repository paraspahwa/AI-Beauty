"use client";

import type { ReportVisualAsset } from "@/types/report";
import { AnalysisInfographicImage } from "./AnalysisInfographicImage";

interface Props {
  asset?: ReportVisualAsset;
  isPaid: boolean;
}

export function FaceFeaturesInfographic({ asset, isPaid }: Props) {
  return (
    <AnalysisInfographicImage
      asset={asset}
      title="Face features analysis"
      loadingMessage={
        isPaid
          ? "Generating your full face features analysis…"
          : "Generating your face shape analysis…"
      }
    />
  );
}
