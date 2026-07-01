import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./openai", () => ({
  chatJSON: vi.fn(),
}));

vi.mock("./image", () => ({
  compressForAI: vi.fn(async () => Buffer.from("compressed-body")),
}));

vi.mock("./memory", () => ({
  buildPersonalizedSystemBase: vi.fn(async () => "PERSONALIZED_SYSTEM"),
}));

import { chatJSON } from "./openai";
import { compressForAI } from "./image";
import { runStyleGuideAnalysis } from "./run-style-guide-analysis";
import type { ColorAnalysisResult, FaceShapeResult, FeatureBreakdown } from "@/types/report";

const chatJSONMock = vi.mocked(chatJSON);
const compressMock = vi.mocked(compressForAI);

const faceShape: FaceShapeResult = {
  shape: "Oval",
  traits: ["Balanced"],
  confidence: 0.9,
};

const colorAnalysis: ColorAnalysisResult = {
  season: "Soft Autumn",
  undertone: "Warm",
  description: "Warm muted tones",
  palette: [{ name: "Camel", hex: "#C19A6B" }],
  metals: ["Gold"],
  avoidColors: [],
};

const features: FeatureBreakdown = {
  eyes: { shape: "Almond", notes: "Balanced" },
  eyebrows: { shape: "Soft arch", notes: "Defined" },
  nose: { shape: "Straight", notes: "Proportional" },
  lips: { shape: "Full", notes: "Even" },
  cheeks: { shape: "Soft", notes: "Natural contour" },
};

describe("runStyleGuideAnalysis", () => {
  beforeEach(() => {
    chatJSONMock.mockReset();
    compressMock.mockClear();
  });

  it("runs vision analysis on the full-body image", async () => {
    chatJSONMock.mockResolvedValueOnce({
      primaryStyle: "Quiet Luxury",
      secondaryStyles: ["Classic"],
      vibeTraits: ["Refined"],
      wardrobeEssentials: ["Blazer"],
      silhouettes: ["Fitted waist"],
      colorDirection: { neutrals: ["Ivory"], accents: ["Burgundy"] },
      styleNotes: ["Tailored pieces"],
      identitySummary: "Polished.",
    });

    const result = await runStyleGuideAnalysis({
      imageBuffer: Buffer.from("body-photo"),
      faceShape,
      colorAnalysis,
      features,
      summary: "You glow in warm tones.",
      userId: "user-123",
    });

    expect(compressMock).toHaveBeenCalledWith(Buffer.from("body-photo"), 512);
    expect(chatJSONMock).toHaveBeenCalledWith(
      expect.objectContaining({
        imageBase64: Buffer.from("compressed-body").toString("base64"),
        system: "PERSONALIZED_SYSTEM",
      }),
    );

    const userPrompt = chatJSONMock.mock.calls[0]?.[0]?.user ?? "";
    expect(userPrompt).toContain("FULL-BODY");
    expect(userPrompt).toContain("Soft Autumn");
    expect(result.primaryStyle).toBe("Quiet Luxury");
  });
});
