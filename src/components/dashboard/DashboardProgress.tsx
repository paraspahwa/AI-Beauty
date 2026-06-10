"use client";

import { UnlockTeaserBanner } from "@/components/UnlockTeaserBanner";
import { PRODUCT_COPY } from "@/lib/product-copy";

export function DashboardProgress({
  remainingGens,
  tier,
}: {
  remainingGens: number | null;
  tier: string;
}) {
  const remaining = remainingGens ?? PRODUCT_COPY.free.studioGensPerMonth;
  const cap = tier === "studio_pro" ? PRODUCT_COPY.studioPro.studioGensPerMonth : PRODUCT_COPY.free.studioGensPerMonth;

  return (
    <div className="space-y-4">
      {tier !== "studio_pro" ? (
        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "rgba(17,24,39,0.08)", color: "#3D2B1F" }}>
          {remaining} of {cap} free try-ons left
        </span>
      ) : null}
      <UnlockTeaserBanner />
    </div>
  );
}
