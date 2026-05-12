/**
 * Makeup option enums for fal-ai/image-apps-v2/makeup-application.
 * Shared between client (AIBeautyStudio) and server (makeup route).
 *
 * Granular controls (lip, eyeshadow, blush, foundation, contour, eyeliner)
 * are composed into a style_description prompt sent alongside the preset style.
 */

// ── Preset style (still used as FAL's primary `makeup_style` param) ───────────
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
  natural:       "Natural",
  glamorous:     "Glamorous",
  smoky_eyes:    "Smoky Eyes",
  bold_lips:     "Bold Lips",
  no_makeup:     "No Makeup",
  remove_makeup: "Remove Makeup",
  dramatic:      "Dramatic",
  bridal:        "Bridal",
  professional:  "Professional",
  korean_style:  "Korean Style",
  artistic:      "Artistic",
};

export const MAKEUP_INTENSITY_LABELS: Record<MakeupIntensityValue, string> = {
  light:    "Light",
  medium:   "Medium",
  heavy:    "Heavy",
  dramatic: "Dramatic",
};

// ── Granular controls ─────────────────────────────────────────────────────────

export const LIP_COLORS = [
  { value: "nude_beige",   label: "Nude Beige",   hex: "#C8956B" },
  { value: "soft_pink",    label: "Soft Pink",    hex: "#E8A0A8" },
  { value: "classic_red",  label: "Classic Red",  hex: "#C41E3A" },
  { value: "deep_red",     label: "Deep Red",     hex: "#8B0000" },
  { value: "coral",        label: "Coral",        hex: "#E8733A" },
  { value: "berry",        label: "Berry",        hex: "#7B2D8B" },
  { value: "mauve",        label: "Mauve",        hex: "#A0707A" },
  { value: "plum",         label: "Plum",         hex: "#5D2A42" },
  { value: "terracotta",   label: "Terracotta",   hex: "#C47856" },
  { value: "rose",         label: "Rose",         hex: "#D4688A" },
  { value: "cherry",       label: "Cherry",       hex: "#9B1B30" },
  { value: "peachy_nude",  label: "Peachy Nude",  hex: "#D4906A" },
] as const;
export type LipColorValue = (typeof LIP_COLORS)[number]["value"];

export const EYESHADOW_PALETTES = [
  { value: "neutral",     label: "Neutral",     description: "Taupes, beiges, warm browns",      swatches: ["#C8A87A","#A07850","#7A5838"] },
  { value: "smoky",       label: "Smoky",       description: "Charcoals, deep grays, black",     swatches: ["#888888","#555555","#222222"] },
  { value: "bronze",      label: "Bronze",      description: "Copper, gold, burnt orange",        swatches: ["#C87840","#A85828","#E8A050"] },
  { value: "pink_rose",   label: "Pink Rose",   description: "Blush, dusty rose, mauve",         swatches: ["#E8A8B8","#C88898","#A86878"] },
  { value: "earth",       label: "Earth",       description: "Terracotta, rust, olive",           swatches: ["#B86848","#8B5030","#7A6840"] },
  { value: "purple",      label: "Purple",      description: "Lavender, violet, plum",            swatches: ["#B898D8","#8868A8","#604880"] },
  { value: "blue",        label: "Blue",        description: "Navy, cobalt, steel",               swatches: ["#6888C8","#4868A8","#284880"] },
  { value: "green",       label: "Green",       description: "Sage, forest, emerald",             swatches: ["#78A878","#508058","#306040"] },
  { value: "no_eyeshadow", label: "None",       description: "No eyeshadow applied",             swatches: [] },
] as const;
export type EyeshadowValue = (typeof EYESHADOW_PALETTES)[number]["value"];

export const BLUSH_COLORS = [
  { value: "peach",       label: "Peach",       hex: "#E8A870" },
  { value: "rose",        label: "Rose",        hex: "#D87888" },
  { value: "coral",       label: "Coral",       hex: "#E87850" },
  { value: "berry",       label: "Berry",       hex: "#A84868" },
  { value: "bronze",      label: "Bronze",      hex: "#C87840" },
  { value: "natural",     label: "Natural",     hex: "#D89878" },
  { value: "no_blush",    label: "None",        hex: "" },
] as const;
export type BlushColorValue = (typeof BLUSH_COLORS)[number]["value"];

export const BLUSH_INTENSITIES = [
  { value: "sheer",   label: "Sheer" },
  { value: "soft",    label: "Soft" },
  { value: "medium",  label: "Medium" },
  { value: "flushed", label: "Flushed" },
] as const;
export type BlushIntensityValue = (typeof BLUSH_INTENSITIES)[number]["value"];

