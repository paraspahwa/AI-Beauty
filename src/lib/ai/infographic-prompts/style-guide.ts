import type {
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  StyleGuideResult,
} from "@/types/report";

export const STYLE_GUIDE_PROMPT_VERSION = "style_guide_v2";

const STYLE_GUIDE_PROMPT_BASE = `Transform the uploaded photo into a luxury personal style analysis board.

Analyze the person's appearance, proportions, coloring, facial features, overall aesthetic, posture, clothing harmony, and visual presence.

Create a premium fashion stylist consultation board similar to what a celebrity stylist, luxury personal shopper, image consultant, or fashion magazine would deliver.

DESIGN STYLE

- Editorial fashion magazine quality
- Luxury beige, cream, ivory, and warm neutral palette
- Sophisticated typography
- Premium Pinterest aesthetic
- Vogue-inspired styling board
- Elegant luxury layout
- Fashion consultant presentation
- Clean grid-based infographic
- High-end visual merchandising style

MAIN TITLE

"Style Analysis Board"

Subtitle:
"Timeless • Refined • Confident"

------------------------------------------------

STYLE CATEGORIES

Generate visual examples representing:

- Old Money
- Quiet Luxury
- Boho Chic
- Glamour
- Minimalist
- Classic Elegant
- Romantic
- Feminine Chic
- Street Style
- Sport Chic
- Casual Effortless
- Business Chic
- Edgy Avant-Garde
- Soft Girl / Coquette

Display each category as a fashion inspiration thumbnail.

------------------------------------------------

YOUR VIBE

Generate a personalized style personality section.

Possible traits:

- Sophisticated
- Effortless
- Refined
- Feminine
- Modern
- Elegant
- Magnetic
- Confident
- Creative
- Soft
- Timeless

Highlight the strongest matching traits.

------------------------------------------------

BEST STYLE MATCHES

Rank the top five styles.

Display:

1. Primary Style Identity
2. Secondary Style Identity
3. Third Style Influence
4. Fourth Style Influence
5. Fifth Style Influence

Include representative outfit imagery.

------------------------------------------------

MAIN HERO IMAGE

Place the user prominently in the center.

Transform clothing into a luxury editorial fashion look aligned with the recommended style identity.

Maintain facial identity exactly.

Fashion photography quality.

------------------------------------------------

COLOR PALETTE

Recommended clothing colors.

Display swatches for:

- Neutrals
- Accent colors
- Seasonal colors
- Statement colors

Add a separate section:

"Colors To Avoid"

------------------------------------------------

BODY SILHOUETTE GUIDE

Analyze proportions and suggest silhouettes.

Examples:

- Structured Tailoring
- Relaxed Tailoring
- Fitted Waist
- Long Vertical Lines
- Soft Draping
- Balanced Proportions

Use elegant fashion illustrations.

------------------------------------------------

KEY WARDROBE PIECES

Generate wardrobe essentials.

Examples:

- Blazer
- Tailored Trousers
- Silk Top
- White Shirt
- Knitwear
- Trench Coat
- Jeans
- Midi Dress
- Leather Jacket
- Timeless Handbag

Display realistic product-style visuals.

------------------------------------------------

YOU IN YOUR STYLES

Generate multiple realistic outfit simulations.

Show the same person wearing:

- Quiet Luxury Outfit
- Classic Elegant Outfit
- Feminine Chic Outfit
- Minimalist Outfit
- Soft Glam Outfit
- Business Chic Outfit
- Casual Luxury Outfit
- Evening Elegant Outfit

Preserve identity exactly.

Photorealistic styling.

------------------------------------------------

ACCESSORIES

Recommend:

- Jewelry
- Watches
- Sunglasses
- Belts
- Handbags
- Shoes

Generate realistic luxury accessory visuals.

------------------------------------------------

CAPSULE WARDROBE

Create mini wardrobe capsules for:

- Work
- Casual
- Date Night
- Travel
- Weekend

Display coordinated pieces.

------------------------------------------------

STYLE NOTES

Provide personalized observations such as:

- Best fabrics
- Best outfit structure
- Ideal neckline styles
- Ideal layering techniques
- Recommended textures
- Best accessory approach

------------------------------------------------

OVERALL STYLE IDENTITY

Generate a final luxury summary.

Examples:

"Soft Glam + Elegant"
"Quiet Luxury + Classic Feminine"
"Modern Minimalist + Sophisticated"
"Old Money + Refined Chic"

Include a short styling description.

------------------------------------------------

VISUAL REQUIREMENTS

- Luxury fashion consultant report
- Vogue editorial quality
- Pinterest premium aesthetic
- High-end personal shopper dossier
- Magazine-quality infographic
- Consistent fashion branding
- Photorealistic outfit transformations
- Elegant luxury design
- Ultra detailed clothing rendering
- Premium styling presentation

OUTPUT

Large vertical infographic
High resolution
Poster quality
Print-ready
Luxury fashion consultation board

Brand Style:
- Soft beige background (#F5F0EA)
- Warm neutral palette
- Elegant serif title
- Minimal luxury infographic
- Thin divider lines
- Rounded cards
- Subtle shadows
- Beauty consultation report aesthetic
- Pinterest-quality design
- Premium editorial layout
- Consistent icon set
- High-end personal styling report

CRITICAL: Use the uploaded full-body photo as the primary visual reference. Preserve the person's facial identity and body proportions exactly in the hero image and every outfit simulation. Do NOT re-analyze coloring or face shape — use the authoritative pipeline data below for all text, rankings, swatches, and recommendations. Layout and photorealistic styling visualization only. Render as ONE finished infographic image. No watermarks. No markdown.`;

