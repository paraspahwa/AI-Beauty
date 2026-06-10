import type { FalHairColor } from "@/lib/ai/hair-transfer";

/** Maps guest hair preset variants to FAL hair-change API params. */

export const GUEST_HAIR_PRESETS: Record<string, { hair_color: FalHairColor; hair_style: string }> = {
  hair: { hair_color: "natural", hair_style: "long_hair" },
  blonde: { hair_color: "blonde", hair_style: "long_hair" },
  brunette: { hair_color: "dark_brown", hair_style: "medium_long_hair" },
  auburn: { hair_color: "auburn", hair_style: "wavy_hair" },
  burgundy: { hair_color: "red", hair_style: "bob_cut" },
};

export function resolveGuestHairParams(variant?: string): { hair_color: FalHairColor; hair_style: string } {
  if (variant && GUEST_HAIR_PRESETS[variant]) return GUEST_HAIR_PRESETS[variant];
  return GUEST_HAIR_PRESETS.hair;
}
