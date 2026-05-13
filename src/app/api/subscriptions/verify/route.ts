/**
 * POST /api/subscriptions/verify
 *
 * Verifies the Razorpay subscription checkout signature returned by the
 * client after a successful first-charge.
 *
 * Body:
 *   razorpay_payment_id      — from Razorpay handler
 *   razorpay_subscription_id — from Razorpay handler
 *   razorpay_signature       — from Razorpay handler
 *
 * On success:
 *   • Signature is validated server-side (HMAC-SHA256)
 *   • Subscription row status → 'pending_activation'
 *   • Webhook (subscription.activated) will later move it to 'active'
 *
 * Returns: { ok: true }
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const Body = z.object({
  razorpay_payment_id:      z.string().min(1),
  razorpay_subscription_id: z.string().min(1),
  razorpay_signature:       z.string().min(1),
});

function verifySubscriptionSig(paymentId: string, subscriptionId: string, signature: string): boolean {
  if (!env.razorpay.keySecret) return false;
  const expected = createHmac("sha256", env.razorpay.keySecret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) { timingSafeEqual(a, a); return false; }
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    env.assertServer();

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: z.infer<typeof Body>;
    try {
      body = Body.parse(await req.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!verifySubscriptionSig(body.razorpay_payment_id, body.razorpay_subscription_id, body.razorpay_signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Mark as pending_activation — webhook will confirm to 'active'
    const { error: updateErr } = await admin
      .from("subscriptions")
      .update({
        status:     "pending_activation",
        updated_at: new Date().toISOString(),
      })
      .eq("provider_subscription_id", body.razorpay_subscription_id)
      .eq("user_id", user.id);

    if (updateErr) {
      console.error("[subscriptions/verify] db update failed", updateErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[subscriptions/verify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
