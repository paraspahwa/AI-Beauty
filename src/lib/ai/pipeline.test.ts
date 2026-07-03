import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./openai", () => ({
  chatJSON: vi.fn(),
}));

vi.mock("./image", () => ({
  compressForAI: vi.fn(async () => Buffer.from("compressed-image")),
  extractClothingColors: vi.fn(async () => ({ clothingColors: [], clothingCoverage: 0 })),
  cropFaceForSkin: vi.fn(async () => null),
}));

vi.mock("./rekognition", () => ({
  detectFaceDetails: vi.fn(async () => null),
}));

import { chatJSON } from "./openai";
import { runAnalysisPipeline } from "./pipeline";

const chatJSONMock = vi.mocked(chatJSON);

describe("pipeline confidence gating", () => {
  beforeEach(() => {
    chatJSONMock.mockReset();
  });

  it("uses generic Balanced shape for styling prompts when face confidence is low", async () => {
    chatJSONMock
      .mockResolvedValueOnce({ shape: "Round", traits: ["x", "y", "z"], confidence: 0.4 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ summary: "ok" });

    await runAnalysisPipeline(Buffer.from("raw-image"));

    expect(chatJSONMock).toHaveBeenCalledTimes(8);

    const glassesUserPrompt = chatJSONMock.mock.calls[5]?.[0]?.user;
    const hairstyleUserPrompt = chatJSONMock.mock.calls[6]?.[0]?.user;

    expect(glassesUserPrompt).toContain("Balanced face");
    expect(hairstyleUserPrompt).toContain("Balanced face");
  });

  it("uses detected face shape for styling prompts when confidence is high", async () => {
    chatJSONMock
      .mockResolvedValueOnce({ shape: "Round", traits: ["x", "y", "z"], confidence: 0.9 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ summary: "ok" });

    await runAnalysisPipeline(Buffer.from("raw-image"));

    expect(chatJSONMock).toHaveBeenCalledTimes(8);

    const glassesUserPrompt = chatJSONMock.mock.calls[5]?.[0]?.user;
    const hairstyleUserPrompt = chatJSONMock.mock.calls[6]?.[0]?.user;

    expect(glassesUserPrompt).toContain("Round face");
    expect(hairstyleUserPrompt).toContain("Round face");
  });

  it("does not run style guide analysis during selfie pipeline", async () => {
    chatJSONMock
      .mockResolvedValueOnce({ shape: "Oval", traits: ["a", "b", "c"], confidence: 0.9 })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ summary: "ok" });

    const result = await runAnalysisPipeline(Buffer.from("raw-image"));

    expect(chatJSONMock).toHaveBeenCalledTimes(8);
    expect(result.styleGuide).toBeNull();
    for (const call of chatJSONMock.mock.calls) {
      const user = call[0]?.user ?? "";
      expect(user.toLowerCase()).not.toContain("style guide");
      expect(user).not.toContain("FULL-BODY");
    }
  });
});