export const FOUNDATION_SHADES = [
  { value: "fair",        label: "Fair",          hex: "#F5E0C8" },
  { value: "light",       label: "Light",         hex: "#E8C8A8" },
  { value: "light_medium",label: "Light-Medium",  hex: "#D8B080" },
  { value: "medium",      label: "Medium",        hex: "#C09060" },
  { value: "medium_tan",  label: "Medium-Tan",    hex: "#A87848" },
  { value: "tan",         label: "Tan",           hex: "#906038" },
  { value: "deep",        label: "Deep",          hex: "#603820" },
  { value: "rich_deep",   label: "Rich Deep",     hex: "#402010" },
] as const;
export type FoundationShadeValue = (typeof FOUNDATION_SHADES)[number]["value"];

export const EYELINER_STYLES = [
  { value: "none",         label: "None",         description: "No eyeliner" },
  { value: "subtle",       label: "Subtle",       description: "Thin, natural lash line" },
  { value: "classic",      label: "Classic",      description: "Defined, clean line" },
  { value: "cat_eye",      label: "Cat Eye",      description: "Subtle flick at outer corner" },
  { value: "winged",       label: "Winged",       description: "Bold extended wing" },
  { value: "smoky_liner",  label: "Smoky",        description: "Smudged, blended edge" },
] as const;
export type EyelinerStyleValue = (typeof EYELINER_STYLES)[number]["value"];

// ── Granular controls interface (sent from client → route) ────────────────────
export interface MakeupGranularControls {
  lipColor?:        LipColorValue;
  eyeshadow?:       EyeshadowValue;
  blushColor?:      BlushColorValue;
  blushIntensity?:  BlushIntensityValue;
  foundation?:      FoundationShadeValue;
  contour?:         boolean;
  eyeliner?:        EyelinerStyleValue;
  // Overall style hint + intensity still passed to FAL
  style?:           MakeupStyleValue;
  intensity?:       MakeupIntensityValue;
}

// ── Derive best FAL preset from granular controls ─────────────────────────────
export function deriveStyle(c: MakeupGranularControls): MakeupStyleValue {
  const { lipColor, eyeshadow, eyeliner, contour, intensity } = c;
  if (eyeshadow === "smoky" && (eyeliner === "winged" || eyeliner === "smoky_liner")) return "smoky_eyes";
  if (lipColor === "classic_red" || lipColor === "deep_red" || lipColor === "cherry") return "bold_lips";
  if (contour && (intensity === "heavy" || intensity === "dramatic")) return "glamorous";
  if (eyeshadow === "no_eyeshadow" && !contour && eyeliner === "none") return "no_makeup";
  if (c.style) return c.style;
  return "natural";
}

// ── Build a human-readable description for FAL ────────────────────────────────
export function buildMakeupPrompt(c: MakeupGranularControls): string {
  const parts: string[] = [];

  const lip = LIP_COLORS.find((l) => l.value === c.lipColor);
  if (lip) parts.push(`${lip.label} lip color`);

  const eye = EYESHADOW_PALETTES.find((e) => e.value === c.eyeshadow);
  if (eye && eye.value !== "no_eyeshadow") parts.push(`${eye.label.toLowerCase()} eyeshadow`);

  const blush = BLUSH_COLORS.find((b) => b.value === c.blushColor);
  const blushInt = BLUSH_INTENSITIES.find((b) => b.value === c.blushIntensity);
  if (blush && blush.value !== "no_blush") {
    parts.push(`${blushInt?.label.toLowerCase() ?? "soft"} ${blush.label.toLowerCase()} blush`);
  }

  const found = FOUNDATION_SHADES.find((f) => f.value === c.foundation);
  if (found) parts.push(`${found.label.toLowerCase()} foundation coverage`);

  if (c.contour) parts.push("defined contouring and highlighting");

  const liner = EYELINER_STYLES.find((l) => l.value === c.eyeliner);
  if (liner && liner.value !== "none") parts.push(`${liner.label.toLowerCase()} eyeliner`);

  if (parts.length === 0) return "natural, light makeup look";
  return parts.join(", ") + ".";
}

// ── Cache key from granular controls ─────────────────────────────────────────
export function makeupCacheKey(c: MakeupGranularControls): string {
  return [
    c.style ?? "natural",
    c.intensity ?? "medium",
    c.lipColor ?? "none",
    c.eyeshadow ?? "none",
    c.blushColor ?? "none",
    c.blushIntensity ?? "soft",
    c.foundation ?? "none",
    c.contour ? "contour" : "no-contour",
    c.eyeliner ?? "none",
  ].join("__");
}
