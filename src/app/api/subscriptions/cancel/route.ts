/**
 * POST /api/subscriptions/cancel
 *
 * Cancels the user's active Studio Pro subscription at period end.
 * Calls Razorpay to cancel and updates the subscriptions table.
 *
 * Body: { subscriptionId: string } — provider_subscription_id
 * Returns: { ok: true, cancelAtPeriodEnd: true }
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRazorpay } from "@/lib/payments/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 20;

const Body = z.object({
  subscriptionId: z.string().min(8).max(64).regex(/^sub_[A-Za-z0-9]+$/),
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

    const admin = createSupabaseAdminClient();

    // Confirm the subscription belongs to this user
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, status, provider_subscription_id")
      .eq("provider_subscription_id", body.subscriptionId)
      .eq("user_id", user.id)
      .single();

    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    if (!["active", "pending_activation"].includes(sub.status)) {
      return NextResponse.json({ error: "Subscription is not active" }, { status: 400 });
    }

    // Cancel at period end in Razorpay (cancel_at_cycle_end = 1)
    const rz = getRazorpay();
    // @ts-expect-error — Razorpay SDK types don't expose subscriptions.cancel
    await rz.subscriptions.cancel(body.subscriptionId, { cancel_at_cycle_end: 1 });

    await admin
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at:           new Date().toISOString(),
      })
      .eq("id", sub.id);

    return NextResponse.json({ ok: true, cancelAtPeriodEnd: true });
  } catch (err) {
    console.error("[subscriptions/cancel]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
