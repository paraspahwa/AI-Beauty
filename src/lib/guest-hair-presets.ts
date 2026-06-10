/** Maps guest hair preset variants to FAL hair-change API params. */

export const GUEST_HAIR_PRESETS: Record<string, { hair_color: string; hairstyle: string }> = {
  hair: { hair_color: "natural", hairstyle: "layered" },
  blonde: { hair_color: "blonde", hairstyle: "long_hair" },
  brunette: { hair_color: "brunette", hairstyle: "medium_long_hair" },
  auburn: { hair_color: "auburn", hairstyle: "wavy_hair" },
  burgundy: { hair_color: "burgundy", hairstyle: "bob_cut" },
};

export function resolveGuestHairParams(variant?: string): { hair_color: string; hairstyle: string } {
  if (variant && GUEST_HAIR_PRESETS[variant]) return GUEST_HAIR_PRESETS[variant];
  return GUEST_HAIR_PRESETS.hair;
}
