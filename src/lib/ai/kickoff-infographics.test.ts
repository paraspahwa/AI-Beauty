import { describe, expect, it } from "vitest";
import { getGeneratableSectionIds } from "@/lib/ai/infographic-sections";

describe("kickoff-infographics section plan", () => {
  it("queues six paid sections as separate jobs", () => {
    const sections = getGeneratableSectionIds();
    expect(sections).toHaveLength(6);
    expect(sections).toEqual([
      "faceFeatures",
      "skin",
      "color",
      "hairstyle",
      "spectacles",
      "hairColor",
    ]);
  });
});
