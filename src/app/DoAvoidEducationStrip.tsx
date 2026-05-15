"use client";

import React from "react";
import { DoAvoidGuidanceCard } from "@/components/ui/DoAvoidGuidanceCard";
import type { DoAvoidGuidanceConfig } from "@/types/doAvoidGuidance";
import guidanceData from "@/content/do-avoid-guidance.json";
import { publicEnv } from "@/lib/public-env";
import { track } from "@/lib/track";

export function DoAvoidEducationStrip() {
  const blocks = guidanceData as DoAvoidGuidanceConfig;

  React.useEffect(() => {
    track("do_avoid_module_view", { location: "homepage" });
  }, []);

  if (!publicEnv.flags.doAvoidModule) return null;

  return (
    <section className="container max-w-6xl py-8">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-ink text-center">Style Education: Do vs Avoid</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {blocks.map((block) => (
          <DoAvoidGuidanceCard key={block.category} block={block} />
        ))}
      </div>
    </section>
  );
}