const VIBE_TRAITS = [
  "Sophisticated",
  "Effortless",
  "Refined",
  "Feminine",
  "Modern",
  "Elegant",
  "Magnetic",
  "Confident",
  "Creative",
  "Soft",
  "Timeless",
] as const;

const STYLE_CATEGORIES = [
  "Old Money",
  "Quiet Luxury",
  "Boho Chic",
  "Glamour",
  "Minimalist",
  "Classic Elegant",
  "Romantic",
  "Feminine Chic",
  "Street Style",
  "Sport Chic",
  "Casual Effortless",
  "Business Chic",
  "Edgy Avant-Garde",
  "Soft Girl / Coquette",
] as const;

const OUTFIT_SIMULATIONS = [
  "Quiet Luxury Outfit",
  "Classic Elegant Outfit",
  "Feminine Chic Outfit",
  "Minimalist Outfit",
  "Soft Glam Outfit",
  "Business Chic Outfit",
  "Casual Luxury Outfit",
  "Evening Elegant Outfit",
] as const;

const CAPSULE_CONTEXTS = ["Work", "Casual", "Date Night", "Travel", "Weekend"] as const;

function rankTopFiveStyles(styleGuide: StyleGuideResult): string[] {
  const ranked = [
    styleGuide.primaryStyle,
    ...styleGuide.secondaryStyles,
  ].filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const style of ranked) {
    const key = style.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(style);
    if (unique.length >= 5) break;
  }
  for (const cat of STYLE_CATEGORIES) {
    if (unique.length >= 5) break;
    if (!seen.has(cat.toLowerCase())) {
      seen.add(cat.toLowerCase());
      unique.push(cat);
    }
  }
  return unique.slice(0, 5);
}

