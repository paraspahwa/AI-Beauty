/**
 * Makeup look metadata — shared between server (replicate-makeup.ts) and
 * client components (MakeupCard.tsx).
 *
 * Kept in a plain module with no heavy imports so it is safe to use in
 * both "use client" components and server-only generation helpers.
 */

export type MakeupLook = {
  index: number;
  label: string;
  description: string;
};

export const MAKEUP_LOOKS: MakeupLook[] = [
  {
    index: 0,
    label: "Everyday Natural",
    description: "Light coverage, natural lip tint and soft blush",
  },
  {
    index: 1,
    label: "Bold Lip",
    description: "Statement lip color, defined brows, minimal eye",
  },
  {
    index: 2,
    label: "Smoky Eye",
    description: "Complementary eyeshadow, mascara, nude lip",
  },
  {
    index: 3,
    label: "Full Glam",
    description: "Lip color, eyeshadow, blush, and highlight",
  },
];
