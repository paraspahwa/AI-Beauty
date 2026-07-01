import { describe, expect, it } from "vitest";
import { styleGuideNeedsGeneration, type StyleGuideReportRow } from "./run-style-guide-infographic";

const baseRow: StyleGuideReportRow = {
  id: "report-1",
  user_id: "user-1",
  status: "ready",
  is_style_guide_paid: true,
  body_image_path: "user-1/body.jpg",
  style_guide: null,
  face_shape: { shape: "Oval", traits: ["Balanced"], confidence: 0.9 },
  color_analysis: {
    season: "Soft Autumn",
    undertone: "Warm",
    description: "Warm",
    palette: [],
    metals: [],
    avoidColors: [],
  },
  features: {
    eyes: { shape: "Almond", notes: "" },
    eyebrows: { shape: "Soft", notes: "" },
    nose: { shape: "Straight", notes: "" },
    lips: { shape: "Full", notes: "" },
    cheeks: { shape: "Soft", notes: "" },
  },
  visual_assets: undefined,
};

describe("styleGuideNeedsGeneration", () => {
  it("returns true when paid with body photo but no style_guide yet", () => {
    expect(styleGuideNeedsGeneration(baseRow)).toBe(true);
  });

  it("returns false when add-on is not purchased", () => {
    expect(styleGuideNeedsGeneration({ ...baseRow, is_style_guide_paid: false })).toBe(false);
  });

  it("returns false when body photo is missing", () => {
    expect(styleGuideNeedsGeneration({ ...baseRow, body_image_path: null })).toBe(false);
  });
});
