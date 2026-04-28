import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/razorpay
 *
 * Configure your webhook to send `payment.captured` and `payment.failed` events.
 * Signature validation is mandatory — never trust the body without it.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id as string | undefined;
  if (!orderId) return NextResponse.json({ ok: true }, { status: 202 }); // ignore non-payment events

  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("payments")
    .select("id,user_id,report_id,status")
    .eq("provider_order_id", orderId)
    .single();
  if (!row) return NextResponse.json({ ok: true }, { status: 202 });

  if (event.event === "payment.captured") {
    if (row.status !== "paid") {
      if (row.report_id) {
        // Atomically update payments, report and profile in one transaction
        await admin.rpc("complete_webhook_payment", {
          p_payment_row_id: row.id,
          p_report_id: row.report_id,
          p_user_id: row.user_id,
          p_provider_payment_id: payment?.id as string,
          p_raw: payment as object,
        });
      } else {
        await admin.from("payments").update({
          status: "paid",
          provider_payment_id: payment?.id as string,
          raw: payment as object,
        }).eq("id", row.id);
        await admin.from("profiles").update({ is_paid: true }).eq("id", row.user_id);
      }
    }
  } else if (event.event === "payment.failed") {
    await admin.from("payments").update({ status: "failed", raw: payment as object }).eq("id", row.id);
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
