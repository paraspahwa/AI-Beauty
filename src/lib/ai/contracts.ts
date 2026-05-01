import { z } from "zod";
import type {
  ColorAnalysisResult,
  FaceShape,
  FaceShapeResult,
  FeatureBreakdown,
  GlassesResult,
  HairstyleResult,
  SkinAnalysisResult,
} from "@/types/report";

const FACE_SHAPES: FaceShape[] = [
  "Oval",
  "Soft Oval",
  "Round",
  "Square",
  "Heart",
  "Diamond",
  "Oblong",
  "Triangle",
];

const COLOR_SEASONS = [
  "Spring",
  "Summer",
  "Autumn",
  "Winter",
  "Soft Spring",
  "Soft Summer",
  "Soft Autumn",
  "Deep Winter",
  "Deep Autumn",
  "Bright Spring",
  "Bright Winter",
  "Light Spring",
  "Light Summer",
] as const;

const UNDERTONES = ["Warm", "Cool", "Neutral"] as const;
const SKIN_TYPES = ["Oily", "Dry", "Combination", "Normal", "Sensitive"] as const;
const METALS = ["Gold", "Silver", "Rose Gold", "Bronze", "Platinum"] as const;

const DEFAULT_PALETTE = [
  { name: "Soft Camel", hex: "#C8A47A" },
  { name: "Warm Beige", hex: "#D8B08C" },
  { name: "Muted Coral", hex: "#C77D6B" },
  { name: "Olive Moss", hex: "#8A8F5E" },
  { name: "Dusty Rose", hex: "#B97D8B" },
  { name: "Terracotta", hex: "#B66547" },
  { name: "Soft Teal", hex: "#5F8F8B" },
  { name: "Ivory", hex: "#F2E8DA" },
];

const DEFAULT_AVOID_COLORS = [
  { name: "Neon Lime", hex: "#BFFF00" },
  { name: "Electric Blue", hex: "#3A5CFF" },
  { name: "Harsh Magenta", hex: "#D5006D" },
];

const DEFAULT_GLASSES_STYLES = [
  "Rectangle",
  "Cat-Eye",
  "Round",
  "Aviator",
  "Soft Square",
];

const DEFAULT_GLASSES_AVOID = [
  "Overly narrow frames",
  "Oversized thick rims",
  "Extremely angular frames",
  "Low-bridge poor-fit frames",
];

const DEFAULT_HAIR_STYLES = [
  "Soft layered lob",
  "Shoulder-length waves",
  "Face-framing layers",
  "Textured long bob",
  "Side-parted medium cut",
];

const DEFAULT_HAIR_LENGTHS = ["Short", "Medium", "Long"];

const DEFAULT_HAIR_COLORS = [
  { name: "Warm Brown", hex: "#6F4E37", description: "Adds natural depth with soft contrast" },
  { name: "Chestnut", hex: "#7B4A2E", description: "Enhances warmth and dimension" },
  { name: "Soft Black", hex: "#2D2A28", description: "Creates polished definition" },
  { name: "Honey Brown", hex: "#A66A3F", description: "Brightens complexion gently" },
  { name: "Muted Copper", hex: "#A3563A", description: "Adds warmth without harshness" },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const AnyObject = z.record(z.unknown());

function asObject(value: unknown): Record<string, unknown> {
  const parsed = AnyObject.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function asString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return clamp(value, min, max);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeHex(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (HEX_RE.test(raw)) return raw.toUpperCase();
  return fallback;
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter((item) => item.length > 0)));
}

function takeOrPad<T>(items: T[], count: number, fallbackFactory: (index: number) => T): T[] {
  const out = items.slice(0, count);
  while (out.length < count) {
    out.push(fallbackFactory(out.length));
  }
  return out;
}

export function normalizeFaceShape(input: unknown): FaceShapeResult {
  const obj = asObject(input);
  const shapeRaw = asString(obj.shape, "Soft Oval");
  const shape = FACE_SHAPES.includes(shapeRaw as FaceShape) ? (shapeRaw as FaceShape) : "Soft Oval";

  const traitsRaw = asArray(obj.traits)
    .map((item) => asString(item, ""))
    .filter((item) => item.length > 0);
  const traits = takeOrPad(uniqueStrings(traitsRaw), 3, (index) => [
    "Balanced proportions",
    "Natural harmony",
    "Soft structural features",
  ][index] ?? "Stylable features").slice(0, 5);

  return {
    shape,
    traits,
    confidence: asNumber(obj.confidence, 0.6, 0, 1),
  };
}

