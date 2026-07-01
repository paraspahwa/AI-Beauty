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
    <div className={`dossier-card relative overflow-hidden !p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terracotta/12">
          <Sparkles className="h-4 w-4 text-terracotta" />
        </div>
        <p className="text-sm leading-relaxed text-ink-stone">
          {message}
        </p>
      </div>
    </div>
  );
}
