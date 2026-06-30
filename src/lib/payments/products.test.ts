import { describe, it, expect } from "vitest";
import { isPaymentProduct, PAYMENT_PRODUCTS } from "@/lib/payments/products";

describe("payment products", () => {
  it("recognises valid product types", () => {
    expect(isPaymentProduct(PAYMENT_PRODUCTS.reportUnlock)).toBe(true);
    expect(isPaymentProduct(PAYMENT_PRODUCTS.styleGuideAddon)).toBe(true);
    expect(isPaymentProduct("invalid")).toBe(false);
  });
});