export function normalizeColorAnalysis(input: unknown): ColorAnalysisResult {
  const obj = asObject(input);

  const seasonRaw = asString(obj.season, "Soft Autumn");
  const season = COLOR_SEASONS.includes(seasonRaw as (typeof COLOR_SEASONS)[number])
    ? (seasonRaw as ColorAnalysisResult["season"])
    : "Soft Autumn";

  const undertoneRaw = asString(obj.undertone, "Neutral");
  const undertone = UNDERTONES.includes(undertoneRaw as (typeof UNDERTONES)[number])
    ? (undertoneRaw as ColorAnalysisResult["undertone"])
    : "Neutral";

  const paletteRaw = asArray(obj.palette)
    .map((item) => {
      const color = asObject(item);
      return {
        name: asString(color.name, "Palette Color"),
        hex: normalizeHex(color.hex, "#888888"),
      };
    })
    .filter((item) => item.hex !== "#888888");

  const avoidRaw = asArray(obj.avoidColors)
    .map((item) => {
      const color = asObject(item);
      return {
        name: asString(color.name, "Avoid Color"),
        hex: normalizeHex(color.hex, "#888888"),
      };
    })
    .filter((item) => item.hex !== "#888888");

  const metals = uniqueStrings(
    asArray(obj.metals)
      .map((item) => asString(item, ""))
      .filter((item) => METALS.includes(item as (typeof METALS)[number])),
  ) as ColorAnalysisResult["metals"];

  return {
    season,
    undertone,
    description: asString(
      obj.description,
      "Your coloring supports soft contrast and balanced tones with a refined, natural finish.",
    ),
    palette: takeOrPad(paletteRaw, 8, (index) => DEFAULT_PALETTE[index]),
    metals: metals.length > 0 ? metals : ["Gold", "Rose Gold"],
    avoidColors: takeOrPad(avoidRaw, 3, (index) => DEFAULT_AVOID_COLORS[index]).slice(0, 4),
  };
}

export function normalizeSkinAnalysis(input: unknown): SkinAnalysisResult {
  const obj = asObject(input);
  const typeRaw = asString(obj.type, "Combination");
  const type = SKIN_TYPES.includes(typeRaw as (typeof SKIN_TYPES)[number])
    ? (typeRaw as SkinAnalysisResult["type"])
    : "Combination";

  const concerns = uniqueStrings(
    asArray(obj.concerns)
      .map((item) => asString(item, ""))
      .filter((item) => item.length > 0),
  ).slice(0, 6);

  const zones = asArray(obj.zones)
    .map((item) => {
      const zone = asObject(item);
      return {
        zone: asString(zone.zone, "T-Zone"),
        observation: asString(zone.observation, "No strong concern detected."),
      };
    })
    .slice(0, 6);

  const routineRaw = asArray(obj.routine)
    .map((item) => {
      const step = asObject(item);
      return {
        step: asString(step.step, "Step"),
        product: asString(step.product, "Gentle care product"),
      };
    });

  const routine = takeOrPad(routineRaw, 4, (index) => [
    { step: "Cleanse", product: "Gentle low-foam cleanser" },
    { step: "Treat", product: "Targeted serum based on concerns" },
    { step: "Moisturize", product: "Barrier-support moisturizer" },
    { step: "Protect", product: "Broad-spectrum SPF 50" },
  ][index]).slice(0, 6);

  return {
    type,
    concerns,
    zones,
    routine,
  };
}

export function normalizeFeatures(input: unknown): FeatureBreakdown {
  const obj = asObject(input);

  function normalizeFeature(key: string, fallbackShape: string): { shape: string; notes: string } {
    const node = asObject(obj[key]);
    return {
      shape: asString(node.shape, fallbackShape),
      notes: asString(node.notes, "Feature supports balanced styling choices."),
    };
  }

  return {
    eyes: normalizeFeature("eyes", "Almond"),
    nose: normalizeFeature("nose", "Straight"),
    lips: normalizeFeature("lips", "Balanced"),
    cheeks: normalizeFeature("cheeks", "Soft contour"),
  };
}

