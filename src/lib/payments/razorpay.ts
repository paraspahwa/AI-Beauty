import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../env";

let cached: Razorpay | null = null;
export function getRazorpay() {
  if (!cached) {
    if (!env.razorpay.keyId || !env.razorpay.keySecret) {
      throw new Error("Razorpay keys are not configured");
    }
    cached = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }
  return cached;
}

/** Verify the signature returned by Razorpay Checkout after a payment. */
export function verifyCheckoutSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = createHmac("sha256", env.razorpay.keySecret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");
  return safeEqual(expected, args.signature);
}

/** Verify the X-Razorpay-Signature header on incoming webhooks. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.razorpay.webhookSecret) return false;
  const expected = createHmac("sha256", env.razorpay.webhookSecret)
    .update(rawBody)
    .digest("hex");
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  // Decode hex → fixed 32-byte buffers (SHA-256 HMAC digests are always 64 hex chars).
  // Always run timingSafeEqual even when lengths differ so we don't leak length info
  // via a short-circuit return that would be measurably faster.
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab); // dummy comparison to normalise timing
    return false;
  }
  return timingSafeEqual(ab, bb);
}
