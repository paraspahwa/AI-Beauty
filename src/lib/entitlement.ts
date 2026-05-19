/**
 * Server-side entitlement helper.
 *
 * Calls the get_studio_entitlement Supabase RPC and returns a typed result
 * describing the user's current plan tier and remaining AI-generation quota.
 *
 * Import only in server code (API routes, page.tsx, server actions).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type PlanTier = "free" | "report" | "studio_pro";

export interface StudioEntitlement {
  tier: PlanTier;
  /** Monthly AI gens remaining. null for free/report (not metered at account level). */
  remainingGens: number | null;
  /** Monthly AI gens used this period. null for free/report. */
  usedGens: number | null;
  /** Hard cap for this tier. 150 for studio_pro, null otherwise. */
  cap: number | null;
  /** ISO date string of next period reset. null for free/report. */
  periodResets: string | null;
  /** Supabase UUID of the active subscription row. null if no subscription. */
  subscriptionId: string | null;
}

const FALLBACK: StudioEntitlement = {
  tier: "free",
  remainingGens: null,
  usedGens: null,
  cap: null,
  periodResets: null,
  subscriptionId: null,
};

export async function getStudioEntitlement(userId: string): Promise<StudioEntitlement> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("get_studio_entitlement", { p_user: userId });
    if (error || !data) {
      console.warn("[entitlement] get_studio_entitlement failed", error?.message);
      return FALLBACK;
    }
    return {
      tier:           (data.tier as PlanTier) ?? "free",
      remainingGens:  data.remaining_gens  ?? null,
      usedGens:       data.used_gens       ?? null,
      cap:            data.cap             ?? null,
      periodResets:   data.period_resets   ?? null,
      subscriptionId: data.subscription_id ?? null,
    };
  } catch (err) {
    console.warn("[entitlement] unexpected error", err);
    return FALLBACK;
  }
}

/**
 * Returns true when the user has active studio_pro subscription.
 * Use this to decide if generation routes should apply monthly quota.
 */
export function isStudioPro(entitlement: StudioEntitlement): boolean {
  return entitlement.tier === "studio_pro";
}

/**
 * Canvas Quota interface for standalone try-on mode
 * Free users: 3 gens/month on canvas
 * Paid users: 3 gens/month on canvas (separate from report studio)
 * Studio Pro: Unlimited
 */
export interface CanvasQuota {
  tier: PlanTier;
  remaining: number;
  used: number;
  limit: number;
  periodResets: string | null;
}

/**
 * Get canvas try-on quota for user.
 * Returns remaining generations for THIS MONTH in canvas mode.
 */
export async function getCanvasQuota(userId: string): Promise<CanvasQuota> {
  try {
    const admin = createSupabaseAdminClient();
    
    // Get user tier
    const entitlement = await getStudioEntitlement(userId);
    
    // Studio Pro = unlimited
    if (entitlement.tier === "studio_pro") {
      return {
        tier: "studio_pro",
        remaining: 999,
        used: 0,
        limit: 999,
        periodResets: entitlement.periodResets,
      };
    }

    // Free / Report tier = 3 gens/month on canvas
    // Count canvas generations this month (studio_canvas_id IS NOT NULL)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { count, error } = await admin
      .from("generated_assets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("studio_canvas_id", "is", null)
      .gte("created_at", monthStart.toISOString());

    if (error) {
      console.warn("[getCanvasQuota] count query failed:", error.message);
      return {
        tier: entitlement.tier,
        remaining: 3,
        used: 0,
        limit: 3,
        periodResets: null,
      };
    }

    const used = count ?? 0;
    const limit = 3;
    const remaining = Math.max(0, limit - used);

    return {
      tier: entitlement.tier,
      remaining,
      used,
      limit,
      periodResets: entitlement.periodResets,
    };
  } catch (err) {
    console.warn("[getCanvasQuota] unexpected error:", err);
    return {
      tier: "free",
      remaining: 3,
      used: 0,
      limit: 3,
      periodResets: null,
    };
  }
}
