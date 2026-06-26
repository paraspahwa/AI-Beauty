function optional(value: string | undefined, fallback = ""): string {
  return value ?? fallback;
}

export const publicEnv = {
  app: {
    url: optional(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"),
    name: optional(process.env.NEXT_PUBLIC_APP_NAME, "Renovaara"),
  },
  supabase: {
    url: optional(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: optional(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  },
  razorpay: {
    keyId: optional(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
    priceINR: Number(process.env.NEXT_PUBLIC_PRICE_REPORT_INR ?? process.env.NEXT_PUBLIC_PAID_PRICE_INR ?? "299"),
    priceUSD: Number(process.env.NEXT_PUBLIC_PRICE_REPORT_USD ?? process.env.NEXT_PUBLIC_PAID_PRICE_USD ?? "3.99"),
  },
  flags: {
    pdfEnabled: optional(process.env.NEXT_PUBLIC_ENABLE_PDF, "true") === "true",
  },
};

