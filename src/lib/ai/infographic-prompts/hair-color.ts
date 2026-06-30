import type { ColorAnalysisResult, FeatureBreakdown, HairstyleResult } from "@/types/report";

export const HAIR_COLOR_PROMPT_VERSION = "hair_color_v3";

type Swatch = { name: string; hex: string; description?: string };

const DEFAULT_BEST: Swatch[] = [
  { name: "Warm Brown", hex: "#6F4E37" },
  { name: "Caramel", hex: "#A67B4A" },
  { name: "Honey Blonde", hex: "#D4A03C" },
  { name: "Chocolate Brown", hex: "#3B2A1F" },
  { name: "Copper", hex: "#B85C38" },
  { name: "Golden Brown", hex: "#C49A3C" },
];

const DEFAULT_WEAKER: Swatch[] = [
  { name: "Ash Blonde", hex: "#C8B8A0" },
  { name: "Platinum Blonde", hex: "#E8E4DC" },
  { name: "Cool Brown", hex: "#6B6B5A" },
  { name: "Burgundy", hex: "#6B1A3A" },
  { name: "Blue Black", hex: "#1A1A2E" },
  { name: "Jet Black", hex: "#0A0A0A" },
];

const HAIR_COLOR_PROMPT_BASE = `Transform the uploaded portrait into a premium luxury Hair Color Analysis Report infographic. Preserve the person's identity exactly. Do not alter facial features, face shape, expression, skin texture, age, ethnicity, or camera angle. The report should look like it was designed by Apple, Aesop, or a luxury beauty consultant.

Create a clean editorial dashboard with warm ivory (#FAF8F3) background, elegant black typography, thin light-gray borders, rounded cards, subtle shadows, and generous white space.

Overall Layout: Landscape report.

Top Header:
- HAIR COLOR ANALYSIS REPORT
- Subtitle: Personalized color insights to help you choose shades that enhance your natural beauty.
- Top-right status badge: Analysis Complete — Your results are ready!

LEFT PANEL: Large original uploaded portrait (photorealistic). Below: "Uploaded Photo — Captured in natural daylight"

CENTER PANEL: YOUR PERSONAL TONE — large circular tone indicator, four elegant slider bars (Warmth, Contrast, Clarity, Saturation) with green progress indicators, bottom consultant note.

RIGHT PANEL: BEST HAIR COLORS FOR YOU — six premium hair color variations. Each: circular swatch, name, portrait preview, green check "Best Match". Only modify hair color; preserve identity.

LOWER RIGHT: WEAKER COLORS — Use with Caution — six simulations with red "Less Flattering" icon.

LOWER LEFT: PERSONALIZED COLOR TIPS — checklist with green icons.

Visual Style: Luxury salon consultation, beauty magazine editorial, minimal Scandinavian design, Apple HIG inspired, ultra realistic, 4K, professional infographic.

CRITICAL: Render as ONE finished landscape infographic image. Only modify hair color in simulations. No watermarks. No extra people.`;

function padSwatches(primary: Swatch[], fallback: Swatch[], count: number): Swatch[] {
  const out: Swatch[] = [];
  const seen = new Set<string>();
  for (const s of [...primary, ...fallback]) {
    const key = s.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= count) break;
  }
  return out;
}

function profileSliders(color: ColorAnalysisResult) {
  const season = color.season.toLowerCase();
  const warmth =
    color.undertone === "Warm" ? 78 : color.undertone === "Cool" ? 22 : 50;
  const contrast =
    season.includes("bright") || season.includes("deep") || season.includes("winter")
      ? 82
      : season.includes("soft")
        ? 32
        : 55;
  const clarity =
    season.includes("bright") ? 80 : season.includes("soft") ? 35 : 60;
  const saturation =
    season.includes("soft") || season.includes("muted") ? 34 : season.includes("bright") ? 86 : 52;
  return { warmth, contrast, clarity, saturation };
}

function toneLabel(color: ColorAnalysisResult): string {
  if (color.undertone === "Warm") return "Warm Neutral";
  if (color.undertone === "Cool") return "Cool Neutral";
  return "Neutral";
}

