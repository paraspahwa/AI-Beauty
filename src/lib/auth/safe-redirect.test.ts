import { describe, expect, it } from "vitest";
import { sanitizePostAuthPath } from "./safe-redirect";

describe("sanitizePostAuthPath", () => {
  it("allows internal paths", () => {
    expect(sanitizePostAuthPath("/vault")).toBe("/vault");
    expect(sanitizePostAuthPath("/report/abc?paywall=open")).toBe("/report/abc?paywall=open");
  });

  it("blocks auth loop targets", () => {
    expect(sanitizePostAuthPath("/auth")).toBe("/upload");
    expect(sanitizePostAuthPath("/auth?redirect=/vault")).toBe("/upload");
    expect(sanitizePostAuthPath("/auth/callback")).toBe("/upload");
  });

  it("rejects open redirects", () => {
    expect(sanitizePostAuthPath("//evil.com")).toBe("/upload");
    expect(sanitizePostAuthPath("https://evil.com")).toBe("/upload");
    expect(sanitizePostAuthPath(null)).toBe("/upload");
  });

  it("uses custom fallback", () => {
    expect(sanitizePostAuthPath("/auth", "/dashboard")).toBe("/dashboard");
  });
});
