import type { SkinAnalysisResult } from "@/types/report";

export const SKIN_PROMPT_VERSION = "skin_v2";

function concernLabel(c: SkinAnalysisResult["concerns"][number]): string {
  return typeof c === "string" ? c : c.label;
}

function zoneObservation(skin: SkinAnalysisResult, zone: string): string {
  const match = skin.zones.find((z) => z.zone.toLowerCase().includes(zone.toLowerCase()));
  return match?.observation ?? "Balanced appearance";
}

const TYPE_CARD_TRAITS: Record<string, string[]> = {
  Oily: ["Shiny appearance", "Enlarged pores", "Breakout tendency"],
  Dry: ["Tight feeling", "Dullness", "Flaky appearance"],
  Combination: ["Oily T-zone", "Balanced cheeks", "Mixed characteristics"],
  Sensitive: ["Redness tendency", "Irritation", "Reactivity"],
  Normal: ["Balanced hydration", "Smooth texture", "Healthy glow"],
};

const RECOMMENDATIONS_BY_TYPE: Record<string, string[]> = {
  Oily: ["Oil Control", "Gentle Exfoliation", "Lightweight Moisturizer", "Barrier Support", "Daily SPF"],
  Dry: ["Deep Hydration", "Barrier Support", "Gentle Exfoliation", "Lightweight Moisturizer", "Daily SPF"],
  Combination: ["Hydration Balance", "Oil Control", "Gentle Exfoliation", "Lightweight Moisturizer", "Daily SPF"],
  Sensitive: ["Barrier Support", "Hydration Balance", "Gentle Exfoliation", "Lightweight Moisturizer", "Daily SPF"],
  Normal: ["Hydration Balance", "Gentle Exfoliation", "Lightweight Moisturizer", "Barrier Support", "Daily SPF"],
};

/** Comparison row uses four types; Normal maps to Combination for the checkmark row. */
function comparisonHighlightType(type: SkinAnalysisResult["type"]): string {
  if (type === "Normal") return "Combination";
  return type;
}

export function buildSkinInfographicPrompt(skin: SkinAnalysisResult): string {
  const concerns = skin.concerns.slice(0, 5).map(concernLabel);
  const highlightType = comparisonHighlightType(skin.type);
  const recommendations = RECOMMENDATIONS_BY_TYPE[skin.type] ?? RECOMMENDATIONS_BY_TYPE.Combination;
  const lowConfidence =
    skin.imageConfidence !== undefined && skin.imageConfidence < 0.55;

  const tZoneObs = zoneObservation(skin, "T-Zone");
  const cheekObs = zoneObservation(skin, "Cheek");
  const poreObs = concerns.find((c) => /pore/i.test(c)) ?? zoneObservation(skin, "T-Zone");
  const textureObs = concerns.find((c) => /texture|uneven|rough/i.test(c)) ?? zoneObservation(skin, "Jawline");

  const comparisonLines = (["Oily", "Dry", "Combination", "Sensitive"] as const).map((t) => {
    const traits = TYPE_CARD_TRAITS[t].join(", ");
    const marker = t === highlightType ? "✓ CHECKMARK — detected match" : "subtle X indicator";
    return `  ${t} Skin (${marker}): ${traits}`;
  });

  return [
    "Transform the uploaded portrait into a premium skincare analysis infographic.",
    "Analyze visible skin characteristics and create a luxury dermatologist-style skin assessment report.",
    "",
    "CRITICAL: Preserve the person's facial identity exactly in every panel — same person, photorealistic.",
    lowConfidence
      ? "Note: image quality was limited; present findings conservatively without overstating."
      : "",
    "",
    "=== PIPELINE DATA (use exactly — do not re-diagnose differently) ===",
    `Detected skin type: ${skin.type}`,
    concerns.length ? `Concerns: ${concerns.join(", ")}` : "",
    skin.zones.length
      ? `Zone observations: ${skin.zones.map((z) => `${z.zone}: ${z.observation}`).join("; ")}`
      : "",
    "",
    "=== DESIGN STYLE ===",
    "- Professional skincare consultation sheet",
    "- Minimalist beige and ivory palette — soft beige background #F5F0EA",
    "- Luxury beauty clinic aesthetic, clean editorial magazine layout",
    "- Elegant serif title \"Skin Analysis\", minimal sans-serif labels",
    "- Thin divider lines, rounded cards, subtle shadows, consistent icon set",
    "- Medical-grade yet visually appealing; Pinterest-quality premium editorial layout",
    "",
    "=== TOP SECTION ===",
    "Title: \"Skin Analysis\"",
    "Display the original portrait prominently.",
    "Overlay subtle facial zone markings: Forehead (T-Zone), Nose, Cheeks, Chin.",
    "",
    "Right-side analysis panel:",
    `T-ZONE — oil/hydration/sebum icons. Observation: ${tZoneObs}`,
    `CHEEKS — hydration, sensitivity, balance icons. Observation: ${cheekObs}`,
    `PORES — visible pore assessment. Observation: ${poreObs}`,
    `TEXTURE — smoothness and surface analysis. Observation: ${textureObs}`,
    "",
    "Include realistic circular zoom-in detail views: forehead texture, cheek texture, nose pores, overall skin surface.",
    "",
    "=== SKIN TYPE COMPARISON SECTION ===",
    "Four skincare profile cards — same face with realistic skin-condition visualization per card:",
    ...comparisonLines,
    `Mark ${highlightType} with a green checkmark as BEST MATCH for this person (${skin.type} skin).`,
    "Mark the other three types with subtle X indicators.",
    "",
    "=== BOTTOM SECTION — BEST MATCH ===",
    `Large recommendation card displaying: ${skin.type.toUpperCase()} SKIN`,
    "Skincare recommendation icons:",
    ...recommendations.map((r) => `- ${r}`),
    "",
    "=== VISUAL REQUIREMENTS ===",
    "- Professional dermatologist report, luxury skincare consultation style",
    "- Consistent iconography, realistic skin rendering, high readability",
    "- Clean infographic hierarchy, ultra-detailed skin texture",
    "- Vertical infographic, 4:5 aspect ratio, high resolution, print-ready",
    "- No watermarks, no product brand names, no AM/PM routine steps",
    "- Inspired by premium dermatology clinics, Sephora skin analysis, SkinCeuticals, Vogue beauty editorials",
  ]
    .filter(Boolean)
    .join("\n");
}
