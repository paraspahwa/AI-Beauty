export type VaultItemKind = "upload" | "analysis" | "pdf";

export type VaultUploadType = "selfie" | "body";

export type VaultAnalysisSection =
  | "faceFeaturesPreview"
  | "faceFeatures"
  | "skin"
  | "color"
  | "hairstyle"
  | "spectacles"
  | "hairColor"
  | "styleGuide";

export interface VaultItem {
  id: string;
  reportId: string;
  kind: VaultItemKind;
  label: string;
  createdAt: string;
  /** Storage path (server only) — not exposed to client in API response */
  mime?: string;
  signedUrl?: string;
  downloadName: string;
  shareTitle: string;
  shareText: string;
  reportUrl: string;
  /** Direct PDF download endpoint (pdf items only) */
  pdfDownloadUrl?: string;
  /** Distinguishes main analysis PDF vs style guide PDF in vault */
  pdfVariant?: "report" | "styleGuide";
  uploadType?: VaultUploadType;
  section?: VaultAnalysisSection;
  faceShape?: string;
}

export interface VaultResponse {
  items: VaultItem[];
  counts: {
    all: number;
    uploads: number;
    analysis: number;
  };
}
