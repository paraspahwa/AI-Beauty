import { describe, expect, it } from "vitest";
import { getDeckLayout } from "./animations";

describe("getDeckLayout", () => {
  it("centers the active card", () => {
    const layout = getDeckLayout(0, 0, 3);
    expect(layout.role).toBe("active");
    expect(layout.zIndex).toBe(30);
    expect(layout.opacity).toBe(1);
  });

  it("places next and prev as peeks", () => {
    const next = getDeckLayout(1, 0, 3);
    const prev = getDeckLayout(2, 0, 3);
    expect(next.role).toBe("peekNext");
    expect(prev.role).toBe("peekPrev");
  });

  it("hides non-adjacent cards in reduced motion except active", () => {
    expect(getDeckLayout(1, 0, 3, true).role).toBe("hidden");
    expect(getDeckLayout(0, 0, 3, true).role).toBe("active");
  });
});
