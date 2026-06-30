"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { ReportVisualAsset } from "@/types/report";

interface Props {
  asset?: ReportVisualAsset;
  title: string;
  loadingMessage: string;
  aspectRatio?: string;
}

export function AnalysisInfographicImage({
  asset,
  title,
  loadingMessage,
  aspectRatio = "4/5",
}: Props) {
  const status = asset?.status ?? "pending";
  const imageUrl = asset?.signedUrl;

  if (status === "ready" && imageUrl) {
    return (
      <div className="rounded-3xl overflow-hidden" style={{ background: "#F7F2EC" }}>
        <div className="relative w-full" style={{ aspectRatio }}>
          <Image
            src={imageUrl}
            alt={title}
            fill
            unoptimized
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 900px"
          />
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div
        className="rounded-3xl px-6 py-12 text-center"
        style={{ background: "#F7F2EC", border: "1px solid #E4D8CC" }}
      >
        <p className="text-base font-medium" style={{ color: "#3D2B1F" }}>
          We couldn&apos;t generate your {title.toLowerCase()}.
        </p>
        <p className="mt-2 text-sm" style={{ color: "#6B5344" }}>
          {asset?.error ?? "Please refresh the page in a moment."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl flex flex-col items-center justify-center gap-4 px-6"
      style={{ background: "#F7F2EC", aspectRatio, border: "1px solid #E4D8CC" }}
    >
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#9C7D5B" }} />
      <p className="text-base font-medium text-center" style={{ color: "#3D2B1F" }}>
        {loadingMessage}
      </p>
      <p className="text-sm text-center max-w-sm" style={{ color: "#6B5344" }}>
        This usually takes under a minute. The page will update automatically.
      </p>
    </div>
  );
}
