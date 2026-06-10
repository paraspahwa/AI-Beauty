import type { FalHairColor } from "@/lib/ai/hair-transfer";

/** Maps guest hair preset variants to FAL hair-change API params. */

export const GUEST_HAIR_PRESETS: Record<string, { hair_color: FalHairColor; target_hairstyle: string }> = {
  hair: { hair_color: "natural", target_hairstyle: "long_hair" },
  blonde: { hair_color: "blonde", target_hairstyle: "long_hair" },
  brunette: { hair_color: "dark_brown", target_hairstyle: "medium_long_hair" },
  auburn: { hair_color: "auburn", target_hairstyle: "wavy_hair" },
  burgundy: { hair_color: "red", target_hairstyle: "bob_cut" },
};

export function resolveGuestHairParams(variant?: string): { hair_color: FalHairColor; target_hairstyle: string } {
  if (variant && GUEST_HAIR_PRESETS[variant]) return GUEST_HAIR_PRESETS[variant];
  return GUEST_HAIR_PRESETS.hair;
}
