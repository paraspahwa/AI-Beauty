import type { AnalysisInfographicSectionId } from "@/types/report";

export interface BlueprintSectionMeta {
  id: AnalysisInfographicSectionId;
  label: string;
  description: string;
  generatable: boolean;
  order: number;
  /** When true, available before payment unlock. */
  previewTier?: boolean;
}

export const BLUEPRINT_SECTIONS: BlueprintSectionMeta[] = [
  {
    id: "faceFeaturesPreview",
    label: "Face Features (Preview)",
    description: "Face shape overview infographic",
    generatable: true,
    order: 0,
    previewTier: true,
  },
  {
    id: "faceFeatures",
    label: "Face Features Analysis",
    description: "Full facial features infographic",
    generatable: true,
    order: 1,
  },
  {
    id: "skin",
    label: "Skin Analysis",
    description: "Skin type and routine infographic",
    generatable: true,
    order: 2,
  },
  {
    id: "color",
    label: "Color Analysis",
    description: "Seasonal color palette infographic",
    generatable: true,
    order: 3,
  },
  {
    id: "hairstyle",
    label: "Hairstyle Analysis",
    description: "Hairstyle recommendations infographic",
    generatable: true,
    order: 4,
  },
  {
    id: "spectacles",
    label: "Spectacles Guide",
    description: "Eyewear recommendations infographic",
    generatable: true,
    order: 5,
  },
  {
    id: "hairColor",
    label: "Hair Color",
    description: "Hair color palette infographic",
    generatable: true,
    order: 6,
  },
];

export function getBlueprintSection(id: AnalysisInfographicSectionId): BlueprintSectionMeta | undefined {
  return BLUEPRINT_SECTIONS.find((s) => s.id === id);
}

export function getGeneratableSectionIds(): AnalysisInfographicSectionId[] {
  return BLUEPRINT_SECTIONS.filter((s) => s.generatable && !s.previewTier).map((s) => s.id);
}

export function isAnalysisInfographicSectionId(value: string): value is AnalysisInfographicSectionId {
  return BLUEPRINT_SECTIONS.some((s) => s.id === value);
}
