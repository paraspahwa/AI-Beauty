import type { AnalysisInfographicSectionId } from "@/types/report";

export interface BlueprintSectionMeta {
  id: AnalysisInfographicSectionId;
  label: string;
  description: string;
  /** When false, UI shows "Coming soon" and generate API rejects the section. */
  generatable: boolean;
  order: number;
}

/** Canonical Beauty Blueprint sections — extend as new infographics ship. */
export const BLUEPRINT_SECTIONS: readonly BlueprintSectionMeta[] = [
  {
    id: "faceFeatures",
    label: "Face Features",
    description: "Eyes, brows, nose, lips, cheeks & face shape",
    generatable: true,
    order: 1,
  },
  {
    id: "skin",
    label: "Skin Analysis",
    description: "Skin type, zones & care direction",
    generatable: true,
    order: 2,
  },
  {
    id: "color",
    label: "Color Analysis",
    description: "Season, palette & flattering tones",
    generatable: true,
    order: 3,
  },
  {
    id: "hairstyle",
    label: "Hairstyle Guide",
    description: "Cuts, lengths & styling recommendations",
    generatable: true,
    order: 4,
  },
  {
    id: "spectacles",
    label: "Spectacles Guide",
    description: "Frame styles that flatter your face",
    generatable: true,
    order: 5,
  },
  {
    id: "hairColor",
    label: "Hair Color Report",
    description: "Shades & techniques for your coloring",
    generatable: true,
    order: 6,
  },
  {
    id: "styleGuide",
    label: "Style Guide",
    description: "Personal style identity, wardrobe & outfit direction",
    generatable: true,
    order: 7,
  },
] as const;

const SECTION_SET = new Set<string>(BLUEPRINT_SECTIONS.map((s) => s.id));

export function isAnalysisInfographicSectionId(value: string): value is AnalysisInfographicSectionId {
  return SECTION_SET.has(value);
}

export function getBlueprintSection(id: AnalysisInfographicSectionId): BlueprintSectionMeta | undefined {
  return BLUEPRINT_SECTIONS.find((s) => s.id === id);
}

export function getGeneratableSectionIds(): AnalysisInfographicSectionId[] {
  return BLUEPRINT_SECTIONS.filter((s) => s.generatable).map((s) => s.id);
}
