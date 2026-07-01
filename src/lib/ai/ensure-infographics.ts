import {
  kickOffFaceFeaturesPreviewInBackground,
  kickOffInfographicSectionInBackground,
} from "@/lib/ai/kickoff-infographics";
import {
  faceFeaturesNeedsGeneration,
  previewNeedsGeneration,
  type InfographicReportRow,
} from "@/lib/ai/run-analysis-infographics";

export type EnsureInfographicsResult = {
  mode: "preview" | "full" | "skipped";
  queued: number;
  sections?: string[];
  reason?: string;
};

/** Idempotent: auto-queue preview + full face features only (manual sections are user-triggered). */
export function ensureReportInfographicsQueued(
  reportId: string,
  row: InfographicReportRow,
  hasPremium: boolean,
): EnsureInfographicsResult {
  if (row.status !== "ready") {
    return { mode: "skipped", queued: 0, reason: "not_ready" };
  }

  let queued = 0;
  const sections: string[] = [];

  if (previewNeedsGeneration(row)) {
    kickOffFaceFeaturesPreviewInBackground(reportId);
    queued += 1;
    sections.push("faceFeaturesPreview");
  }

  if (!hasPremium) {
    return { mode: "preview", queued, sections };
  }

  if (faceFeaturesNeedsGeneration(row)) {
    kickOffInfographicSectionInBackground(reportId, "faceFeatures");
    queued += 1;
    sections.push("faceFeatures");
  }

  return { mode: "full", queued, sections };
}
