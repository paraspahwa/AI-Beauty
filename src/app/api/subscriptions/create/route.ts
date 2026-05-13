/**
 * POST /api/subscriptions/create
 *
 * Creates a Razorpay subscription for the Studio Pro plan and stores
 * the pending row in the subscriptions table.
 *
 * Body: { currencyHint?: "INR" | "USD" }
 * Returns: { subscriptionId, keyId, currency, amount, interval }
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRazorpay } from "@/lib/payments/razorpay";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  currencyHint: z.enum(["INR", "USD"]).optional(),
});

function deriveServerCurrency(req: NextRequest, hint?: "INR" | "USD"): "INR" | "USD" {
  const country =
    req.headers.get("CF-IPCountry") ??
    req.headers.get("X-Vercel-IP-Country") ??
    "";
  if (country.toUpperCase() === "IN") return "INR";
  if (country.length > 0) return "USD";
  return hint ?? "INR";
}

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

    const currency = deriveServerCurrency(req, body.currencyHint);
    const admin = createSupabaseAdminClient();

    // Resolve plan_id and Razorpay Plan ID from env
    const planId = currency === "INR"
      ? "studio_pro_inr_999_monthly"
      : "studio_pro_usd_1299_monthly";

    const razorpayPlanId = currency === "INR"
      ? env.razorpay.planIdStudioProINR
      : env.razorpay.planIdStudioProUSD;

    if (!razorpayPlanId) {
      return NextResponse.json(
        {
          error: "Studio Pro subscriptions are not yet configured. Set RAZORPAY_PLAN_ID_STUDIO_PRO_INR / _USD in Vercel env vars.",
          code: "SUBSCRIPTION_NOT_CONFIGURED",
          retryable: false,
        },
        { status: 503 },
      );
    }

    if (!env.razorpay.isConfigured) {
      return NextResponse.json(
        { error: "Payments are not configured in this environment", code: "PAYMENT_NOT_CONFIGURED", retryable: false },
        { status: 503 },
      );
    }

    // Idempotency: return existing pending subscription if one exists
    const { data: existing } = await admin
      .from("subscriptions")
      .select("provider_subscription_id, plan_id")
      .eq("user_id", user.id)
      .eq("plan_id", planId)
      .eq("status", "created")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.provider_subscription_id) {
      return NextResponse.json({
        subscriptionId: existing.provider_subscription_id,
        keyId: env.razorpay.keyId,
        currency,
        planId,
      });
    }

    // Throttle: max 5 subscription create attempts per user per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }

    // Create Razorpay subscription — SDK types don't expose .subscriptions, cast via unknown
    const rz = getRazorpay();
    // @ts-ignore
    const sub = await (rz as unknown as Record<string, { create: (o: unknown) => Promise<{ id: string }> }>).subscriptions.create({
      plan_id:       razorpayPlanId,
      total_count:   120,         // max billing cycles (10 years — effectively unlimited)
      quantity:      1,
      notes:         { user_id: user.id },
    });

    // Persist to DB
    await admin.from("subscriptions").insert({
      user_id:                  user.id,
      plan_id:                  planId,
      provider:                 "razorpay",
      provider_subscription_id: sub.id,
      status:                   "created",
      raw:                      sub as object,
    });

    return NextResponse.json({
      subscriptionId: sub.id,
      keyId:          env.razorpay.keyId,
      currency,
      planId,
    });
  } catch (err) {
    console.error("[subscriptions/create]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