export function normalizeGlasses(input: unknown): GlassesResult {
  const obj = asObject(input);

  const goalsRaw = uniqueStrings(asArray(obj.goals).map((item) => asString(item, "")));
  const goals = takeOrPad(goalsRaw, 3, (index) => [
    "Maintain balance",
    "Add definition",
    "Highlight key features",
  ][index]);

  const recommendedRaw = asArray(obj.recommended).map((item) => {
    const rec = asObject(item);
    return {
      style: asString(rec.style, "Flattering frame"),
      reason: asString(rec.reason, "Complements your proportions and style goals."),
    };
  });
  const recommended = takeOrPad(recommendedRaw, 5, (index) => ({
    style: DEFAULT_GLASSES_STYLES[index],
    reason: "Provides balanced structure with everyday versatility.",
  }));

  const avoidRaw = asArray(obj.avoid).map((item) => {
    const node = asObject(item);
    return {
      style: asString(node.style, "Unflattering frame"),
      reason: asString(node.reason, "Can overemphasize proportions."),
    };
  });
  const avoid = takeOrPad(avoidRaw, 4, (index) => ({
    style: DEFAULT_GLASSES_AVOID[index],
    reason: "Can reduce visual balance for this face profile.",
  }));

  const colorsRaw = asArray(obj.colors).map((item) => {
    const color = asObject(item);
    return {
      name: asString(color.name, "Classic Tone"),
      hex: normalizeHex(color.hex, "#6B5B4D"),
    };
  });
  const colors = takeOrPad(colorsRaw, 5, (index) => ({
    name: DEFAULT_PALETTE[index].name,
    hex: DEFAULT_PALETTE[index].hex,
  }));

  const fitTips = takeOrPad(
    uniqueStrings(asArray(obj.fitTips).map((item) => asString(item, ""))),
    3,
    (index) => [
      "Align frame width close to cheekbone width.",
      "Keep pupil centered within each lens.",
      "Choose a bridge fit that prevents slipping.",
    ][index],
  ).slice(0, 5);

  return {
    goals,
    recommended,
    avoid,
    colors,
    fitTips,
  };
}

export function normalizeHairstyle(input: unknown): HairstyleResult {
  const obj = asObject(input);

  const stylesRaw = asArray(obj.styles).map((item) => {
    const style = asObject(item);
    return {
      name: asString(style.name, "Styled cut"),
      description: asString(style.description, "Adds harmony and manageable movement."),
    };
  });
  const styles = takeOrPad(stylesRaw, 5, (index) => ({
    name: DEFAULT_HAIR_STYLES[index],
    description: "Enhances balance while keeping styling practical.",
  }));

  const lengthsRaw = asArray(obj.lengths).map((item) => {
    const length = asObject(item);
    return {
      name: asString(length.name, "Length"),
      description: asString(length.description, "Works well with your feature proportions."),
    };
  });
  const lengths = takeOrPad(lengthsRaw, 3, (index) => ({
    name: DEFAULT_HAIR_LENGTHS[index],
    description: "Maintains structure and flexibility for everyday styling.",
  }));

  const colorsRaw = asArray(obj.colors).map((item) => {
    const color = asObject(item);
    return {
      name: asString(color.name, "Hair tone"),
      hex: normalizeHex(color.hex, DEFAULT_HAIR_COLORS[0].hex),
      description: asString(color.description, "Supports natural depth and contrast."),
    };
  });
  const colors = takeOrPad(colorsRaw, 5, (index) => DEFAULT_HAIR_COLORS[index]);

  const avoid = takeOrPad(
    uniqueStrings(asArray(obj.avoid).map((item) => asString(item, ""))),
    3,
    (index) => [
      "Overly blunt, heavy shapes without movement",
      "Extreme contrast color jumps",
      "Cuts that remove all face-framing softness",
    ][index],
  ).slice(0, 5);

  return {
    styles,
    lengths,
    colors,
    avoid,
  };
}

export function normalizeSummary(input: unknown): string {
  const obj = asObject(input);
  const summary = asString(obj.summary, "Your personalized style profile is ready.");
  return summary.slice(0, 1200);
}
