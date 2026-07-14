import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { code } = (await request.json()) as { code?: string };
    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, error: "Code is required" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { data: coupon, error } = await supabase
      .from("coupon_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !coupon) {
      return NextResponse.json({ valid: false, error: "Invalid or expired coupon code" });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "This coupon has expired" });
    }

    if (coupon.use_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: "This coupon has reached its usage limit" });
    }

    return NextResponse.json({
      valid: true,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      note: coupon.note,
    });
  } catch (err) {
    console.error("[coupon validate]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
