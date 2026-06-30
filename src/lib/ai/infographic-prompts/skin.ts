import type { SkinAnalysisResult } from "@/types/report";

export const SKIN_PROMPT_VERSION = "skin_v3";

const SKIN_PROMPT_BASE = `Transform the uploaded portrait into a luxury dermatology-style Skin Analysis Report infographic. Preserve the person's facial identity exactly. Do not change their face shape, skin tone, eyes, nose, lips, hairstyle, expression, age, ethnicity, or camera angle. Only analyze the skin and generate a clean editorial beauty report with photorealistic skin zooms and premium UI.

The final result should look like a high-end skincare consultation report from a luxury dermatologist or premium beauty clinic, inspired by Apple, La Mer, SkinCeuticals, and modern editorial design.

Overall Design: Portrait-oriented infographic, warm ivory (#FAF8F3) background, minimal Scandinavian luxury, white space, rounded cards, thin light-gray borders, soft shadows, elegant serif headings, modern sans-serif body text.

Header: SKIN ANALYSIS — "AI-powered skin assessment based on your uploaded photo." Top-right badge: Analysis Complete — Your skin report is ready.

LEFT: Original portrait with dotted facial mapping (Forehead/T-Zone, Nose, Chin, Cheeks). Below: Uploaded Photo — Captured in natural lighting.

RIGHT ANALYSIS PANEL: Four circular macro skin zooms — T-ZONE, CHEEKS, PORES, TEXTURE with icons and results.

SKIN TYPE COMPARISON: Four cards (OILY, DRY, COMBINATION, SENSITIVE) — same face with subtle realistic adjustments; green checkmark on detected type with mapping overlay.

BEST MATCH: Large badge with detected skin type, three recommendation icons.

PERSONALIZED SKINCARE TIPS: Checklist with green check icons.

Visual Style: Luxury beauty consultation, editorial skincare magazine, dermatologist report, Apple-inspired, ultra photorealistic, 4K, magazine-quality UI.

CRITICAL: Render as ONE finished infographic image. Identity preserved exactly. Only skin analysis overlays, zooms, UI, text, icons. No watermarks.`;

const TYPE_CARD_TRAITS: Record<string, string[]> = {
  Oily: ["Shiny", "Enlarged Pores", "Breakouts"],
  Dry: ["Flaky", "Tight", "Dull"],
  Combination: ["Oily T-Zone", "Normal Cheeks", "Balanced Moisture"],
  Sensitive: ["Redness", "Irritation", "Reactive"],
  Normal: ["Balanced", "Smooth", "Healthy"],
};

const RECOMMENDATIONS_BY_TYPE: Record<string, [string, string, string]> = {
  Oily: ["Balance Oil & Hydration", "Gentle Exfoliation", "Lightweight Moisturizer"],
  Dry: ["Deep Hydration", "Barrier Support", "Gentle Exfoliation"],
  Combination: ["Balance Oil & Hydration", "Gentle Exfoliation", "Lightweight Moisturizer"],
  Sensitive: ["Barrier Support", "Gentle Exfoliation", "Lightweight Moisturizer"],
  Normal: ["Maintain Glow", "Stay Balanced", "Light Hydration"],
};

function concernLabel(c: SkinAnalysisResult["concerns"][number]): string {
  return typeof c === "string" ? c : c.label;
}

function zoneObservation(skin: SkinAnalysisResult, zone: string): string {
  const match = skin.zones.find((z) => z.zone.toLowerCase().includes(zone.toLowerCase()));
  return match?.observation ?? "Balanced appearance";
}

function comparisonHighlightType(type: SkinAnalysisResult["type"]): string {
  if (type === "Normal") return "Combination";
  return type;
}

function routineTips(skin: SkinAnalysisResult): string[] {
  const defaults = [
    "Cleanse twice daily with a gentle cleanser.",
    "Hydrate dry areas without over-moisturizing the T-zone.",
    "Use niacinamide to balance oil production.",
    "Apply SPF 50 sunscreen every morning.",
    "Exfoliate gently 1–2 times weekly.",
    "Maintain a consistent skincare routine.",
  ];

  const fromRoutine: string[] = [];
  const { routine } = skin;
  if (routine && !Array.isArray(routine)) {
    for (const step of [...routine.am, ...routine.pm].slice(0, 4)) {
      fromRoutine.push(`${step.step}: ${step.product}`);
    }
  } else if (Array.isArray(routine)) {
    for (const step of routine.slice(0, 4)) {
      fromRoutine.push(`${step.step}: ${step.product}`);
    }
  }

  return fromRoutine.length >= 4 ? fromRoutine : defaults;
}

function buildPipelineDataAppendix(skin: SkinAnalysisResult): string {
  const concerns = skin.concerns.slice(0, 5).map(concernLabel);
  const highlightType = comparisonHighlightType(skin.type);
  const recs = RECOMMENDATIONS_BY_TYPE[skin.type] ?? RECOMMENDATIONS_BY_TYPE.Combination;
  const tips = routineTips(skin);
  const lowConfidence =
    skin.imageConfidence !== undefined && skin.imageConfidence < 0.55;

  const tZoneObs = zoneObservation(skin, "T-Zone");
  const cheekObs = zoneObservation(skin, "Cheek");
  const poreObs = concerns.find((c) => /pore/i.test(c)) ?? "Visible";
  const textureObs = concerns.find((c) => /texture|uneven|rough/i.test(c)) ?? "Slightly Uneven";

  const comparisonLines = (["Oily", "Dry", "Combination", "Sensitive"] as const).map((t) => {
    const traits = TYPE_CARD_TRAITS[t].map((x) => `✓ ${x}`).join(", ");
    const marker = t === highlightType ? "GREEN CHECKMARK — selected" : "subtle X";
    return `${t}: (${marker}) ${traits}`;
  });

  return [
    "",
    "=== AUTHORITATIVE ANALYSIS DATA (use verbatim — do not contradict) ===",
    `Detected skin type: ${skin.type}`,
    `Best match badge text: ${skin.type.toUpperCase()} SKIN`,
    lowConfidence ? "Present findings conservatively — limited image clarity." : "",
    concerns.length ? `Concerns: ${concerns.join(", ")}` : "",
    skin.zones.length
      ? `Zone observations: ${skin.zones.map((z) => `${z.zone}: ${z.observation}`).join("; ")}`
      : "",
    "",
    "Right analysis panel results:",
    `- T-ZONE: ${tZoneObs}`,
    `- CHEEKS: ${cheekObs}`,
    `- PORES: ${poreObs}`,
    `- TEXTURE: ${textureObs}`,
    "",
    "Skin type comparison cards:",
    ...comparisonLines,
    `Mark ${highlightType} with green checkmark and facial mapping overlay (${skin.type} detected).`,
    "",
    "Best match recommendations:",
    ...recs.map((r, i) => `${i + 1}. ${r}`),
    "",
    "Personalized skincare tips:",
    ...tips.map((t) => `• ${t}`),
    "",
    "CRITICAL: Preserve identity exactly. Only overlays, zooms, UI, and text.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSkinInfographicPrompt(skin: SkinAnalysisResult): string {
  return SKIN_PROMPT_BASE + buildPipelineDataAppendix(skin);
}
