import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRazorpay } from "@/lib/payments/razorpay";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const Body = z.object({ reportId: z.string().uuid() });

/**
 * POST /api/payments/create
 * Creates a Razorpay order for the report-unlock SKU and stores the row.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = Body.parse(await req.json());

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

    const order = await getRazorpay().orders.create({
      amount: amountMinor,
      currency,
      receipt: `report_${body.reportId.slice(0, 18)}`,
      notes: { user_id: user.id, report_id: body.reportId },
    });

    const admin = createSupabaseAdminClient();
    await admin.from("payments").insert({
      user_id: user.id,
      report_id: body.reportId,
      provider: "razorpay",
      provider_order_id: order.id,
      amount: amountMinor,
      currency,
      status: "created",
      raw: order as unknown as object,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: amountMinor,
      currency,
      keyId: env.razorpay.keyId,
    });
  } catch (err) {
    console.error("[POST /api/payments/create]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
