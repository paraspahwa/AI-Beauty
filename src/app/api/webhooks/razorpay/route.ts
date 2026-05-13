import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/razorpay
 *
 * Configure your webhook to send `payment.captured` and `payment.failed` events.
 * Signature validation is mandatory — never trust the body without it.
 */
export async function POST(req: NextRequest) {
  // Validate secrets are configured before touching any payload
  if (!env.razorpay.webhookSecret) {
    console.error("[webhook/razorpay] RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  if (!env.razorpay.keySecret) {
    console.error("[webhook/razorpay] RAZORPAY_KEY_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

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

  // Idempotency guard: skip duplicate event deliveries using provider_event_id.
  // record_webhook_event returns true on first insert, false on duplicate.
  const eventId = (event as Record<string, unknown>).id as string | undefined;
  if (eventId) {
    const { data: isNew, error: idempErr } = await admin.rpc("record_webhook_event", {
      p_provider: "razorpay",
      p_provider_event_id: eventId,
      p_event_type: event.event ?? "unknown",
      p_raw: event as unknown as Record<string, unknown>,
    });
    if (idempErr) {
      // Non-fatal if table doesn't exist yet (migration not applied)
      if (idempErr.code !== "42P01") {
        console.error("[webhook/razorpay] idempotency check failed", idempErr);
      }
    } else if (isNew === false) {
      // Already processed — acknowledge without re-processing
      return NextResponse.json({ ok: true, duplicate: true }, { status: 202 });
    }
  }
  const { data: row, error: rowErr } = await admin
    .from("payments")
    .select("id,user_id,report_id,status")
    .eq("provider_order_id", orderId)
    .single();
  if (rowErr) {
    console.error("[webhook/razorpay] failed to load payment row", rowErr);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!row) return NextResponse.json({ ok: true }, { status: 202 });

  if (event.event === "payment.captured") {
    // Fetch user email for the receipt — needed regardless of which branch runs.
    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", row.user_id)
      .single();
    const userEmail = profile?.email as string | undefined;

    if (row.report_id) {
      // Always reconcile via RPC when report_id exists; function is idempotent.
      const { error: rpcErr } = await admin.rpc("complete_webhook_payment", {
        p_payment_row_id: row.id,
        p_report_id: row.report_id,
        p_user_id: row.user_id,
        p_provider_payment_id: payment?.id as string,
        p_raw: payment as object,
      });
      if (rpcErr) {
        console.error("[webhook/razorpay] complete_webhook_payment failed", rpcErr);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    } else if (row.status !== "paid") {
      const { error: payErr } = await admin.from("payments").update({
        status: "paid",
        provider_payment_id: payment?.id as string,
        raw: payment as object,
      }).eq("id", row.id);
      if (payErr) {
        console.error("[webhook/razorpay] payment update failed", payErr);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      const { error: profileErr } = await admin
        .from("profiles")
        .update({ is_paid: true })
        .eq("id", row.user_id);
      if (profileErr) {
        console.error("[webhook/razorpay] profile update failed", profileErr);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    }

    // Fire-and-forget receipt email via Resend.
    // Set RESEND_API_KEY in Vercel env vars to enable (free tier: 3,000 emails/mo).
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && userEmail) {
      const amountFormatted = typeof payment?.amount === "number"
        ? (payment.currency === "INR"
            ? `₹${(payment.amount / 100).toFixed(0)}`
            : `$${(payment.amount / 100).toFixed(2)}`)
        : "—";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://styleai.app";
      const reportUrl = row.report_id ? `${appUrl}/report/${row.report_id}` : appUrl;

      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "StyleAI <noreply@styleai.app>",
          to: [userEmail],
          subject: "Your StyleAI report is unlocked 🎉",
          html: `
            <p>Hi there,</p>
            <p>Payment of <strong>${amountFormatted}</strong> confirmed. Your full AI beauty report is ready.</p>
            <p><a href="${reportUrl}" style="background:#C9956B;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600;">View Your Report</a></p>
            <p style="font-size:12px;color:#888;">
              If you need a refund within 30 days, reply to this email or visit
              <a href="${appUrl}/dashboard">your dashboard</a>.
            </p>
            <p style="font-size:12px;color:#888;">StyleAI · Your AI Personal Stylist</p>
          `,
        }),
      }).catch((e) => console.error("[webhook/razorpay] receipt email failed", e));
    }
  } else if (event.event === "payment.failed") {
    // Never regress paid -> failed.
    const { error: failErr } = await admin
      .from("payments")
      .update({ status: "failed", raw: payment as object })
      .eq("id", row.id)
      .neq("status", "paid");
    if (failErr) {
      console.error("[webhook/razorpay] failed-event update failed", failErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
