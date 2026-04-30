import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRazorpay } from "@/lib/payments/razorpay";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({ reportId: z.string().uuid() });

/**
 * POST /api/payments/create
 * Creates a Razorpay order for the report-unlock SKU and stores the row.
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

    // Confirm the report belongs to this user
    const { data: report } = await supabase
      .from("reports")
      .select("id,is_paid")
      .eq("id", body.reportId)
      .eq("user_id", user.id)
      .single();
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (report.is_paid) return NextResponse.json({ error: "Already unlocked" }, { status: 400 });

    const amountMinor = Math.round(env.razorpay.priceINR * 100); // INR paise
    const currency = "INR";
    const admin = createSupabaseAdminClient();

    // Idempotent reuse: if we already created an order for this report, return it.
    const { data: existingCreated, error: existingErr } = await admin
      .from("payments")
      .select("provider_order_id,amount,currency")
      .eq("user_id", user.id)
      .eq("report_id", body.reportId)
      .eq("status", "created")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existingCreated) {
      return NextResponse.json({
        orderId: existingCreated.provider_order_id,
        amount: existingCreated.amount,
        currency: existingCreated.currency,
        keyId: env.razorpay.keyId,
      });
    }

    // Basic abuse guard: limit new order creation attempts per user per hour.
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCreateCount, error: throttleErr } = await admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgoIso);
    if (throttleErr) throw throttleErr;
    if ((recentCreateCount ?? 0) >= 20) {
      return NextResponse.json(
        { error: "Too many payment create attempts. Please try again later." },
        { status: 429 }
      );
    }

    const order = await getRazorpay().orders.create({
      amount: amountMinor,
      currency,
      receipt: `report_${body.reportId.slice(0, 18)}`,
      notes: { user_id: user.id, report_id: body.reportId },
    });

    const { error: insertErr } = await admin.from("payments").insert({
      user_id: user.id,
      report_id: body.reportId,
      provider: "razorpay",
      provider_order_id: order.id,
      amount: amountMinor,
      currency,
      status: "created",
      raw: order as unknown as object,
    });
    if (insertErr) {
      // Handle race between two create calls by re-reading existing created row.
      const { data: racedCreated } = await admin
        .from("payments")
        .select("provider_order_id,amount,currency")
        .eq("user_id", user.id)
        .eq("report_id", body.reportId)
        .eq("status", "created")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (racedCreated) {
        return NextResponse.json({
          orderId: racedCreated.provider_order_id,
          amount: racedCreated.amount,
          currency: racedCreated.currency,
          keyId: env.razorpay.keyId,
        });
      }

      throw insertErr;
    }

    return NextResponse.json({
      orderId: order.id,
      amount: amountMinor,
      currency,
      keyId: env.razorpay.keyId,
    });
  } catch (err) {
    console.error("[POST /api/payments/create]", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
