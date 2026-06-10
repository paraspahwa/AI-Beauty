import { describe, expect, it } from "vitest";
import {
  STUDIO_PRO_CHECKOUT_PATH,
  resolvePostAuthPath,
  studioProAuthUrl,
} from "@/lib/studio-pro-paths";

describe("studio-pro-paths", () => {
  it("uses canonical checkout path", () => {
    expect(STUDIO_PRO_CHECKOUT_PATH).toBe("/dashboard?checkout=studio_pro");
  });

  it("studioProAuthUrl encodes checkout redirect", () => {
    const url = studioProAuthUrl();
    expect(url).toContain("plan=studio_pro");
    expect(url).toContain(encodeURIComponent(STUDIO_PRO_CHECKOUT_PATH));
  });

  it("resolvePostAuthPath prefers safe redirect param", () => {
    const params = new URLSearchParams(
      `redirect=${encodeURIComponent("/dashboard?checkout=studio_pro")}`,
    );
    expect(resolvePostAuthPath(params)).toBe("/dashboard?checkout=studio_pro");
  });

  it("resolvePostAuthPath falls back to checkout when plan=studio_pro", () => {
    const params = new URLSearchParams("plan=studio_pro");
    expect(resolvePostAuthPath(params)).toBe(STUDIO_PRO_CHECKOUT_PATH);
  });

  it("resolvePostAuthPath rejects open redirects", () => {
    const params = new URLSearchParams(`redirect=${encodeURIComponent("//evil.com")}`);
    expect(resolvePostAuthPath(params)).toBe("/upload");
  });

  it("resolvePostAuthPath defaults to upload", () => {
    expect(resolvePostAuthPath(new URLSearchParams())).toBe("/upload");
  });
});
