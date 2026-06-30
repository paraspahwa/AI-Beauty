import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRazorpay } from "@/lib/payments/razorpay";
import { PAYMENT_PRODUCTS } from "@/lib/payments/products";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request-user";
import { env } from "@/lib/env";
import type { PaymentProduct } from "@/types/report";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  reportId: z.string().uuid(),
  product: z.enum(["report_unlock", "style_guide_addon"]).default("report_unlock"),
  currencyHint: z.enum(["INR", "USD"]).optional(),
});

function deriveServerCurrency(
  req: NextRequest,
  hint?: "INR" | "USD",
): "INR" | "USD" {
  const cfCountry =
    req.headers.get("CF-IPCountry") ??
    req.headers.get("X-Vercel-IP-Country") ??
    "";
  if (cfCountry.toUpperCase() === "IN") return "INR";
  if (cfCountry.length > 0) return "USD";
  return hint ?? "INR";
}

function amountForProduct(product: PaymentProduct, currency: "INR" | "USD"): number {
  if (product === PAYMENT_PRODUCTS.styleGuideAddon) {
    return currency === "USD"
      ? Math.round(env.razorpay.styleGuidePriceUSD * 100)
      : Math.round(env.razorpay.styleGuidePriceINR * 100);
  }
  return currency === "USD"
    ? Math.round(env.razorpay.priceUSD * 100)
    : Math.round(env.razorpay.priceINR * 100);
}

function receiptForProduct(product: PaymentProduct, reportId: string): string {
  const prefix = product === PAYMENT_PRODUCTS.styleGuideAddon ? "style_guide" : "report";
  return `${prefix}_${reportId.slice(0, 18)}`;
}

function testOrderIdForProduct(product: PaymentProduct, reportId: string): string {
  const suffix = product === PAYMENT_PRODUCTS.styleGuideAddon ? "sg" : "rpt";
  return `test_order_${suffix}_${reportId.replace(/-/g, "")}`;
}

/**
 * POST /api/payments/create
 * Creates a Razorpay order for report unlock or Style Guide add-on.
 */
export async function POST(req: NextRequest) {
  try {
    env.assertServer();
    const user = await getRequestUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();

    let body: z.infer<typeof Body>;
    try {
      body = Body.parse(await req.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const product = body.product;

    const { data: report } = await admin
      .from("reports")
      .select("id,is_paid,is_style_guide_paid,body_image_path")
      .eq("id", body.reportId)
      .eq("user_id", user.id)
      .single();
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    if (product === PAYMENT_PRODUCTS.reportUnlock) {
      if (report.is_paid) return NextResponse.json({ error: "Already unlocked" }, { status: 400 });
    } else {
      if (!report.is_paid) {
        return NextResponse.json({ error: "Unlock the main report first" }, { status: 400 });
      }
      if (!report.body_image_path) {
        return NextResponse.json({ error: "Upload a full-body photo first" }, { status: 400 });
      }
      if (report.is_style_guide_paid) {
        return NextResponse.json({ error: "Style Guide already unlocked" }, { status: 400 });
      }
    }

    const allowTestMode =
      env.flags.paymentTestMode &&
      (process.env.NODE_ENV !== "production" || env.flags.paymentTestAllowInProd);
    const razorpayConfigured = env.razorpay.isConfigured;

    if (!razorpayConfigured && !allowTestMode) {
      return NextResponse.json(
        {
          error: "Payments are not configured in this environment",
          code: "PAYMENT_NOT_CONFIGURED",
          retryable: false,
        },
        { status: 503 },
      );
    }

    const currency = deriveServerCurrency(req, body.currencyHint);
    const amountMinor = amountForProduct(product, currency);

    const { data: existingCreated, error: existingErr } = await admin
      .from("payments")
      .select("provider_order_id,amount,currency,product")
      .eq("user_id", user.id)
      .eq("report_id", body.reportId)
      .eq("product", product)
      .eq("status", "created")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existingCreated) {
      return NextResponse.json({
        product,
        mode: existingCreated.provider_order_id.startsWith("test_order_") ? "test" : "real",
        requiresRealCheckout: !existingCreated.provider_order_id.startsWith("test_order_"),
        orderId: existingCreated.provider_order_id,
        amount: existingCreated.amount,
        currency: existingCreated.currency,
        keyId: existingCreated.provider_order_id.startsWith("test_order_") ? null : env.razorpay.keyId,
      });
    }

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
        { status: 429 },
      );
    }

    if (!razorpayConfigured && allowTestMode) {
      const testOrderId = testOrderIdForProduct(product, body.reportId);

      const { error: testInsertErr } = await admin.from("payments").insert({
        user_id: user.id,
        report_id: body.reportId,
        product,
        provider: "razorpay",
        provider_order_id: testOrderId,
        amount: amountMinor,
        currency,
        status: "created",
        raw: {
          test_mode: true,
          product,
          created_via: "api/payments/create",
          created_at: new Date().toISOString(),
        },
      });

      if (testInsertErr) {
        const { data: racedCreated } = await admin
          .from("payments")
          .select("provider_order_id,amount,currency")
          .eq("user_id", user.id)
          .eq("report_id", body.reportId)
          .eq("product", product)
          .eq("status", "created")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (racedCreated) {
          return NextResponse.json({
            product,
            mode: racedCreated.provider_order_id.startsWith("test_order_") ? "test" : "real",
            requiresRealCheckout: !racedCreated.provider_order_id.startsWith("test_order_"),
            orderId: racedCreated.provider_order_id,
            amount: racedCreated.amount,
            currency: racedCreated.currency,
            keyId: racedCreated.provider_order_id.startsWith("test_order_") ? null : env.razorpay.keyId,
          });
        }

        throw testInsertErr;
      }

      return NextResponse.json({
        product,
        mode: "test",
        requiresRealCheckout: false,
        orderId: testOrderId,
        amount: amountMinor,
        currency,
        keyId: null,
      });
    }

    const order = await getRazorpay().orders.create({
      amount: amountMinor,
      currency,
      receipt: receiptForProduct(product, body.reportId),
      notes: { user_id: user.id, report_id: body.reportId, product },
    });

    const { error: insertErr } = await admin.from("payments").insert({
      user_id: user.id,
      report_id: body.reportId,
      product,
      provider: "razorpay",
      provider_order_id: order.id,
      amount: amountMinor,
      currency,
      status: "created",
      raw: order as unknown as object,
    });
    if (insertErr) {
      const { data: racedCreated } = await admin
        .from("payments")
        .select("provider_order_id,amount,currency")
        .eq("user_id", user.id)
        .eq("report_id", body.reportId)
        .eq("product", product)
        .eq("status", "created")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (racedCreated) {
        return NextResponse.json({
          product,
          orderId: racedCreated.provider_order_id,
          amount: racedCreated.amount,
          currency: racedCreated.currency,
          keyId: env.razorpay.keyId,
        });
      }

      throw insertErr;
    }

    return NextResponse.json({
      product,
      mode: "real",
      requiresRealCheckout: true,
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
