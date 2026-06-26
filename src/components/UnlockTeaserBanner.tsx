"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

interface Props {
  hints?: { season?: string; faceShape?: string };
  className?: string;
}

export function UnlockTeaserBanner({ hints, className = "" }: Props) {
  const shape = hints?.faceShape;
  const season = hints?.season && hints.season !== "?" ? hints.season : null;

  const message = season
    ? `Your ${season} palette and full styling guide are ready — unlock to see every section.`
    : shape
      ? `We mapped your ${shape} face shape — unlock for skin, color, hair, spectacles, and style guidance.`
      : "Unlock your complete beauty report — skin, color, hair, spectacles, and style guide.";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(253,250,246,0.98), rgba(251,231,242,0.92))",
        borderColor: "rgba(17,24,39,0.12)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(17,24,39,0.08)" }}
        >
          <Sparkles className="h-4 w-4" style={{ color: "#111827" }} />
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#3D2B1F" }}>
          {message}
        </p>
      </div>
    </div>
  );
}