function toneNote(color: ColorAnalysisResult, sliders: ReturnType<typeof profileSliders>): string {
  const warmthWord = color.undertone === "Warm" ? "warm" : color.undertone === "Cool" ? "cool" : "neutral";
  const contrastWord =
    sliders.contrast >= 70 ? "high" : sliders.contrast <= 40 ? "low" : "medium";
  const clarityWord =
    sliders.clarity >= 65 ? "good clarity" : sliders.clarity <= 40 ? "soft clarity" : "balanced clarity";
  return `You have ${warmthWord} undertones with ${contrastWord} contrast and ${clarityWord}. Warm rich colors naturally enhance your complexion.`;
}

function resolveBestColors(hairstyle: HairstyleResult): Swatch[] {
  const fromPipeline = hairstyle.colors.map((c) => ({
    name: c.name,
    hex: c.hex,
    description: c.description,
  }));
  return padSwatches(fromPipeline, DEFAULT_BEST, 6);
}

function resolveWeakerColors(color: ColorAnalysisResult): Swatch[] {
  const fromPipeline = color.avoidColors.map((c) => ({ name: c.name, hex: c.hex }));
  return padSwatches(fromPipeline, DEFAULT_WEAKER, 6);
}

function personalizedTips(color: ColorAnalysisResult): string[] {
  const tips = [
    color.undertone === "Cool"
      ? "Avoid overly warm or brassy shades."
      : "Stick with warm or neutral undertones.",
    "Add subtle face-framing highlights.",
    color.undertone === "Cool"
      ? "Cool ash and pearl tones suit your coloring."
      : "Avoid overly cool or ashy shades.",
    color.undertone === "Warm"
      ? "Warm caramel and honey tones brighten the complexion."
      : "Soft neutral browns create harmonious balance.",
    "Gloss treatments keep hair healthy and reflective.",
  ];
  return tips;
}

function buildPipelineDataAppendix(
  color: ColorAnalysisResult,
  features: FeatureBreakdown,
  hairstyle: HairstyleResult,
): string {
  const sliders = profileSliders(color);
  const best = resolveBestColors(hairstyle);
  const weaker = resolveWeakerColors(color);
  const tips = personalizedTips(color);

  const bestLines = best.map(
    (c, i) =>
      `${i + 1}. ${c.name} (${c.hex}) — ✓ Best Match — photorealistic hair only${c.description ? `; ${c.description}` : ""}`,
  );
  const weakerLines = weaker.map(
    (c, i) =>
      `${i + 1}. ${c.name} (${c.hex}) — Less Flattering — may wash out complexion`,
  );

  return [
    "",
    "=== AUTHORITATIVE ANALYSIS DATA (use verbatim — do not contradict) ===",
    `Seasonal coloring: ${color.season}`,
    `Personal tone label: ${toneLabel(color)}`,
    `Skin undertone: ${color.undertone}`,
    `Eye notes: ${features.eyes.shape} — ${features.eyes.notes.split(".").slice(0, 1).join(".")}`,
    `Hair type: ${hairstyle.hairType ?? "Natural"}`,
    color.description ? `Summary: ${color.description}` : "",
    "",
    "Slider values (green progress bars):",
    `- Warmth: ${sliders.warmth}% (Cool ← → Warm)`,
    `- Contrast: ${sliders.contrast}% (Low ← → High)`,
    `- Clarity: ${sliders.clarity}% (Soft ← → Clear)`,
    `- Saturation: ${sliders.saturation}% (Muted ← → Vibrant)`,
    "",
    `Consultant note: ${toneNote(color, sliders)}`,
    "",
    "BEST HAIR COLORS FOR YOU (6 simulations):",
    ...bestLines,
    "",
    "Below best section: These shades enhance your natural warmth and create a healthy radiant appearance.",
    "",
    "WEAKER COLORS — Use with Caution (6 simulations):",
    ...weakerLines,
    "",
    "Below weaker section: These tones may wash out your complexion or create excessive contrast.",
    "",
    "PERSONALIZED COLOR TIPS:",
    ...tips.map((t) => `• ${t}`),
    "",
    "CRITICAL: Preserve identity exactly. Only hair color changes in simulation panels.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildHairColorInfographicPrompt(
  color: ColorAnalysisResult,
  features: FeatureBreakdown,
  hairstyle: HairstyleResult,
): string {
  return HAIR_COLOR_PROMPT_BASE + buildPipelineDataAppendix(color, features, hairstyle);
}
