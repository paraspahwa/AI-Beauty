import { describe, expect, it } from "vitest";
import { FREE_STUDIO_CAP, STUDIO_PRO_CAP } from "@/lib/studio-access";
import { PRODUCT_COPY } from "@/lib/product-copy";

describe("studio-access constants", () => {
  it("free cap matches product copy", () => {
    expect(FREE_STUDIO_CAP).toBe(PRODUCT_COPY.free.studioGensPerMonth);
  });

  it("studio pro cap matches product copy", () => {
    expect(STUDIO_PRO_CAP).toBe(PRODUCT_COPY.studioPro.studioGensPerMonth);
  });
});
