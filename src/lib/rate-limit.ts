import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type PlanTier = "free" | "report" | "studio_pro";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type IdentityWindowPolicy = {
  action: string;
  windowSeconds: number;
  caps: Record<PlanTier, number>;
};

export type IdentityWindowDecision = {
  allowed: boolean;
  action: string;
  tier: PlanTier;
  cap: number;
  windowSeconds: number;
  retryAfterSeconds: number;
};

const FALLBACK_TIER: PlanTier = "free";

function normalizeTier(value: unknown): PlanTier {
  if (value === "studio_pro" || value === "report" || value === "free") {
    return value;
  }
  return FALLBACK_TIER;
}

export async function getUserPlanTier(admin: AdminClient, userId: string): Promise<PlanTier> {
  const { data, error } = await admin.rpc("get_user_plan_tier", { p_user: userId });
  if (error) {
    console.warn("[rate-limit] get_user_plan_tier failed", error.message);
    return FALLBACK_TIER;
  }
  return normalizeTier(data);
}

export async function consumeIdentityWindow(
  admin: AdminClient,
  userId: string,
  policy: IdentityWindowPolicy,
): Promise<IdentityWindowDecision> {
  const tier = await getUserPlanTier(admin, userId);
  const cap = policy.caps[tier] ?? policy.caps.free;

  if (cap <= 0) {
    return {
      allowed: false,
      action: policy.action,
      tier,
      cap,
      windowSeconds: policy.windowSeconds,
      retryAfterSeconds: policy.windowSeconds,
    };
  }

  const { data, error } = await admin.rpc("try_consume_window", {
    p_user: userId,
    p_action: policy.action,
    p_cap: cap,
    p_window_seconds: policy.windowSeconds,
  });

  if (error) {
    // Fail open to avoid blocking production traffic if migration has not been applied yet.
    console.warn("[rate-limit] try_consume_window failed", error.message);
    return {
      allowed: true,
      action: policy.action,
      tier,
      cap,
      windowSeconds: policy.windowSeconds,
      retryAfterSeconds: policy.windowSeconds,
    };
  }

  return {
    allowed: Boolean(data),
    action: policy.action,
    tier,
    cap,
    windowSeconds: policy.windowSeconds,
    retryAfterSeconds: policy.windowSeconds,
  };
}
