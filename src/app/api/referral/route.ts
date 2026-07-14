import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile with referral info (using admin to bypass RLS)
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, referral_code, referral_credits, referred_by")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get referral redemptions (who they referred)
    const { data: redemptions } = await admin
      .from("referral_redemptions")
      .select("status, created_at, completed_at, referred_id")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    // Get being referred by info
    let referredByName: string | null = null;
    if (profile.referred_by) {
      const { data: referrer } = await admin
        .from("profiles")
        .select("full_name, email")
        .eq("id", profile.referred_by)
        .single();
      referredByName = referrer?.full_name ?? referrer?.email ?? null;
    }

    return NextResponse.json({
      referralCode: profile.referral_code,
      credits: profile.referral_credits,
      referredBy: referredByName,
      redemptions: (redemptions ?? []).map((r) => ({
        status: r.status,
        createdAt: r.created_at,
        completedAt: r.completed_at,
      })),
    });
  } catch (err) {
    console.error("[referral GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
