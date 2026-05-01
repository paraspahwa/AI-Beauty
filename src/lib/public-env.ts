function optional(value: string | undefined, fallback = ""): string {
  return value ?? fallback;
}

export const publicEnv = {
  app: {
    url: optional(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"),
    name: optional(process.env.NEXT_PUBLIC_APP_NAME, "StyleAI"),
  },
  supabase: {
    url: optional(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: optional(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  },
  razorpay: {
    keyId: optional(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
    priceUSD: Number(process.env.NEXT_PUBLIC_PAID_PRICE_USD ?? "9.99"),
    priceINR: Number(process.env.NEXT_PUBLIC_PAID_PRICE_INR ?? "829"),
  },
  flags: {
    pdfEnabled: optional(process.env.NEXT_PUBLIC_ENABLE_PDF, "true") === "true",
  },
};