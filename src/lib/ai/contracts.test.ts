import { describe, expect, it } from "vitest";
import {
  normalizeColorAnalysis,
  normalizeFaceShape,
  normalizeGlasses,
  normalizeHairstyle,
  normalizeSkinAnalysis,
} from "./contracts";

describe("contracts: enum fallback", () => {
  it("falls back invalid face shape to Soft Oval", () => {
    const out = normalizeFaceShape({ shape: "Hexagon", traits: [], confidence: 0.4 });
    expect(out.shape).toBe("Soft Oval");
  });

  it("falls back invalid season and undertone to defaults", () => {
    const out = normalizeColorAnalysis({
      season: "Monsoon",
      undertone: "Hot",
      palette: [],
      metals: ["Fake"],
      avoidColors: [],
    });

    expect(out.season).toBe("Soft Autumn");
    expect(out.undertone).toBe("Neutral");
    expect(out.metals).toEqual(["Gold", "Rose Gold"]);
  });

  it("falls back invalid skin type to Combination", () => {
    const out = normalizeSkinAnalysis({ type: "Greasy" });
    expect(out.type).toBe("Combination");
  });
});

describe("contracts: invalid hex handling", () => {
  it("drops invalid palette hex values and pads to eight", () => {
    const out = normalizeColorAnalysis({
      palette: [
        { name: "Bad1", hex: "#12GG34" },
        { name: "Bad2", hex: "123456" },
        { name: "Short", hex: "#abc" },
        { name: "Good", hex: "#a1b2c3" },
      ],
      avoidColors: [{ name: "avoid", hex: "#111111" }],
      metals: ["Gold"],
    });

    expect(out.palette).toHaveLength(8);
    expect(out.palette[0]).toEqual({ name: "Good", hex: "#A1B2C3" });
  });

  it("falls back avoidColors to defaults when all are invalid", () => {
    const out = normalizeColorAnalysis({
      palette: [{ name: "ok", hex: "#112233" }],
      avoidColors: [
        { name: "bad", hex: "nope" },
        { name: "bad2", hex: "#12" },
      ],
      metals: ["Silver"],
    });

    expect(out.avoidColors).toHaveLength(3);
    expect(out.avoidColors[0]).toEqual({ name: "Neon Lime", hex: "#BFFF00" });
  });

  it("uses fallback hex for invalid glasses and hairstyle colors", () => {
    const glasses = normalizeGlasses({
      colors: [{ name: "Bad", hex: "oops" }],
    });
    const hair = normalizeHairstyle({
      colors: [{ name: "Bad", hex: "oops", description: "x" }],
    });

    expect(glasses.colors[0].hex).toBe("#6B5B4D");
    expect(hair.colors[0].hex).toBe("#6F4E37");
  });
});

describe("contracts: missing arrays and object shape", () => {
  it("provides stable defaults for color analysis", () => {
    const out = normalizeColorAnalysis({});
    expect(out.palette).toHaveLength(8);
    expect(out.avoidColors).toHaveLength(3);
    expect(out.metals).toEqual(["Gold", "Rose Gold"]);
  });

  it("provides stable defaults for glasses", () => {
    const out = normalizeGlasses({});
    expect(out.goals).toHaveLength(3);
    expect(out.recommended).toHaveLength(5);
    expect(out.avoid).toHaveLength(4);
    expect(out.colors).toHaveLength(5);
    expect(out.fitTips).toHaveLength(3);
  });

  it("provides stable defaults for hairstyle", () => {
    const out = normalizeHairstyle({});
    expect(out.styles).toHaveLength(5);
    expect(out.lengths).toHaveLength(3);
    expect(out.colors).toHaveLength(5);
    expect(out.avoid).toHaveLength(3);
  });

  it("provides stable defaults for skin routine", () => {
    const out = normalizeSkinAnalysis({});
    expect(out.routine).toHaveLength(4);
  });
});