function buildPipelineDataAppendix(
  styleGuide: StyleGuideResult,
  color: ColorAnalysisResult,
  faceShape: FaceShapeResult,
  features: FeatureBreakdown,
  summary?: string,
): string {
  const topStyles = rankTopFiveStyles(styleGuide);
  const rankLabels = [
    "Primary Style Identity",
    "Secondary Style Identity",
    "Third Style Influence",
    "Fourth Style Influence",
    "Fifth Style Influence",
  ];
  const metals = color.metals.length ? color.metals : ["Gold", "Rose Gold", "Silver"];
  const neutrals = styleGuide.colorDirection.neutrals.length
    ? styleGuide.colorDirection.neutrals
    : color.palette.slice(0, 4).map((c) => `${c.name} (${c.hex})`);
  const accents = styleGuide.colorDirection.accents.length
    ? styleGuide.colorDirection.accents
    : color.palette.slice(4, 8).map((c) => `${c.name} (${c.hex})`);
  const seasonal = color.palette.slice(0, 6).map((c) => `${c.name} (${c.hex})`);
  const statement = color.palette.slice(6, 9).map((c) => `${c.name} (${c.hex})`);
  const avoid = color.avoidColors.slice(0, 6).map((c) => `${c.name} (${c.hex})`);

  const categoryLines = STYLE_CATEGORIES.map((c) => {
    const rank = topStyles.indexOf(c);
    const mark = rank === 0 ? " ★ PRIMARY" : rank > 0 ? ` (Top ${rank + 1})` : "";
    return `  - ${c}${mark} — fashion inspiration thumbnail`;
  });

  const vibeLines = VIBE_TRAITS.map((t) => {
    const mark = styleGuide.vibeTraits.includes(t) ? " ★ HIGHLIGHT" : "";
    return `  - ${t}${mark}`;
  });

  const rankLines = topStyles.map((s, i) =>
    `  ${i + 1}. ${rankLabels[i]}: ${s} — representative outfit imagery`,
  );

  const wardrobe = styleGuide.wardrobeEssentials.length
    ? styleGuide.wardrobeEssentials
    : [
        "Blazer",
        "Tailored Trousers",
        "Silk Top",
        "White Shirt",
        "Knitwear",
        "Trench Coat",
        "Jeans",
        "Midi Dress",
        "Leather Jacket",
        "Timeless Handbag",
      ];

  const silhouettes = styleGuide.silhouettes.length
    ? styleGuide.silhouettes
    : [
        "Structured Tailoring",
        "Relaxed Tailoring",
        "Fitted Waist",
        "Long Vertical Lines",
        "Soft Draping",
        "Balanced Proportions",
      ];

  const identityLabel = `${styleGuide.primaryStyle} + ${styleGuide.secondaryStyles[0] ?? "Refined"}`;

  return [
    "",
    "=== AUTHORITATIVE ANALYSIS DATA (use verbatim — do not contradict) ===",
    `Face shape: ${faceShape.shape}`,
    faceShape.traits.length ? `Proportions: ${faceShape.traits.join("; ")}` : "",
    `Seasonal coloring: ${color.season} (${color.undertone} undertone)`,
    color.description ? `Color harmony: ${color.description}` : "",
    color.clothingObservation
      ? `Current clothing harmony: ${color.clothingObservation.color} — ${color.clothingObservation.effect}`
      : "",
    summary ? `Stylist summary: ${summary}` : "",
    `Eyes: ${features.eyes.shape} | Lips: ${features.lips.shape} | Cheeks: ${features.cheeks.shape}`,
    `Primary style: ${styleGuide.primaryStyle}`,
    styleGuide.secondaryStyles.length
      ? `Secondary styles: ${styleGuide.secondaryStyles.join(", ")}`
      : "",
    "",
    "STYLE CATEGORIES — mark ranked matches:",
    ...categoryLines,
    "",
    "YOUR VIBE — highlight strongest traits:",
    ...vibeLines,
    "",
    "BEST STYLE MATCHES — use these exact rankings:",
    ...rankLines,
    "",
    `MAIN HERO: Transform clothing into "${topStyles[0]}" luxury editorial look. Preserve identity exactly.`,
    "",
    "COLOR PALETTE swatches:",
    `Neutrals: ${neutrals.join(", ")}`,
    `Accent colors: ${accents.join(", ")}`,
    `Seasonal colors: ${seasonal.join(", ")}`,
    statement.length ? `Statement colors: ${statement.join(", ")}` : "",
    avoid.length ? `Colors To Avoid: ${avoid.join(", ")}` : "",
    "",
    "BODY SILHOUETTE GUIDE:",
    ...silhouettes.map((s) => `  - ${s}`),
    "",
    "KEY WARDROBE PIECES:",
    ...wardrobe.map((w) => `  - ${w}`),
    "",
    "YOU IN YOUR STYLES — same person, photorealistic:",
    ...OUTFIT_SIMULATIONS.map(
      (o, i) => `  ${i + 1}. ${o} — preserve identity exactly`,
    ),
    "",
    `ACCESSORIES: Jewelry (${metals.join(", ")} metals), Watches, Sunglasses, Belts, Handbags, Shoes`,
    "",
    "CAPSULE WARDROBE:",
    ...CAPSULE_CONTEXTS.map((ctx) => `  - ${ctx}: 4–5 coordinated pieces in recommended palette`),
    "",
    "STYLE NOTES:",
    ...styleGuide.styleNotes.map((n) => `  - ${n}`),
    "",
    "OVERALL STYLE IDENTITY:",
    `"${identityLabel}"`,
    styleGuide.identitySummary,
    "",
    "CRITICAL: Preserve identity exactly. One finished vertical infographic only.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildStyleGuideInfographicPrompt(
  styleGuide: StyleGuideResult,
  color: ColorAnalysisResult,
  faceShape: FaceShapeResult,
  features: FeatureBreakdown,
  summary?: string,
): string {
  return (
    STYLE_GUIDE_PROMPT_BASE +
    buildPipelineDataAppendix(styleGuide, color, faceShape, features, summary)
  );
}
