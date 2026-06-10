import type { FalHairColor } from "@/lib/ai/hair-transfer";

/** FAL `ImageAppsV2HairChangeInput.target_hairstyle` enum values. */
export type FalTargetHairstyle =
  | "short_hair"
  | "medium_long_hair"
  | "long_hair"
  | "curly_hair"
  | "wavy_hair"
  | "high_ponytail"
  | "bun"
  | "bob_cut"
  | "pixie_cut"
  | "braids"
  | "straight_hair"
  | "afro"
  | "dreadlocks"
  | "buzz_cut"
  | "mohawk"
  | "bangs"
  | "side_part"
  | "middle_part";

export type GuestHairParams = {
  hair_color: FalHairColor;
  target_hairstyle: FalTargetHairstyle;
};

/** Maps guest hair preset variants to FAL hair-change API params. */
export const GUEST_HAIR_PRESETS: Record<string, GuestHairParams> = {
  hair: { hair_color: "natural", target_hairstyle: "long_hair" },
  blonde: { hair_color: "blonde", target_hairstyle: "long_hair" },
  brunette: { hair_color: "dark_brown", target_hairstyle: "medium_long_hair" },
  auburn: { hair_color: "auburn", target_hairstyle: "wavy_hair" },
  burgundy: { hair_color: "red", target_hairstyle: "bob_cut" },
};

export function resolveGuestHairParams(variant?: string): GuestHairParams {
  if (variant && GUEST_HAIR_PRESETS[variant]) return GUEST_HAIR_PRESETS[variant];
  return GUEST_HAIR_PRESETS.hair;
}
