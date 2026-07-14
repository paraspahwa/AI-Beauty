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

function csv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

// Admin emails must come entirely from the ADMIN_EMAIL_ALLOWLIST env var.
// Never hardcode email addresses in source code.

export const env = {
  app: {
    // VERCEL_URL is automatically set by Vercel (without https://) — use it as fallback
    url: optional(process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
    ),
    name: optional(process.env.NEXT_PUBLIC_APP_NAME, "Renovaara"),
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
  replicate: {
    apiToken: optional(process.env.REPLICATE_API_TOKEN),
    /** true only when a token is actually configured */
    isConfigured: optional(process.env.REPLICATE_API_TOKEN).length > 0,
  },
  fal: {
    apiKey: optional(process.env.FAL_KEY),
    /** true only when a FAL_KEY is configured */
    isConfigured: optional(process.env.FAL_KEY).length > 0,
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
    // One-time report unlock prices
    priceINR: Number(process.env.NEXT_PUBLIC_PRICE_REPORT_INR ?? process.env.NEXT_PUBLIC_PAID_PRICE_INR ?? "299"),
    priceUSD: Number(process.env.NEXT_PUBLIC_PRICE_REPORT_USD ?? process.env.NEXT_PUBLIC_PAID_PRICE_USD ?? "3.99"),
    styleGuidePriceINR: Number(process.env.NEXT_PUBLIC_PRICE_STYLE_GUIDE_INR ?? "99"),
    styleGuidePriceUSD: Number(process.env.NEXT_PUBLIC_PRICE_STYLE_GUIDE_USD ?? "0.99"),
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
  auth: {
    // Comma-separated list of admin emails. Must be set via ADMIN_EMAIL_ALLOWLIST env var.
    adminEmailAllowlist: csv(process.env.ADMIN_EMAIL_ALLOWLIST),
  },
  internal: {
    // Shared secret used for server-to-server calls (e.g. background visual generation).
    // Set INTERNAL_API_SECRET in .env.local and Vercel env vars.
    secret: optional(process.env.INTERNAL_API_SECRET),
  },
  /**
   * Affiliate programme identifiers (legacy — unused in report-only product).
   */
  analytics: {
    plausibleDomain: optional(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN),
    posthogKey: optional(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    posthogHost: optional(process.env.NEXT_PUBLIC_POSTHOG_HOST, "https://app.posthog.com"),
  },
  affiliate: {
    amazonTag: optional(process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG, ""),
    myntraSid: optional(process.env.NEXT_PUBLIC_MYNTRA_AFFILIATE_SID, ""),
  },
  /**
   * Amazon PA-API 5.0 — server-side product image fetching.
   *
   * AMAZON_PARTNER_TAG: your Associates tag (same value as NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG
   *   but kept server-side so the public var can be omitted if desired).
   *   Falls back to NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG.
   *
   * PA-API uses the same AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY as Rekognition,
   * but the IAM user must also have AmazonProductAdvertisingAccess policy attached,
   * or use a separate IAM user. Set AMAZON_PA_API_ACCESS_KEY_ID /
   * AMAZON_PA_API_SECRET_ACCESS_KEY to use a dedicated PA-API key pair.
   */
  amazon: {
    partnerTag: optional(
      process.env.AMAZON_PARTNER_TAG ?? process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG,
      "",
    ),
    // Allow a dedicated PA-API key pair separate from the Rekognition key
    paApiAccessKeyId: optional(
      process.env.AMAZON_PA_API_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID,
      "",
    ),
    paApiSecretKey: optional(
      process.env.AMAZON_PA_API_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY,
      "",
    ),
    /** true only when all three PA-API credentials are present */
    get paApiConfigured(): boolean {
      return (
        this.partnerTag.length > 0 &&
        this.paApiAccessKeyId.length > 0 &&
        this.paApiSecretKey.length > 0
      );
    },
  },
  /** Throws if any required server-side secret is missing. Call from server code. */
  assertServer() {
    required("NEXT_PUBLIC_SUPABASE_URL", this.supabase.url);
    required("SUPABASE_SERVICE_ROLE_KEY", this.supabase.serviceRoleKey);
    required("OPENAI_API_KEY", this.openai.apiKey);
    // AWS keys are required for /api/analyze when strict gender detection is enabled.
    if (process.env.NODE_ENV === "production" && this.flags.paymentTestAllowInProd) {
      console.error(
        "[env] DANGER: PAYMENT_TEST_ALLOW_IN_PROD=true in production — fake payments are enabled! " +
        "Disable this flag immediately."
      );
    }
  },
  /** Throws if AWS Rekognition credentials are missing. Call only from the analyze route. */
  assertRekognition() {
    required("AWS_ACCESS_KEY_ID", this.aws.accessKeyId);
    required("AWS_SECRET_ACCESS_KEY", this.aws.secretAccessKey);
  },
};


