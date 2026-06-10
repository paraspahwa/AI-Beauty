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
import { verifySubscriptionSignature } from "@/lib/payments/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const Body = z.object({
  razorpay_payment_id: z.string().min(8).max(64).regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_subscription_id: z.string().min(8).max(64).regex(/^sub_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
}).strict();

export async function POST(req: NextRequest) {
  try {
    env.assertServer();

    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: z.infer<typeof Body>;
    try {
      body = Body.parse(await req.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!verifySubscriptionSignature({
      paymentId: body.razorpay_payment_id,
      subscriptionId: body.razorpay_subscription_id,
      signature: body.razorpay_signature,
    })) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Mark as pending_activation — webhook will confirm to 'active'
    const { error: updateErr, count } = await admin
      .from("subscriptions")
      .update({
        status:     "pending_activation",
        updated_at: new Date().toISOString(),
      }, { count: "exact" })
      .eq("provider_subscription_id", body.razorpay_subscription_id)
      .eq("user_id", user.id);

    if (updateErr) {
      console.error("[subscriptions/verify] db update failed", updateErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[subscriptions/verify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
