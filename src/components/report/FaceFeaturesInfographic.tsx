"use client";

import type { ReportVisualAsset } from "@/types/report";
import { AnalysisInfographicImage } from "./AnalysisInfographicImage";

interface Props {
  asset?: ReportVisualAsset;
  isPaid: boolean;
}

export function FaceFeaturesInfographic({ asset, isPaid }: Props) {
  return (
    <section>
      <p className="foil-label mb-2 border-none p-0">Chapter I</p>
      <h2 className="font-display mb-4 text-2xl text-ink">
        {isPaid ? "Face Features Analysis" : "Face Shape Preview"}
      </h2>
      <AnalysisInfographicImage
        asset={asset}
        title="Face features analysis"
        generationMode="auto"
        loadingMessage={
          isPaid
            ? "Generating your full face features analysis…"
            : "Generating your face shape analysis…"
        }
      />
      {asset?.status === "ready" && (
        <p className="mt-3 text-center text-xs text-ink-stone">Saved to your Vault</p>
      )}
    </section>
  );
}
