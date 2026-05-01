// Centralized environment-variable access. Throws early when required values are missing
// in server code, while keeping client-only access typed and safe.

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(value: string | undefined, fallback = ""): string {
  return value ?? fallback;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === "true";
}

export const env = {
  app: {
    url: optional(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"),
    name: optional(process.env.NEXT_PUBLIC_APP_NAME, "StyleAI"),
  },
  supabase: {
    url: optional(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: optional(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    serviceRoleKey: optional(process.env.SUPABASE_SERVICE_ROLE_KEY),
    bucket: optional(process.env.SUPABASE_STORAGE_BUCKET, "selfies"),
  },
  openai: {
    apiKey: optional(process.env.OPENAI_API_KEY),
    visionModel: optional(process.env.OPENAI_VISION_MODEL, "gpt-4o"),
    miniModel: optional(process.env.OPENAI_MINI_MODEL, "gpt-4o-mini"),
  },
  aws: {
    region: optional(process.env.AWS_REGION, "us-east-1"),
    accessKeyId: optional(process.env.AWS_ACCESS_KEY_ID),
    secretAccessKey: optional(process.env.AWS_SECRET_ACCESS_KEY),
  },
  razorpay: {
    keyId: optional(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
    keySecret: optional(process.env.RAZORPAY_KEY_SECRET),
    webhookSecret: optional(process.env.RAZORPAY_WEBHOOK_SECRET),
    priceUSD: Number(process.env.NEXT_PUBLIC_PAID_PRICE_USD ?? "9.99"),
    priceINR: Number(process.env.NEXT_PUBLIC_PAID_PRICE_INR ?? "829"),
    isConfigured:
      optional(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID).length > 0 &&
      optional(process.env.RAZORPAY_KEY_SECRET).length > 0 &&
      optional(process.env.RAZORPAY_WEBHOOK_SECRET).length > 0,
  },
  flags: {
    pdfEnabled: optional(process.env.NEXT_PUBLIC_ENABLE_PDF, "true") === "true",
    paymentTestMode: bool(process.env.PAYMENT_TEST_MODE, false),
    paymentTestAllowInProd: bool(process.env.PAYMENT_TEST_ALLOW_IN_PROD, false),
  },
  /** Throws if any required server-side secret is missing. Call from server code. */
  assertServer() {
    required("NEXT_PUBLIC_SUPABASE_URL", this.supabase.url);
    required("SUPABASE_SERVICE_ROLE_KEY", this.supabase.serviceRoleKey);
    required("OPENAI_API_KEY", this.openai.apiKey);
    required("AWS_ACCESS_KEY_ID", this.aws.accessKeyId);
    required("AWS_SECRET_ACCESS_KEY", this.aws.secretAccessKey);
  },
};
