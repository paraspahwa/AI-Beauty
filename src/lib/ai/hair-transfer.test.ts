import { describe, expect, it } from "vitest";
import { mapToReplicateHairColorEnum, mapToReplicateHairStyle, mapVisionToHairTransferControls } from "./hair-transfer";

describe("hair-transfer mapping", () => {
  it("maps known style and color aliases", () => {
    const controls = mapVisionToHairTransferControls(
      { styleName: "Bob Cut", colorName: "Dark Brown", detectedLook: "Sharp bob with rich brunette color" },
      "female",
    );

    expect(controls.styleName).toBe("bob_cut");
    expect(controls.colorName).toBe("dark_brown");
    expect(controls.detectedLook).toContain("Sharp bob");
  });

  it("falls back when vision output is missing", () => {
    const controls = mapVisionToHairTransferControls(undefined, "female");
    expect(controls).toEqual({
      styleName: "No change",
      colorName: "natural",
      detectedLook: "AI-matched hairstyle look",
    });
  });

  it("enforces gender-safe fallback for disallowed style", () => {
    const controls = mapVisionToHairTransferControls(
      { styleName: "high ponytail", colorName: "auburn", detectedLook: "high ponytail" },
      "male",
    );

    expect(controls.styleName).toBe("No change");
    expect(controls.colorName).toBe("auburn");
  });

  it("maps replicate style and color enums", () => {
    expect(mapToReplicateHairStyle("bob_cut")).toBe("Bob");
    expect(mapToReplicateHairColorEnum("dark_brown")).toBe("Dark Brown");
    expect(mapToReplicateHairColorEnum("warm auburn highlights")).toBe("Auburn");
  });
});
