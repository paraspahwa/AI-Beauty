import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyCheckoutSignature } from "@/lib/payments/razorpay";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  reportId: z.string().uuid(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

/**
 * POST /api/payments/verify
 * Verifies the signature returned by Razorpay Checkout, marks the payment paid,
 * and unlocks the report. Webhooks (`/api/webhooks/razorpay`) provide a redundant
 * server-side path so users never get stuck if the browser drops the response.
 */
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

    const ok = verifyCheckoutSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

    const admin = createSupabaseAdminClient();

    // Update payment row (must belong to this user via order_id lookup)
    const { data: payment } = await admin
      .from("payments")
      .select("id,user_id,report_id")
      .eq("provider_order_id", body.razorpay_order_id)
      .single();
    if (!payment || payment.user_id !== user.id || payment.report_id !== body.reportId) {
      return NextResponse.json({ error: "Payment mismatch" }, { status: 400 });
    }

    // Atomically mark payment paid, unlock the report, and update the profile
    // using a single DB transaction so partial failures are impossible.
    const { error: rpcErr } = await admin.rpc("complete_payment", {
      p_payment_row_id: payment.id,
      p_report_id: body.reportId,
      p_user_id: user.id,
      p_provider_payment_id: body.razorpay_payment_id,
      p_provider_signature: body.razorpay_signature,
    });
    if (rpcErr) throw rpcErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/payments/verify]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
