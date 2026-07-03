import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile API base URL validation (source parity)", () => {
  const source = readFileSync(join(process.cwd(), "apps", "mobile", "lib", "env.ts"), "utf8");

  it("enforces https outside development builds", () => {
    expect(source).toContain('parsedUrl.protocol !== "https:"');
    expect(source).toContain("!__DEV__");
  });

  it("blocks localhost API hosts in production", () => {
    expect(source).toContain("isLocalhostHost");
    expect(source).toContain("cannot point to localhost in production");
  });

  it("requires configured API base URL", () => {
    expect(source).toContain("Missing EXPO_PUBLIC_API_BASE_URL");
    expect(source).toContain("getValidatedMobileApiBaseUrl");
  });
});
