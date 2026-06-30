import { describe, expect, it } from "vitest";
import { parseVaultItemId, isVaultStoragePath } from "./vault-item-id";

describe("parseVaultItemId", () => {
  const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("parses selfie upload", () => {
    expect(parseVaultItemId(`${reportId}:upload:selfie`)).toEqual({
      reportId,
      kind: "upload",
      uploadType: "selfie",
    });
  });

  it("parses body upload", () => {
    expect(parseVaultItemId(`${reportId}:upload:body`)).toEqual({
      reportId,
      kind: "upload",
      uploadType: "body",
    });
  });

  it("parses analysis sections", () => {
    expect(parseVaultItemId(`${reportId}:analysis:skin`)).toEqual({
      reportId,
      kind: "analysis",
      section: "skin",
    });
  });

  it("rejects pdf and invalid ids", () => {
    expect(parseVaultItemId(`${reportId}:pdf:report`)).toBeNull();
    expect(parseVaultItemId("not-a-uuid:upload:selfie")).toBeNull();
    expect(parseVaultItemId("bad")).toBeNull();
  });
});

describe("isVaultStoragePath", () => {
  it("allows real paths", () => {
    expect(isVaultStoragePath("user/report/selfie.jpg")).toBe(true);
  });

  it("blocks sentinels", () => {
    expect(isVaultStoragePath("pending")).toBe(false);
    expect(isVaultStoragePath("deleted")).toBe(false);
    expect(isVaultStoragePath(null)).toBe(false);
  });
});
