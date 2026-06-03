import {
  HAIR_STYLE_OPTIONS,
  isHairStyleAllowedForGender,
  type HairGender,
  type HairStyleValue,
} from "@/lib/hair-options";

export type FalHairColor =
  | "blonde" | "black" | "auburn" | "red" | "silver"
  | "blue" | "purple" | "pink" | "green"
  | "dark_brown" | "light_brown" | "platinum_blonde"
  | "gray" | "rainbow" | "natural" | "highlights" | "ombre" | "balayage";

export type HairTransferVisionResult = {
  styleName?: string;
  colorName?: string;
  detectedLook?: string;
};

export type HairTransferControls = {
  styleName: HairStyleValue;
  colorName: FalHairColor;
  detectedLook: string;
};

const DEFAULT_DETECTED_LOOK = "AI-matched hairstyle look";

const STYLE_ALIASES: Record<string, HairStyleValue> = {
  "no change": "No change",
  "none": "No change",
  "keep": "No change",
  "short hair": "short_hair",
  "medium long hair": "medium_long_hair",
  "medium-long hair": "medium_long_hair",
  "long hair": "long_hair",
  "curly hair": "curly_hair",
  "wavy hair": "wavy_hair",
  "high ponytail": "high_ponytail",
  "pony tail": "high_ponytail",
  "ponytail": "high_ponytail",
  "bun": "bun",
  "bob": "bob_cut",
  "bob cut": "bob_cut",
  "pixie": "pixie_cut",
  "pixie cut": "pixie_cut",
  "braid": "braids",
  "braids": "braids",
  "straight": "straight_hair",
  "straight hair": "straight_hair",
};

const COLOR_ALIASES: Record<string, FalHairColor> = {
  "natural": "natural",
  "black": "black",
  "jet black": "black",
  "dark brown": "dark_brown",
  "brunette": "dark_brown",
  "brown": "dark_brown",
  "light brown": "light_brown",
  "caramel": "light_brown",
  "blonde": "blonde",
  "platinum blonde": "platinum_blonde",
  "platinum": "platinum_blonde",
  "auburn": "auburn",
  "red": "red",
  "silver": "silver",
  "grey": "gray",
  "gray": "gray",
  "blue": "blue",
  "green": "green",
  "purple": "purple",
  "pink": "pink",
  "rainbow": "rainbow",
  "highlights": "highlights",
  "ombre": "ombre",
  "balayage": "balayage",
};

const REPLICATE_STYLE_MAP: Record<Exclude<HairStyleValue, "No change">, string> = {
  "short_hair": "Straight",
  "medium_long_hair": "Layered",
  "long_hair": "Straight",
  "curly_hair": "Curly",
  "wavy_hair": "Wavy",
  "high_ponytail": "High Ponytail",
  "bun": "Messy Bun",
  "bob_cut": "Bob",
  "pixie_cut": "Pixie Cut",
  "braids": "Box Braids",
  "straight_hair": "Straight",
};

const HAIR_COLOR_ENUM_MAP: Record<string, string> = {
  "blonde": "Blonde",
  "golden blonde": "Golden Blonde",
  "honey blonde": "Honey Blonde",
  "ash blonde": "Ash Blonde",
  "platinum blonde": "Platinum Blonde",
  "strawberry blonde": "Strawberry Blonde",
  "brunette": "Brunette",
  "black": "Black",
  "jet black": "Jet Black",
  "blue-black": "Blue-Black",
  "dark brown": "Dark Brown",
  "medium brown": "Medium Brown",
  "light brown": "Light Brown",
  "ash brown": "Ash Brown",
  "chestnut": "Chestnut",
  "caramel": "Caramel",
  "auburn": "Auburn",
  "copper": "Copper",
  "red": "Red",
  "mahogany": "Mahogany",
  "burgundy": "Burgundy",
  "silver": "Silver",
  "white": "White",
  "titanium": "Titanium",
  "rose gold": "Rose Gold",
  "blue": "Blue",
  "purple": "Purple",
  "pink": "Pink",
  "green": "Green",
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function clampAscii(value: string, max = 120): string {
  const ascii = value.replace(/[^\x20-\x7E]/g, "").trim();
  return ascii.slice(0, max);
}

function normalizeHairStyle(raw: unknown): HairStyleValue {
  const text = normalizeText(raw);
  if (!text) return "No change";

  const direct = STYLE_ALIASES[text];
  if (direct) return direct;

  const snake = text.replace(/\s+/g, "_");
  const option = HAIR_STYLE_OPTIONS.find((item) => item.value === snake);
  return option?.value ?? "No change";
}

function normalizeHairColor(raw: unknown): FalHairColor {
  const text = normalizeText(raw);
  if (!text) return "natural";

  if (COLOR_ALIASES[text]) return COLOR_ALIASES[text];

  for (const [alias, color] of Object.entries(COLOR_ALIASES)) {
    if (text.includes(alias) || alias.includes(text)) return color;
  }

  return "natural";
}

export function mapVisionToHairTransferControls(
  vision: HairTransferVisionResult | null | undefined,
  detectedGender: HairGender,
): HairTransferControls {
  let styleName = normalizeHairStyle(vision?.styleName);
  if (!isHairStyleAllowedForGender(styleName, detectedGender)) {
    styleName = "No change";
  }

  const colorName = normalizeHairColor(vision?.colorName);
  const detectedLookRaw = typeof vision?.detectedLook === "string" ? vision.detectedLook : "";

  return {
    styleName,
    colorName,
    detectedLook: clampAscii(detectedLookRaw) || DEFAULT_DETECTED_LOOK,
  };
}

export function mapToReplicateHairStyle(styleName: HairStyleValue): string {
  if (styleName === "No change") return "No change";
  return REPLICATE_STYLE_MAP[styleName] ?? styleName;
}

export function mapToReplicateHairColorEnum(colorName: string): string {
  const key = normalizeText(colorName);
  if (!key) return "Natural";
  if (HAIR_COLOR_ENUM_MAP[key]) return HAIR_COLOR_ENUM_MAP[key];

  for (const [k, value] of Object.entries(HAIR_COLOR_ENUM_MAP)) {
    if (key.includes(k) || k.includes(key)) return value;
  }

  return key.split(" ").map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join(" ");
}
