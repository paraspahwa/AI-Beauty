import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPORT_ONLY_API_ROUTES = new Set([
  "/api/analyze",
  "/api/reports/",
  "/api/payments/create",
  "/api/payments/verify",
  "/api/vault",
]);

function listApiRoutePrefixes(): Set<string> {
  const apiRoot = join(process.cwd(), "src", "app", "api");
  const routes = new Set<string>();

  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, `${prefix}/${entry}`);
      } else if (entry === "route.ts") {
        routes.add(prefix);
      }
    }
  }

  walk(apiRoot, "/api");
  return routes;
}

describe("mobile security surface", () => {
  it("disables Android cleartext traffic in Expo build properties", () => {
    const appJson = JSON.parse(readFileSync(join(process.cwd(), "apps", "mobile", "app.json"), "utf8")) as {
      expo: { plugins: unknown[] };
    };
    const buildProps = appJson.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties",
    ) as [string, { android?: { usesCleartextTraffic?: boolean } }] | undefined;

    expect(buildProps?.[1]?.android?.usesCleartextTraffic).toBe(false);
  });

  it("stores Supabase session in SecureStore adapter", () => {
    const source = readFileSync(join(process.cwd(), "apps", "mobile", "lib", "supabase.ts"), "utf8");
    expect(source).toContain("expo-secure-store");
    expect(source).toContain("SecureStore.getItemAsync");
  });

  it("report screen only calls report-only API routes that still exist", () => {
    const reportScreen = readFileSync(
      join(process.cwd(), "apps", "mobile", "app", "report", "[id].tsx"),
      "utf8",
    );
    const apiRoutes = listApiRoutePrefixes();

    for (const required of REPORT_ONLY_API_ROUTES) {
      if (required === "/api/reports/") {
        expect(apiRoutes.has("/api/reports/[id]")).toBe(true);
        continue;
      }
      const exists = [...apiRoutes].some((route) => route === required || route.startsWith(required));
      expect(exists, `missing server route for ${required}`).toBe(true);
    }

    expect(reportScreen).toContain("fetchReport");
    expect(reportScreen).toContain("ReportLayout");
    expect(reportScreen).not.toContain("/api/studio/");
  });

  it("mobile api client is report-only", () => {
    const apiSource = readFileSync(join(process.cwd(), "apps", "mobile", "lib", "api.ts"), "utf8");
    expect(apiSource).toContain("fetchVault");
    expect(apiSource).toContain("generateInfographic");
    expect(apiSource).not.toContain("/api/studio/");
    expect(apiSource).not.toContain("/api/chat");
    expect(apiSource).not.toContain("/api/subscriptions");
  });

  it("sanitizes API error text before surfacing to users", () => {
    const apiSource = readFileSync(join(process.cwd(), "apps", "mobile", "lib", "api.ts"), "utf8");
    expect(apiSource).toContain("sanitizeApiErrorText");
    expect(apiSource).toMatch(/\\x00-\\x1F\\x7F/);
  });
});
