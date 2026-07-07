import { describe, expect, it } from "vitest";
import { sanitizeMobileAppReturnUrl, sanitizePostAuthPath } from "./safe-redirect";

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
    expect(sanitizePostAuthPath("/%2f%2fevil.com")).toBe("/upload");
    expect(sanitizePostAuthPath("/vault\\@evil.com")).toBe("/upload");
  });

  it("uses custom fallback", () => {
    expect(sanitizePostAuthPath("/auth", "/dashboard")).toBe("/dashboard");
  });
});

describe("sanitizeMobileAppReturnUrl", () => {
  it("allows app deep links back to the same report checkout return state", () => {
    expect(
      sanitizeMobileAppReturnUrl("renovaara:///report/report-123?checkout=report_return", "report-123"),
    ).toBe("renovaara:///report/report-123?checkout=report_return");
    expect(
      sanitizeMobileAppReturnUrl("renovaara://report/report-123?checkout=style_guide_return", "report-123"),
    ).toBe("renovaara://report/report-123?checkout=style_guide_return");
  });

  it("rejects external URLs and unrelated app destinations", () => {
    expect(
      sanitizeMobileAppReturnUrl("https://evil.com/report/report-123?checkout=report_return", "report-123"),
    ).toBeUndefined();
    expect(
      sanitizeMobileAppReturnUrl("renovaara:///report/other?checkout=report_return", "report-123"),
    ).toBeUndefined();
    expect(
      sanitizeMobileAppReturnUrl("renovaara:///report/report-123?checkout=other", "report-123"),
    ).toBeUndefined();
    expect(
      sanitizeMobileAppReturnUrl(
        "renovaara:///report/report-123?checkout=report_return&next=https://evil.com",
        "report-123",
      ),
    ).toBeUndefined();
    expect(
      sanitizeMobileAppReturnUrl(
        "renovaara:///report/report-123?checkout=report_return&checkout=style_guide_return",
        "report-123",
      ),
    ).toBeUndefined();
  });
});
