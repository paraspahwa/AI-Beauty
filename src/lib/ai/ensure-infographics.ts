import {
  kickOffFaceFeaturesPreviewInBackground,
  kickOffInfographicsInBackground,
} from "@/lib/ai/kickoff-infographics";
import {
  previewNeedsGeneration,
  sectionsNeedingGeneration,
  type InfographicReportRow,
} from "@/lib/ai/run-analysis-infographics";

export type EnsureInfographicsResult = {
  mode: "preview" | "full" | "skipped";
  queued: number;
  sections?: string[];
  reason?: string;
};

/** Idempotent: queue missing infographic background jobs (never blocks on FAL). */
export function ensureReportInfographicsQueued(
  reportId: string,
  row: InfographicReportRow,
  hasPremium: boolean,
): EnsureInfographicsResult {
  if (row.status !== "ready") {
    return { mode: "skipped", queued: 0, reason: "not_ready" };
  }

  if (!hasPremium) {
    if (previewNeedsGeneration(row)) {
      kickOffFaceFeaturesPreviewInBackground(reportId);
      return { mode: "preview", queued: 1 };
    }
    return { mode: "preview", queued: 0 };
  }

  const sections = sectionsNeedingGeneration(row);
  if (sections.length > 0) {
    kickOffInfographicsInBackground(reportId, { sections });
    return { mode: "full", queued: sections.length, sections };
  }

  return { mode: "full", queued: 0, sections: [] };
}
