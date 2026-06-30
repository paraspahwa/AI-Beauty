import { describe, it, expect } from "vitest";
import {
  buildStyleGuideInfographicPrompt,
  STYLE_GUIDE_PROMPT_VERSION,
} from "@/lib/ai/infographic-prompts/style-guide";
import type {
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  StyleGuideResult,
} from "@/types/report";

const styleGuide: StyleGuideResult = {
  primaryStyle: "Quiet Luxury",
  secondaryStyles: ["Classic Elegant", "Minimalist"],
  vibeTraits: ["Refined", "Effortless"],
  wardrobeEssentials: ["Blazer", "Silk Top"],
  silhouettes: ["Balanced Proportions", "Fitted Waist"],
  colorDirection: { neutrals: ["Ivory", "Camel"], accents: ["Burgundy"] },
  styleNotes: ["Prefer structured tailoring"],
  identitySummary: "Polished and intentional.",
};

const color: ColorAnalysisResult = {
  season: "Soft Autumn",
  undertone: "Warm",
  description: "Warm muted tones",
  palette: [
    { name: "Camel", hex: "#C19A6B" },
    { name: "Burgundy", hex: "#800020" },
  ],
  metals: ["Gold"],
  avoidColors: [{ name: "Neon Pink", hex: "#FF69B4" }],
};

const faceShape: FaceShapeResult = {
  shape: "Oval",
  traits: ["Balanced"],
  confidence: 0.9,
};

const features: FeatureBreakdown = {
  eyes: { shape: "Almond", notes: "" },
  eyebrows: { shape: "Arched", notes: "" },
  nose: { shape: "Straight", notes: "" },
  lips: { shape: "Full", notes: "" },
  cheeks: { shape: "High", notes: "" },
};

describe("buildStyleGuideInfographicPrompt", () => {
  it("uses the luxury style board base prompt", () => {
    const prompt = buildStyleGuideInfographicPrompt(styleGuide, color, faceShape, features);
    expect(STYLE_GUIDE_PROMPT_VERSION).toBe("style_guide_v2");
    expect(prompt).toContain("Style Analysis Board");
    expect(prompt).toContain("Timeless • Refined • Confident");
    expect(prompt).toContain("Old Money");
    expect(prompt).toContain("YOU IN YOUR STYLES");
    expect(prompt).toContain("Colors To Avoid");
    expect(prompt).toContain("Soft beige background (#F5F0EA)");
  });

  it("includes authoritative pipeline data", () => {
    const prompt = buildStyleGuideInfographicPrompt(styleGuide, color, faceShape, features);
    expect(prompt).toContain("AUTHORITATIVE ANALYSIS DATA");
    expect(prompt).toContain("Quiet Luxury");
    expect(prompt).toContain("Classic Elegant");
    expect(prompt).toContain("Primary Style Identity");
    expect(prompt).toContain("Balanced Proportions");
    expect(prompt).toContain("Polished and intentional.");
    expect(prompt).toContain("Soft Autumn");
    expect(prompt).toContain("Neon Pink");
    expect(prompt).toContain("★ HIGHLIGHT");
  });
});
