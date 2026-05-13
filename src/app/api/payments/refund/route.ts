import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const REFUND_WINDOW_DAYS = 30;

/**
 * POST /api/payments/refund
 *
 * Accepts a refund request from an authenticated user within the 30-day window.
 * Sets payment status to 'refund_requested' for manual processing in the
 * Razorpay dashboard. A full automatic refund via razorpay.payments.refund()
 * can be wired here when that flow is ready.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow optional report_id to refund a specific report; otherwise refund most recent.
    let reportId: string | undefined;
    try {
      const body = await req.json() as { reportId?: string };
      reportId = body.reportId;
    } catch {
      // body is optional
    }

    const admin = createSupabaseAdminClient();

    // Find the most recent paid payment for this user (optionally scoped to report)
    const query = admin
      .from("payments")
      .select("id, user_id, report_id, status, created_at, provider_payment_id")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1);

    if (reportId) {
      query.eq("report_id", reportId);
    }

    const { data: payment, error: fetchErr } = await query.single();

    if (fetchErr || !payment) {
      return NextResponse.json(
        { error: "No eligible paid transaction found for your account." },
        { status: 404 },
      );
    }

    // Enforce 30-day refund window
    const paidAt = new Date(payment.created_at as string);
    const daysSincePurchase = (Date.now() - paidAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > REFUND_WINDOW_DAYS) {
      return NextResponse.json(
        { error: `Refund window has closed. Refunds are available within ${REFUND_WINDOW_DAYS} days of purchase.` },
        { status: 422 },
      );
    }

    // Mark as refund_requested — prevents duplicate requests
    const { error: updateErr } = await admin
      .from("payments")
      .update({ status: "refund_requested" })
      .eq("id", payment.id)
      .eq("status", "paid"); // only transition from paid → refund_requested

    if (updateErr) {
      console.error("[payments/refund] update failed", updateErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Fire-and-forget: notify internally via Resend if configured.
    // Set RESEND_API_KEY + REFUND_NOTIFY_EMAIL in Vercel env vars to enable.
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.REFUND_NOTIFY_EMAIL;
    if (resendKey && notifyEmail) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Renovaara <noreply@renovaara.in>",
          to: [notifyEmail],
          subject: `[Refund Request] User ${user.email} — Payment ${payment.id}`,
          text: [
            `User: ${user.email} (${user.id})`,
            `Payment ID: ${payment.id}`,
            `Provider Payment ID: ${payment.provider_payment_id ?? "—"}`,
            `Report ID: ${payment.report_id ?? "—"}`,
            `Purchased: ${paidAt.toISOString()}`,
            `Days since purchase: ${Math.floor(daysSincePurchase)}`,
            `Action: Process refund in Razorpay dashboard and update status to "refunded".`,
          ].join("\n"),
        }),
      }).catch((e) => console.error("[payments/refund] notify email failed", e));
    }

    return NextResponse.json({
      ok: true,
      message: "Refund request received. You will be processed within 3–5 business days.",
    });
  } catch (err) {
    console.error("[payments/refund] unexpected error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

