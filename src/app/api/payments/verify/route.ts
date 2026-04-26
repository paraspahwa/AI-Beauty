import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyCheckoutSignature } from "@/lib/payments/razorpay";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = Body.parse(await req.json());

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

    await admin.from("payments").update({
      status: "paid",
      provider_payment_id: body.razorpay_payment_id,
      provider_signature: body.razorpay_signature,
    }).eq("id", payment.id);

    await admin.from("reports").update({ is_paid: true }).eq("id", body.reportId);
    await admin.from("profiles").update({ is_paid: true }).eq("id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/payments/verify]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
