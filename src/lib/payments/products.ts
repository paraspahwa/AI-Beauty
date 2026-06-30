import type { PaymentProduct } from "@/types/report";

export const PAYMENT_PRODUCTS = {
  reportUnlock: "report_unlock",
  styleGuideAddon: "style_guide_addon",
} as const satisfies Record<string, PaymentProduct>;

export function isPaymentProduct(value: string): value is PaymentProduct {
  return value === "report_unlock" || value === "style_guide_addon";
}
