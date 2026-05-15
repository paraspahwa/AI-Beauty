// Schema for Do vs Avoid guidance modules (MVP)

export type DoAvoidItem = {
  label: string;
  rationale?: string;
  image?: string; // Path to SeeDream or owned asset
};

export type DoAvoidCategory =
  | "tops"
  | "bottoms"
  | "necklines";

export interface DoAvoidGuidanceBlock {
  category: DoAvoidCategory;
  do: DoAvoidItem[];
  avoid: DoAvoidItem[];
  summary?: string;
  cta?: string;
}

export type DoAvoidGuidanceConfig = DoAvoidGuidanceBlock[];
