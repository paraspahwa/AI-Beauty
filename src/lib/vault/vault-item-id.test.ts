import { describe, expect, it } from "vitest";
import {
  isReportBodyImagePath,
  isReportScopedStoragePath,
  isReportSelfiePath,
  isVaultStoragePath,
  parseVaultItemId,
} from "./vault-item-id";

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

describe("report storage path guards", () => {
  const userId = "user-123";
  const reportId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  it("recognizes canonical selfie and body image paths", () => {
    expect(isReportSelfiePath(`${userId}/${reportId}.jpg`, userId, reportId)).toBe(true);
    expect(isReportBodyImagePath(`${userId}/${reportId}-body.jpg`, userId, reportId)).toBe(true);
  });

  it("allows only storage paths scoped to the report owner and id", () => {
    expect(isReportScopedStoragePath(`${userId}/${reportId}.jpg`, userId, reportId)).toBe(true);
    expect(isReportScopedStoragePath(`${userId}/${reportId}/visuals/v1/skin.jpg`, userId, reportId)).toBe(true);
    expect(isReportScopedStoragePath(`users/${userId}/reports/${reportId}/hair-color-low.jpg`, userId, reportId)).toBe(true);

    expect(isReportScopedStoragePath(`other-user/${reportId}.jpg`, userId, reportId)).toBe(false);
    expect(isReportScopedStoragePath(`${userId}/other-report/visuals/v1/skin.jpg`, userId, reportId)).toBe(false);
    expect(isReportScopedStoragePath("pending", userId, reportId)).toBe(false);
  });
});
