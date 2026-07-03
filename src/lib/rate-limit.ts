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

type FallbackEntry = { count: number; resetAt: number };
const fallbackWindows = new Map<string, FallbackEntry>();
const FALLBACK_MAP_MAX = 8192;

function consumeInMemoryWindow(
  userId: string,
  action: string,
  cap: number,
  windowSeconds: number,
): boolean {
  const now = Date.now();
  const key = `${userId}:${action}`;
  let entry = fallbackWindows.get(key);

  if (!entry || now > entry.resetAt) {
    if (!entry && fallbackWindows.size >= FALLBACK_MAP_MAX) {
      const firstKey = fallbackWindows.keys().next().value;
      if (firstKey !== undefined) fallbackWindows.delete(firstKey);
    }
    fallbackWindows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }

  if (entry.count >= cap) {
    return false;
  }

  entry.count += 1;
  return true;
}

/** Test-only reset for in-memory fallback windows. */
export function resetInMemoryRateLimitWindowsForTests(): void {
  fallbackWindows.clear();
}

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
    // RPC unavailable — enforce cap via in-process fallback instead of failing open.
    console.warn("[rate-limit] try_consume_window failed; using in-memory fallback", error.message);
    const allowed = consumeInMemoryWindow(userId, policy.action, cap, policy.windowSeconds);
    return {
      allowed,
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
