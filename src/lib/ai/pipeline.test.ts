import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./openai", () => ({
  chatJSON: vi.fn(),
}));

vi.mock("./image", () => ({
  compressForAI: vi.fn(async () => Buffer.from("compressed-image")),
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
      .mockResolvedValueOnce({ summary: "ok" });

    await runAnalysisPipeline(Buffer.from("raw-image"));

    expect(chatJSONMock).toHaveBeenCalledTimes(7);

    const glassesUserPrompt = chatJSONMock.mock.calls[4]?.[0]?.user;
    const hairstyleUserPrompt = chatJSONMock.mock.calls[5]?.[0]?.user;

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
      .mockResolvedValueOnce({ summary: "ok" });

    await runAnalysisPipeline(Buffer.from("raw-image"));

    const glassesUserPrompt = chatJSONMock.mock.calls[4]?.[0]?.user;
    const hairstyleUserPrompt = chatJSONMock.mock.calls[5]?.[0]?.user;

    expect(glassesUserPrompt).toContain("Round face");
    expect(hairstyleUserPrompt).toContain("Round face");
  });
});
