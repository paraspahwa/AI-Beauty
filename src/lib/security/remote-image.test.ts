import { describe, expect, it } from "vitest";
import { isSafeRemoteImageUrl } from "./remote-image";

describe("isSafeRemoteImageUrl", () => {
  it("allows public https image hosts", () => {
    expect(isSafeRemoteImageUrl("https://cdn.example.com/image.jpg")).toBe(true);
  });

  it("blocks non-https schemes", () => {
    expect(isSafeRemoteImageUrl("http://cdn.example.com/image.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("file:///etc/passwd")).toBe(false);
  });

  it("blocks localhost and metadata endpoints", () => {
    expect(isSafeRemoteImageUrl("https://localhost/image.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("https://127.0.0.1/image.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("https://0.0.0.0/image.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("https://metadata.google.internal/computeMetadata/v1/")).toBe(false);
    expect(isSafeRemoteImageUrl("https://evil.localhost/image.jpg")).toBe(false);
  });

  it("blocks private IP ranges", () => {
    expect(isSafeRemoteImageUrl("https://10.0.0.5/image.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("https://192.168.1.1/image.jpg")).toBe(false);
    expect(isSafeRemoteImageUrl("https://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isSafeRemoteImageUrl("https://172.16.0.1/image.jpg")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isSafeRemoteImageUrl("not-a-url")).toBe(false);
  });
});
