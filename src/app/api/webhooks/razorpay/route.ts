import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { PAYMENT_PRODUCTS } from "@/lib/payments/products";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  kickOffInfographicsInBackground,
  kickOffStyleGuideInfographicInBackground,
} from "@/lib/ai/kickoff-infographics";
import { scheduleInternalPost } from "@/lib/internal/schedule-job";

export const runtime = "nodejs";
const MAX_WEBHOOK_BYTES = 256 * 1024;

/**
 * POST /api/webhooks/razorpay
 *
 * Configure your webhook to send `payment.captured` and `payment.failed` events.
 * Signature validation is mandatory — never trust the body without it.
 */
export async function POST(req: NextRequest) {
  if (!env.razorpay.webhookSecret) {
    console.error("[webhook/razorpay] RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  if (!env.razorpay.keySecret) {
    console.error("[webhook/razorpay] RAZORPAY_KEY_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const raw = await req.text();
  if (raw.length > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const eventId = (event as Record<string, unknown>).id as string | undefined;
  if (eventId) {
    const { data: isNew, error: idempErr } = await admin.rpc("record_webhook_event", {
      p_provider: "razorpay",
      p_provider_event_id: eventId,
      p_event_type: event.event ?? "unknown",
      p_raw: event as unknown as Record<string, unknown>,
    });
    if (idempErr) {
      if (idempErr.code !== "42P01") {
        console.error("[webhook/razorpay] idempotency check failed", idempErr);
      }
    } else if (isNew === false) {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 202 });
    }
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id as string | undefined;
  if (!orderId) return NextResponse.json({ ok: true }, { status: 202 });
  const { data: row, error: rowErr } = await admin
    .from("payments")
    .select("id,user_id,report_id,status,product")
    .eq("provider_order_id", orderId)
    .single();
  if (rowErr) {
    console.error("[webhook/razorpay] failed to load payment row", rowErr);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!row) return NextResponse.json({ ok: true }, { status: 202 });

  const product = row.product ?? PAYMENT_PRODUCTS.reportUnlock;

  if (event.event === "payment.captured") {
    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", row.user_id)
      .single();
    const userEmail = profile?.email as string | undefined;

    if (row.report_id) {
      if (product === PAYMENT_PRODUCTS.styleGuideAddon) {
        const { error: rpcErr } = await admin.rpc("complete_style_guide_webhook_payment", {
          p_payment_row_id: row.id,
          p_report_id: row.report_id,
          p_user_id: row.user_id,
          p_provider_payment_id: payment?.id as string,
          p_raw: payment as object,
        });
        if (rpcErr) {
          console.error("[webhook/razorpay] complete_style_guide_webhook_payment failed", rpcErr);
          return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
      } else {
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

    if (row.report_id) {
      if (product === PAYMENT_PRODUCTS.styleGuideAddon) {
        kickOffStyleGuideInfographicInBackground(row.report_id, true);
      } else {
        kickOffInfographicsInBackground(row.report_id, { force: true });
        scheduleInternalPost("/api/internal/trigger-previews", { reportId: row.report_id });
      }
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && userEmail) {
      const amountFormatted = typeof payment?.amount === "number"
        ? (payment.currency === "INR"
            ? `₹${(payment.amount / 100).toFixed(0)}`
            : `$${(payment.amount / 100).toFixed(2)}`)
        : "—";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://renovaara.in";
      const reportUrl = row.report_id ? `${appUrl}/report/${row.report_id}` : appUrl;
      const isStyleGuide = product === PAYMENT_PRODUCTS.styleGuideAddon;

      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Renovaara <noreply@renovaara.in>",
          to: [userEmail],
          subject: isStyleGuide
            ? "Your Style Guide is generating"
            : "Your Renovaara report is unlocked",
          html: isStyleGuide
            ? `
            <p>Hi there,</p>
            <p>Payment of <strong>${amountFormatted}</strong> confirmed. Your personal Style Guide infographic is being generated.</p>
            <p><a href="${reportUrl}" style="background:#111827;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600;">View Your Report</a></p>
            <p style="font-size:12px;color:#888;">Renovaara · Your AI Personal Stylist</p>
          `
            : `
            <p>Hi there,</p>
            <p>Payment of <strong>${amountFormatted}</strong> confirmed. Your full AI beauty report is ready.</p>
            <p><a href="${reportUrl}" style="background:#111827;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600;">View Your Report</a></p>
            <p style="font-size:12px;color:#888;">
              This is a digital product delivered instantly to your account dashboard.
            </p>
            <p style="font-size:12px;color:#888;">Renovaara · Your AI Personal Stylist</p>
          `,
        }),
      }).catch((e) => console.error("[webhook/razorpay] receipt email failed", e));
    }
  } else if (event.event === "payment.failed") {
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

