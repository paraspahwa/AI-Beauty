import { PRODUCT_COPY } from "@/lib/product-copy";
import { publicEnv } from "@/lib/public-env";

export function fmtInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export interface LandingPlan {
  name: string;
  price: string;
  originalPrice?: string;
  note: string;
  cta: string;
  href: string;
  featured: boolean;
  items: readonly string[];
}

/** Homepage pricing cards — prices from public env. */
export function getLandingPlans(): LandingPlan[] {
  const reportPrice = publicEnv.razorpay.priceINR;
  const styleGuidePrice = publicEnv.razorpay.styleGuidePriceINR;
  const reportLabel = fmtInr(reportPrice);
  const styleGuideLabel = fmtInr(styleGuidePrice);

  return [
    {
      name: PRODUCT_COPY.free.name,
      price: fmtInr(0),
      note: "No card required",
      cta: "Start free analysis",
      href: "/upload",
      featured: false,
      items: PRODUCT_COPY.free.items,
    },
    {
      name: PRODUCT_COPY.report.name,
      price: reportLabel,
      originalPrice: fmtInr(PRODUCT_COPY.report.strikeInr),
      note: "One-time payment",
      cta: `Unlock Full Report — ${reportLabel}`,
      href: "/upload?intent=purchase",
      featured: true,
      items: PRODUCT_COPY.report.items,
    },
    {
      name: PRODUCT_COPY.styleGuide.name,
      price: styleGuideLabel,
      note: "Optional add-on",
      cta: `Style Guide — ${styleGuideLabel}`,
      href: "/upload",
      featured: false,
      items: PRODUCT_COPY.styleGuide.items,
    },
  ];
}
