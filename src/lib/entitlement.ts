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
