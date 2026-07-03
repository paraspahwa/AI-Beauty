import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("next.config security headers", () => {
  const configSource = readFileSync(join(process.cwd(), "next.config.js"), "utf8");

  it("defines Content-Security-Policy with core directives", () => {
    expect(configSource).toContain("Content-Security-Policy");
    expect(configSource).toContain("default-src 'self'");
    expect(configSource).toContain("object-src 'none'");
    expect(configSource).toContain("frame-src https://api.razorpay.com");
  });

  it("includes HSTS and clickjacking protections", () => {
    expect(configSource).toContain("Strict-Transport-Security");
    expect(configSource).toContain("X-Frame-Options");
    expect(configSource).toContain('value: "DENY"');
    expect(configSource).toContain("X-Content-Type-Options");
  });

  it("allows fal infographic image hosts", () => {
    expect(configSource).toContain("https://*.fal.media");
  });
});
