import { describe, expect, it } from "vitest";
import { buildFaceFeaturesInfographicPrompt } from "@/lib/ai/infographic-prompts/face-features";
import { buildFaceShapePreviewPrompt } from "@/lib/ai/infographic-prompts/face-shape-preview";
import { buildHairstyleInfographicPrompt } from "@/lib/ai/infographic-prompts/hairstyle";
import { buildSpectaclesInfographicPrompt } from "@/lib/ai/infographic-prompts/spectacles";
import { buildColorInfographicPrompt } from "@/lib/ai/infographic-prompts/color";
import { buildHairColorInfographicPrompt } from "@/lib/ai/infographic-prompts/hair-color";
import { buildSkinInfographicPrompt } from "@/lib/ai/infographic-prompts/skin";
import type {
  ColorAnalysisResult,
  FaceShapeResult,
  FeatureBreakdown,
  GlassesResult,
  HairstyleResult,
  SkinAnalysisResult,
} from "@/types/report";

const faceShape: FaceShapeResult = {
  shape: "Soft Oval",
  traits: ["Balanced proportions", "Soft jawline"],
  confidence: 0.82,
};

const features: FeatureBreakdown = {
  eyes: { shape: "Almond", notes: "Medium size. Warm tilt." },
  eyebrows: { shape: "Natural arch", notes: "Medium thickness." },
  nose: { shape: "Straight", notes: "Rounded tip." },
  cheeks: { shape: "Soft", notes: "Subtle cheekbones." },
  lips: { shape: "Full", notes: "Defined cupid's bow." },
};

describe("buildFaceFeaturesInfographicPrompt", () => {
  it("includes base layout and pipeline data appendix", () => {
    const prompt = buildFaceFeaturesInfographicPrompt(faceShape, features);
    expect(prompt).toContain("Face Features Analysis");
    expect(prompt).toContain("AUTHORITATIVE ANALYSIS DATA");
    expect(prompt).toContain("Soft Oval");
    expect(prompt).toContain("Almond");
    expect(prompt).toContain("#F5F0EA");
  });
});

describe("buildFaceShapePreviewPrompt", () => {
  it("includes only face shape panel instructions", () => {
    const prompt = buildFaceShapePreviewPrompt(faceShape);
    expect(prompt).toContain("Soft Oval");
    expect(prompt).toContain("Do NOT include eyes");
    expect(prompt).not.toContain("AUTHORITATIVE ANALYSIS DATA");
  });
});

describe("buildHairstyleInfographicPrompt", () => {
  it("includes base layout and pipeline hairstyle data", () => {
    const hairstyle: HairstyleResult = {
      styles: [{ name: "Soft Layers", description: "Adds movement" }],
      lengths: [{ name: "Below Shoulder", description: "Most flattering" }],
      colors: [{ name: "Chestnut Brown", hex: "#6B3A2A", description: "Warm" }],
      avoid: ["Full Bangs"],
      stylingTips: ["Side part for balance"],
      hairType: "Wavy",
    };
    const prompt = buildHairstyleInfographicPrompt(faceShape, features, hairstyle);
    expect(prompt).toContain("Hairstyle Analysis");
    expect(prompt).toContain("AUTHORITATIVE ANALYSIS DATA");
    expect(prompt).toContain("Soft Layers");
    expect(prompt).toContain("✓ Recommended");
    expect(prompt).toContain("#F5F0EA");
  });
});

describe("buildSpectaclesInfographicPrompt", () => {
  it("includes base layout and pipeline glasses data", () => {
    const glasses: GlassesResult = {
      goals: ["Maintain balance", "Add definition"],
      recommended: [
        { style: "Cat-Eye", reason: "Adds lift" },
        { style: "Round", reason: "Softens angles" },
      ],
      avoid: [{ style: "Narrow", reason: "Too small for face" }],
      colors: [{ name: "Warm Tortoise", hex: "#8B5A2B" }],
      fitTips: ["Frame width should match face width"],
    };
    const prompt = buildSpectaclesInfographicPrompt(faceShape, glasses);
    expect(prompt).toContain("Spectacles Guide");
    expect(prompt).toContain("AUTHORITATIVE ANALYSIS DATA");
    expect(prompt).toContain("Cat-Eye");
    expect(prompt).toContain("Try-On: Flattering Styles");
    expect(prompt).toContain("#F5F0EA");
  });
});

describe("buildColorInfographicPrompt", () => {
  it("includes base layout and pipeline color data", () => {
    const color: ColorAnalysisResult = {
      season: "Soft Autumn",
      undertone: "Warm",
      description: "Muted warm tones flatter your natural coloring.",
      palette: [
        { name: "Olive Green", hex: "#6B7B4C" },
        { name: "Rust Orange", hex: "#B85C38" },
      ],
      metals: ["Gold", "Rose Gold"],
      avoidColors: [{ name: "Pure Black", hex: "#000000" }],
    };
    const prompt = buildColorInfographicPrompt(color);
    expect(prompt).toContain("Color Analysis");
    expect(prompt).toContain("AUTHORITATIVE ANALYSIS DATA");
    expect(prompt).toContain("Soft Autumn");
    expect(prompt).toContain("BEST COLORS");
    expect(prompt).toContain("#F5F0EA");
  });
});

describe("buildHairColorInfographicPrompt", () => {
  it("includes landscape layout and pipeline hair color data", () => {
    const color: ColorAnalysisResult = {
      season: "Soft Autumn",
      undertone: "Warm",
      description: "Warm muted tones suit your coloring.",
      palette: [{ name: "Caramel", hex: "#A67B4A" }],
      metals: ["Gold"],
      avoidColors: [{ name: "Ash Blonde", hex: "#C8B8A0" }],
    };
    const hairstyle: HairstyleResult = {
      styles: [{ name: "Soft Layers", description: "Movement" }],
      lengths: [{ name: "Long", description: "Flattering" }],
      colors: [{ name: "Warm Brown", hex: "#6F4E37", description: "Rich" }],
      avoid: ["Platinum"],
      hairType: "Wavy",
    };
    const prompt = buildHairColorInfographicPrompt(color, features, hairstyle);
    expect(prompt).toContain("HAIR COLOR ANALYSIS REPORT");
    expect(prompt).toContain("AUTHORITATIVE ANALYSIS DATA");
    expect(prompt).toContain("Warm Brown");
    expect(prompt).toContain("Landscape");
    expect(prompt).toContain("#FAF8F3");
  });
});

describe("buildSkinInfographicPrompt", () => {
  it("includes dermatology layout and pipeline skin data", () => {
    const skin: SkinAnalysisResult = {
      type: "Combination",
      concerns: [{ label: "Visible pores", severity: "mild", zone: "T-Zone" }],
      zones: [
        { zone: "T-Zone", observation: "Slightly oily" },
        { zone: "Cheeks", observation: "Normal hydration" },
      ],
      routine: {
        am: [{ step: "Cleanser", product: "Gentle foaming cleanser" }],
        pm: [{ step: "Moisturizer", product: "Lightweight gel" }],
      },
    };
    const prompt = buildSkinInfographicPrompt(skin);
    expect(prompt).toContain("SKIN ANALYSIS");
    expect(prompt).toContain("AUTHORITATIVE ANALYSIS DATA");
    expect(prompt).toContain("Combination");
    expect(prompt).toContain("SKIN TYPE COMPARISON");
    expect(prompt).toContain("#FAF8F3");
  });
});
