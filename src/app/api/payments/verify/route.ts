import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyCheckoutSignature } from "@/lib/payments/razorpay";
import { PAYMENT_PRODUCTS } from "@/lib/payments/products";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import { kickOffInfographicsInBackground, kickOffStyleGuideInfographicInBackground } from "@/lib/ai/kickoff-infographics";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  reportId: z.string().uuid(),
  razorpay_order_id: z.string().min(8).max(64),
  razorpay_payment_id: z.string().min(8).max(64),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
}).strict();

/**
 * POST /api/payments/verify
 * Verifies the signature returned by Razorpay Checkout.
 *
 * IMPORTANT: this endpoint does not unlock report/profile or mark payments paid
 * for real Razorpay checkouts. `payment.captured` webhook handling is authoritative.
 * Test mode completes unlock immediately via RPC.
 */
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

    const razorpayConfigured = env.razorpay.isConfigured;
    const allowTestMode =
      env.flags.paymentTestMode &&
      (process.env.NODE_ENV !== "production" || env.flags.paymentTestAllowInProd);

    if (!razorpayConfigured && !allowTestMode) {
      return NextResponse.json(
        {
          error: "Payments are not configured in this environment",
          code: "PAYMENT_NOT_CONFIGURED",
          awaitingWebhook: false,
        },
        { status: 503 },
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: payment } = await admin
      .from("payments")
      .select("id,user_id,report_id,status,product")
      .eq("provider_order_id", body.razorpay_order_id)
      .maybeSingle();
    if (!payment || payment.user_id !== user.id || payment.report_id !== body.reportId) {
      return NextResponse.json({ error: "Payment mismatch" }, { status: 400 });
    }

    const product = payment.product ?? PAYMENT_PRODUCTS.reportUnlock;

    if (razorpayConfigured) {
      const ok = verifyCheckoutSignature({
        orderId: body.razorpay_order_id,
        paymentId: body.razorpay_payment_id,
        signature: body.razorpay_signature,
      });
      if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

      if (payment.status !== "paid") {
        const { error: updErr } = await admin
          .from("payments")
          .update({
            provider_payment_id: body.razorpay_payment_id,
            provider_signature: body.razorpay_signature,
          })
          .eq("id", payment.id)
          .neq("status", "paid");
        if (updErr) throw updErr;
      }

      return NextResponse.json({
        ok: true,
        mode: "real",
        product,
        awaitingWebhook: payment.status !== "paid",
      });
    }

    if (!body.razorpay_order_id.startsWith("test_order_")) {
      return NextResponse.json({ error: "Invalid test order" }, { status: 400 });
    }

    if (payment.status !== "paid") {
      if (product === PAYMENT_PRODUCTS.styleGuideAddon) {
        const { error: rpcErr } = await admin.rpc("complete_style_guide_payment", {
          p_payment_row_id: payment.id,
          p_report_id: body.reportId,
          p_user_id: user.id,
          p_provider_payment_id: body.razorpay_payment_id,
          p_provider_signature: body.razorpay_signature,
        });
        if (rpcErr) throw rpcErr;
        kickOffStyleGuideInfographicInBackground(body.reportId, true);
      } else {
        const { error: rpcErr } = await admin.rpc("complete_payment", {
          p_payment_row_id: payment.id,
          p_report_id: body.reportId,
          p_user_id: user.id,
          p_provider_payment_id: body.razorpay_payment_id,
          p_provider_signature: body.razorpay_signature,
        });
        if (rpcErr) throw rpcErr;
        kickOffInfographicsInBackground(body.reportId, { force: true });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: "test",
      product,
      awaitingWebhook: false,
      unlocked: true,
    });
  } catch (err) {
    console.error("[POST /api/payments/verify]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
