import { describe, expect, it } from "vitest";
import { FACE_SHAPE_CONFIDENCE_THRESHOLD, shouldUseShapeConditioning } from "./confidence";

describe("confidence gating", () => {
  it("returns false below threshold", () => {
    expect(shouldUseShapeConditioning(FACE_SHAPE_CONFIDENCE_THRESHOLD - 0.001)).toBe(false);
  });

  it("returns true at threshold", () => {
    expect(shouldUseShapeConditioning(FACE_SHAPE_CONFIDENCE_THRESHOLD)).toBe(true);
  });

  it("returns false for NaN and Infinity", () => {
    expect(shouldUseShapeConditioning(Number.NaN)).toBe(false);
    expect(shouldUseShapeConditioning(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
