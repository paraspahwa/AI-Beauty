import { getGeneratableSectionIds } from "@/lib/ai/infographic-sections";
import { scheduleInternalPost } from "@/lib/internal/schedule-job";
import type { AnalysisInfographicSectionId } from "@/types/report";

/** After analysis: free face-shape preview only (paid sections queue on unlock). */
export function kickOffPostAnalysisInfographics(
  reportId: string,
  _userEmail: string | null | undefined,
): void {
  kickOffFaceFeaturesPreviewInBackground(reportId);
}

/** Free preview: one background job (face-shape infographic). */
export function kickOffFaceFeaturesPreviewInBackground(reportId: string): void {
  scheduleInternalPost("/api/internal/trigger-infographics", { reportId, mode: "preview" });
}

/** Paid unlock: one isolated background job per paid section (parallel). */
export function kickOffInfographicsInBackground(
  reportId: string,
  opts?: { sections?: AnalysisInfographicSectionId[]; force?: boolean },
): void {
  const sections = opts?.sections ?? getGeneratableSectionIds();
  const force = opts?.force ?? false;
  for (const section of sections) {
    scheduleInternalPost("/api/internal/trigger-infographics", {
      reportId,
      mode: "full",
      section,
      force,
    });
  }
}

/** Generate a single paid infographic section. */
export function kickOffInfographicSectionInBackground(
  reportId: string,
  section: AnalysisInfographicSectionId,
  force = false,
): void {
  scheduleInternalPost("/api/internal/trigger-infographics", {
    reportId,
    mode: "full",
    section,
    force,
  });
}

/** Style Guide add-on: single background job after add-on payment. */
export function kickOffStyleGuideInfographicInBackground(reportId: string, force = false): void {
  scheduleInternalPost("/api/internal/trigger-style-guide", { reportId, force });
}
