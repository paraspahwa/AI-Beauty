import { getBlueprintSection } from "@/lib/ai/infographic-sections";
import type { AnalysisInfographics, ReportVisualAssets } from "@/types/report";

export interface InfographicSlide {
  key: string;
  label: string;
  storagePath: string;
}

const PAID_SECTION_ORDER: (keyof AnalysisInfographics)[] = [
  "faceFeatures",
  "skin",
  "color",
  "hairstyle",
  "spectacles",
  "hairColor",
];

export function parseReportVisualAssets(value: unknown): ReportVisualAssets | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as ReportVisualAssets;
}

/** Paid report PDF — generated analysis infographics only (no style guide). */
export function collectReportAnalysisSlides(
  visualAssets: ReportVisualAssets | undefined | null,
): InfographicSlide[] {
  const infographics = visualAssets?.assets?.analysisInfographics;
  if (!infographics) return [];

  const slides: InfographicSlide[] = [];
  for (const key of PAID_SECTION_ORDER) {
    const asset = infographics[key];
    if (!asset || asset.status !== "ready" || !asset.path) continue;
    const meta = getBlueprintSection(key as Parameters<typeof getBlueprintSection>[0]);
    slides.push({
      key: String(key),
      label: meta?.label ?? String(key),
      storagePath: asset.path,
    });
  }
  return slides;
}

/** Style Guide add-on PDF — single style board infographic. */
export function collectStyleGuideSlides(
  visualAssets: ReportVisualAssets | undefined | null,
): InfographicSlide[] {
  const asset = visualAssets?.assets?.analysisInfographics?.styleGuide;
  if (!asset || asset.status !== "ready" || !asset.path) return [];
  return [{ key: "styleGuide", label: "Personal Style Guide", storagePath: asset.path }];
}
