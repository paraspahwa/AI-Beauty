import { describe, expect, it } from "vitest";
import {
  previewNeedsGeneration,
  sectionsNeedingGeneration,
  type InfographicReportRow,
} from "./run-analysis-infographics";

const baseRow: InfographicReportRow = {
  id: "report-1",
  user_id: "user-1",
  status: "ready",
  is_paid: true,
  image_path: "user-1/selfie.jpg",
  face_shape: { shape: "Oval", traits: ["Balanced"], confidence: 0.9 },
  features: {
    eyes: { shape: "Almond", notes: "" },
    eyebrows: { shape: "Soft", notes: "" },
    nose: { shape: "Straight", notes: "" },
    lips: { shape: "Full", notes: "" },
    cheeks: { shape: "Soft", notes: "" },
  },
  skin_analysis: {
    type: "Normal",
    concerns: [],
    routine: { am: [], pm: [] },
    description: "Balanced",
  },
  hairstyle: {
    styles: [],
    lengths: [],
    colors: [],
    avoid: [],
  },
  glasses: {
    recommended: [],
    avoid: [],
    fitTips: [],
  },
  color_analysis: {
    season: "Soft Autumn",
    undertone: "Warm",
    description: "Warm",
    palette: [],
    metals: [],
    avoidColors: [],
  },
  visual_assets: {
    version: 1,
    bucket: "selfies",
    basePath: "user-1/report-1/visuals/v1/",
    assets: {
      analysisInfographics: {
        skin: { path: "x", status: "pending", mime: "image/png" },
      },
    },
  },
};

describe("sectionsNeedingGeneration", () => {
  it("does not re-queue sections already marked pending", () => {
    const sections = sectionsNeedingGeneration(baseRow);
    expect(sections).not.toContain("skin");
    expect(sections).not.toContain("faceFeatures");
  });

  it("does not re-queue preview when pending", () => {
    const row: InfographicReportRow = {
      ...baseRow,
      visual_assets: {
        ...baseRow.visual_assets!,
        assets: {
          analysisInfographics: {
            faceFeaturesPreview: { path: "x", status: "pending", mime: "image/png" },
          },
        },
      },
    };
    expect(previewNeedsGeneration(row)).toBe(false);
  });
});
