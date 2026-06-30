import { env } from "@/lib/env";
import { getGeneratableSectionIds } from "@/lib/ai/infographic-sections";
import type { AnalysisInfographicSectionId } from "@/types/report";

function fireInternal(path: string, body: Record<string, unknown>): void {
  const internalSecret = env.internal.secret;
  const appUrl = env.app.url;
  if (!internalSecret || internalSecret.length < 16) return;

  fetch(`${appUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": internalSecret,
    },
    body: JSON.stringify(body),
  }).catch((e) => console.error(`[kickoff-infographics] ${path} fire failed`, e));
}

/** Free preview: face-shape-only infographic after analyze. */
export function kickOffFaceFeaturesPreviewInBackground(reportId: string): void {
  fireInternal("/api/internal/trigger-infographics", { reportId, mode: "preview" });
}

/** Paid unlock: fire one background job per paid section (parallel, avoids timeout). */
export function kickOffInfographicsInBackground(reportId: string, force = false): void {
  for (const section of getGeneratableSectionIds()) {
    fireInternal("/api/internal/trigger-infographics", {
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
  fireInternal("/api/internal/trigger-infographics", { reportId, mode: "full", section, force });
}

/** Style Guide add-on: single background job after add-on payment. */
export function kickOffStyleGuideInfographicInBackground(reportId: string, force = false): void {
  fireInternal("/api/internal/trigger-style-guide", { reportId, force });
}
