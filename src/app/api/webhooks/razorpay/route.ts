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

  let event: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> }; subscription?: { entity?: Record<string, unknown> } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // ── Subscription events ─────────────────────────────────────────────────────
  const subEventTypes = [
    "subscription.activated",
    "subscription.charged",
    "subscription.halted",
    "subscription.cancelled",
    "subscription.completed",
  ];
  if (event.event && subEventTypes.includes(event.event)) {
    return handleSubscriptionEvent(event.event, event.payload?.subscription?.entity, admin);
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id as string | undefined;
  if (!orderId) return NextResponse.json({ ok: true }, { status: 202 }); // ignore non-payment events

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

    // Fire-and-forget: kick off Pro-quality visual generation now that is_paid = true.
    // trigger-visuals is idempotent — already-ready slots (color swatches, palette) are skipped;
    // only the locked glasses/hair/makeup slots (still "missing") will be generated at Pro quality.
    if (row.report_id) {
      const internalSecret = process.env.INTERNAL_API_SECRET;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://renovaara.in";
      if (internalSecret) {
        fetch(`${appUrl}/api/internal/trigger-visuals`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({ reportId: row.report_id }),
        }).catch((e) => console.error("[webhook/razorpay] trigger-visuals fire failed", e));
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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://renovaara.in";
      const reportUrl = row.report_id ? `${appUrl}/report/${row.report_id}` : appUrl;

      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Renovaara <noreply@renovaara.in>",
          to: [userEmail],
          subject: "Your Renovaara report is unlocked 🎉",
          html: `
            <p>Hi there,</p>
            <p>Payment of <strong>${amountFormatted}</strong> confirmed. Your full AI beauty report is ready.</p>
            <p><a href="${reportUrl}" style="background:#8B5CF6;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600;">View Your Report</a></p>
            <p style="font-size:12px;color:#888;">
              This is a digital product delivered instantly to your account dashboard.
            </p>
            <p style="font-size:12px;color:#888;">Renovaara · Your AI Personal Stylist</p>
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

// ── Subscription event handler ─────────────────────────────────────────────────
async function handleSubscriptionEvent(
  eventType: string,
  entity: Record<string, unknown> | undefined,
  admin: ReturnType<typeof import("@/lib/supabase/server").createSupabaseAdminClient>,
): Promise<Response> {
  if (!entity) return NextResponse.json({ ok: true }, { status: 202 });

  const providerSubId = entity.id as string | undefined;
  if (!providerSubId) return NextResponse.json({ ok: true }, { status: 202 });

  const now = new Date().toISOString();

  // Build the update payload based on event type
  let statusUpdate: Record<string, unknown> = { updated_at: now, raw: entity };

  if (eventType === "subscription.activated") {
    statusUpdate.status = "active";
    if (entity.current_start) {
      statusUpdate.current_period_start = new Date((entity.current_start as number) * 1000).toISOString();
    }
    if (entity.current_end) {
      statusUpdate.current_period_end = new Date((entity.current_end as number) * 1000).toISOString();
    }
  } else if (eventType === "subscription.charged") {
    // Monthly renewal — advance the billing period
    statusUpdate.status = "active";
    if (entity.current_start) {
      statusUpdate.current_period_start = new Date((entity.current_start as number) * 1000).toISOString();
    }
    if (entity.current_end) {
      statusUpdate.current_period_end = new Date((entity.current_end as number) * 1000).toISOString();
    }
    // Reset monthly generation counter for the new period
    const { data: sub } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("provider_subscription_id", providerSubId)
      .single();
    if (sub?.user_id) {
      const newPeriodStart = entity.current_start
        ? new Date(new Date((entity.current_start as number) * 1000).getFullYear(),
            new Date((entity.current_start as number) * 1000).getMonth(), 1)
            .toISOString().split("T")[0]
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      // Insert a fresh counter for the new period (upsert — safe if already exists)
      await admin.from("usage_counters").upsert(
        { user_id: sub.user_id, period_start: newPeriodStart, ai_generations: 0 },
        { onConflict: "user_id,period_start", ignoreDuplicates: true },
      );
    }
  } else if (eventType === "subscription.halted") {
    statusUpdate.status = "halted";
  } else if (eventType === "subscription.cancelled" || eventType === "subscription.completed") {
    statusUpdate.status = "cancelled";
    statusUpdate.cancelled_at = now;
  }

  const { error } = await admin
    .from("subscriptions")
    .update(statusUpdate)
    .eq("provider_subscription_id", providerSubId);

  if (error) {
    console.error(`[webhook/razorpay] ${eventType} db update failed`, error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}

