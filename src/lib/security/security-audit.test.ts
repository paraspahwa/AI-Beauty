/**
 * Automated security regression suite — logs results to the debug ingest endpoint
 * so runtime evidence is captured in debug-05ba8f.log during `npm test`.
 */
import { describe, expect, it, afterAll } from "vitest";
import { sanitizePostAuthPath } from "@/lib/auth/safe-redirect";
import { isSafeRemoteImageUrl } from "@/lib/security/remote-image";
import { parseVaultItemId } from "@/lib/vault/vault-item-id";
import { isManualPaidInfographicSection } from "@/lib/ai/run-analysis-infographics";

const DEBUG_INGEST =
  "http://127.0.0.1:7603/ingest/ce8eed60-72a3-493e-8294-0fdec667fec5";
const SESSION_ID = "05ba8f";

type AuditResult = {
  hypothesisId: string;
  area: string;
  passed: boolean;
  detail: string;
};

const auditResults: AuditResult[] = [];

function record(hypothesisId: string, area: string, passed: boolean, detail: string) {
  auditResults.push({ hypothesisId, area, passed, detail });
  expect(passed, `${area}: ${detail}`).toBe(true);
}

describe("security audit regression", () => {
  it("H1 — blocks encoded open redirects (sanitizePostAuthPath)", () => {
    const blocked = sanitizePostAuthPath("/%2f%2fevil.com");
    record("H1", "open-redirect", blocked === "/upload", `encoded redirect => ${blocked}`);
  });

  it("H2 — blocks SSRF to cloud metadata (isSafeRemoteImageUrl)", () => {
    const blocked = !isSafeRemoteImageUrl("https://169.254.169.254/latest/meta-data/");
    record("H2", "ssrf-metadata", blocked, "169.254.169.254 blocked");
  });

  it("H3 — vault item IDs cannot target arbitrary sections", () => {
    const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const forged = parseVaultItemId(`${reportId}:analysis:__proto__`);
    record("H3", "vault-item-id", forged === null, "forged section rejected");
  });

  it("H4 — faceFeaturesPreview is not a manual paid section", () => {
    record(
      "H4",
      "infographic-sections",
      !isManualPaidInfographicSection("faceFeaturesPreview"),
      "preview section excluded from manual generate",
    );
  });

  it("H5 — no stale debug exfiltration endpoints in API routes", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");

    const srcRoot = join(process.cwd(), "src");
    const stalePattern = /127\.0\.0\.1:7365\/ingest/;
    const offenders: string[] = [];

    function walk(dir: string) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
          const content = readFileSync(full, "utf8");
          if (stalePattern.test(content)) offenders.push(full);
        }
      }
    }

    walk(srcRoot);
    record("H5", "debug-exfiltration", offenders.length === 0, `stale endpoints: ${offenders.length}`);
  });

  it("H6 — next.config defines CSP and HSTS", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(join(process.cwd(), "next.config.js"), "utf8");
    const hasCsp = source.includes("Content-Security-Policy") && source.includes("default-src 'self'");
    const hasHsts = source.includes("Strict-Transport-Security");
    record("H6", "csp-headers", hasCsp && hasHsts, `csp=${hasCsp} hsts=${hasHsts}`);
  });

  it("H7 — rate-limit RPC failure uses in-memory cap (not fail-open)", async () => {
    const { consumeIdentityWindow, resetInMemoryRateLimitWindowsForTests } = await import("@/lib/rate-limit");
    resetInMemoryRateLimitWindowsForTests();
    const admin = {
      rpc: async (name: string) => {
        if (name === "get_user_plan_tier") return { data: "report", error: null };
        return { data: null, error: { message: "down" } };
      },
    } as unknown as Parameters<typeof consumeIdentityWindow>[0];

    const policy = {
      action: "audit_in_memory_cap",
      windowSeconds: 3600,
      caps: { free: 0, report: 1, studio_pro: 1 },
    } as const;

    const first = await consumeIdentityWindow(admin, "audit-user", policy);
    const second = await consumeIdentityWindow(admin, "audit-user", policy);
    record("H7", "rate-limit-fallback", first.allowed && !second.allowed, `first=${first.allowed} second=${second.allowed}`);
  });

  it("H8 — mobile Android cleartext disabled", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const appJson = JSON.parse(readFileSync(join(process.cwd(), "apps", "mobile", "app.json"), "utf8"));
    const buildProps = appJson.expo.plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === "expo-build-properties",
    ) as [string, { android?: { usesCleartextTraffic?: boolean } }] | undefined;
    const disabled = buildProps?.[1]?.android?.usesCleartextTraffic === false;
    record("H8", "mobile-cleartext", disabled, `usesCleartextTraffic=${buildProps?.[1]?.android?.usesCleartextTraffic}`);
  });
});

afterAll(async () => {
  const summary = {
    total: auditResults.length,
    passed: auditResults.filter((r) => r.passed).length,
    failed: auditResults.filter((r) => !r.passed).length,
    results: auditResults,
  };

  await fetch(DEBUG_INGEST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      runId: "security-audit",
      location: "security-audit.test.ts:afterAll",
      message: "security audit complete",
      data: summary,
      timestamp: Date.now(),
      hypothesisId: "ALL",
    }),
  }).catch(() => {});
});
