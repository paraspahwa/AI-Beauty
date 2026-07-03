import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeIdentityWindow,
  resetInMemoryRateLimitWindowsForTests,
  type IdentityWindowPolicy,
} from "./rate-limit";

const TEST_POLICY: IdentityWindowPolicy = {
  action: "test_action_rpc_fallback",
  windowSeconds: 3600,
  caps: { free: 0, report: 2, studio_pro: 2 },
};

function mockAdmin(rpcImpl: (name: string) => Promise<{ data: unknown; error: unknown }>) {
  return {
    rpc: vi.fn((name: string) => rpcImpl(name)),
  } as unknown as Parameters<typeof consumeIdentityWindow>[0];
}

describe("consumeIdentityWindow", () => {
  beforeEach(() => {
    resetInMemoryRateLimitWindowsForTests();
  });

  it("uses in-memory fallback when RPC fails and enforces cap", async () => {
    const admin = mockAdmin(async (name) => {
      if (name === "get_user_plan_tier") return { data: "report", error: null };
      return { data: null, error: { message: "rpc unavailable" } };
    });

    const userId = "user-rate-limit-test-1";
    const first = await consumeIdentityWindow(admin, userId, TEST_POLICY);
    const second = await consumeIdentityWindow(admin, userId, TEST_POLICY);
    const third = await consumeIdentityWindow(admin, userId, TEST_POLICY);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
  });

  it("returns allowed=false when tier cap is zero", async () => {
    const admin = mockAdmin(async (name) => {
      if (name === "get_user_plan_tier") return { data: "free", error: null };
      return { data: true, error: null };
    });
    const decision = await consumeIdentityWindow(admin, "free-user", {
      action: "zero_cap_action",
      windowSeconds: 60,
      caps: { free: 0, report: 5, studio_pro: 5 },
    });

    expect(decision.allowed).toBe(false);
    expect(admin.rpc).toHaveBeenCalledWith("get_user_plan_tier", { p_user: "free-user" });
    const tryConsumeCalls = (admin.rpc as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([name]) => name === "try_consume_window",
    );
    expect(tryConsumeCalls).toHaveLength(0);
  });
});
