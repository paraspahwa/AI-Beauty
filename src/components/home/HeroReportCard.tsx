"use client";

import { Sparkles } from "lucide-react";
import { ReportSampleGallery } from "@/components/home/ReportSampleGallery";

export function HeroReportCard() {
  return (
    <div className="card-soft relative overflow-hidden">
      <div className="absolute right-4 top-4 z-10 rounded-full bg-terracotta/15 px-3 py-1 text-xs font-semibold text-terracotta">
        Sample report
      </div>
      <div className="flex items-center gap-2 text-sm text-ink-stone">
        <Sparkles className="h-4 w-4 text-terracotta animate-pulse" />
        Renovaara infographic preview
      </div>
      <ReportSampleGallery variant="compact" />
    </div>
  );
}
