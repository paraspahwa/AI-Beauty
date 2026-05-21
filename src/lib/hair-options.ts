export type HairGender = "none" | "male" | "female";

export const HAIR_STYLE_OPTIONS = [
  { value: "No change", label: "No change (color only)" },
  { value: "short_hair", label: "Short Hair" },
  { value: "medium_long_hair", label: "Medium-Long Hair" },
  { value: "long_hair", label: "Long Hair" },
  { value: "curly_hair", label: "Curly Hair" },
  { value: "wavy_hair", label: "Wavy Hair" },
  { value: "high_ponytail", label: "High Ponytail" },
  { value: "bun", label: "Bun" },
  { value: "bob_cut", label: "Bob Cut" },
  { value: "pixie_cut", label: "Pixie Cut" },
  { value: "braids", label: "Braids" },
  { value: "straight_hair", label: "Straight Hair" },
] as const;

export type HairStyleValue = (typeof HAIR_STYLE_OPTIONS)[number]["value"];

const MALE_STYLES = new Set<HairStyleValue>([
  "No change",
  "short_hair",
  "medium_long_hair",
  "curly_hair",
  "wavy_hair",
  "straight_hair",
]);

const FEMALE_STYLES = new Set<HairStyleValue>([
  "No change",
  "medium_long_hair",
  "long_hair",
  "curly_hair",
  "wavy_hair",
  "high_ponytail",
  "bun",
  "bob_cut",
  "pixie_cut",
  "braids",
  "straight_hair",
]);

export function normalizeRekognitionGender(rekognition: unknown): HairGender {
  if (
    rekognition &&
    typeof rekognition === "object" &&
    "Gender" in rekognition &&
    typeof (rekognition as Record<string, unknown>).Gender === "object"
  ) {
    const val = ((rekognition as Record<string, unknown>).Gender as Record<string, unknown>).Value;
    if (typeof val === "string") {
      const normalized = val.trim().toLowerCase();
      if (normalized === "male") return "male";
      if (normalized === "female") return "female";
    }
  }
  return "none";
}

export function getHairStyleOptionsForGender(gender: HairGender): ReadonlyArray<{ value: HairStyleValue; label: string }> {
  if (gender === "male") return HAIR_STYLE_OPTIONS.filter((opt) => MALE_STYLES.has(opt.value));
  if (gender === "female") return HAIR_STYLE_OPTIONS.filter((opt) => FEMALE_STYLES.has(opt.value));
  return HAIR_STYLE_OPTIONS;
}

export function isHairStyleAllowedForGender(style: string, gender: HairGender): style is HairStyleValue {
  const match = HAIR_STYLE_OPTIONS.find((opt) => opt.value === style);
  if (!match) return false;
  if (gender === "male") return MALE_STYLES.has(match.value);
  if (gender === "female") return FEMALE_STYLES.has(match.value);
  return true;
}
