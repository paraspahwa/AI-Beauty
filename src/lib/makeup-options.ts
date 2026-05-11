/**
 * Makeup option enums for fal-ai/image-apps-v2/makeup-application.
 * Shared between client (MakeupCard) and server (makeup route).
 */

export const MAKEUP_STYLES = [
  "natural",
  "glamorous",
  "smoky_eyes",
  "bold_lips",
  "no_makeup",
  "remove_makeup",
  "dramatic",
  "bridal",
  "professional",
  "korean_style",
  "artistic",
] as const;

export type MakeupStyleValue = (typeof MAKEUP_STYLES)[number];

export const MAKEUP_INTENSITIES = ["light", "medium", "heavy", "dramatic"] as const;
export type MakeupIntensityValue = (typeof MAKEUP_INTENSITIES)[number];

export const MAKEUP_STYLE_LABELS: Record<MakeupStyleValue, string> = {
  natural: "Natural",
  glamorous: "Glamorous",
  smoky_eyes: "Smoky Eyes",
  bold_lips: "Bold Lips",
  no_makeup: "No Makeup",
  remove_makeup: "Remove Makeup",
  dramatic: "Dramatic",
  bridal: "Bridal",
  professional: "Professional",
  korean_style: "Korean Style",
  artistic: "Artistic",
};

export const MAKEUP_INTENSITY_LABELS: Record<MakeupIntensityValue, string> = {
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
  dramatic: "Dramatic",
};
