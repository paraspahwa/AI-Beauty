import { env } from "@/lib/env";
import { hasPremiumAccess, hasStyleGuideAccess } from "@/lib/auth/access";
import { getBlueprintSection } from "@/lib/ai/infographic-sections";
import {
  collectReportAnalysisSlides,
  collectStyleGuideSlides,
  parseReportVisualAssets,
} from "@/lib/pdf/infographic-slides";
import type { AnalysisInfographics, ReportVisualAsset, ReportVisualAssets } from "@/types/report";
import type { VaultItem, VaultResponse } from "@/types/vault";
import type { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isVaultStoragePath } from "@/lib/vault/vault-item-id";

const SIGNED_URL_TTL = 60 * 60;
/** Cap ready reports in vault to keep signing + payload bounded. */
const VAULT_REPORT_LIMIT = 100;
const SIGN_URL_CONCURRENCY = 24;

const BASE_REPORT_SELECT =
  "id, status, is_paid, image_path, created_at, visual_assets, face_shape";

const EXTENDED_REPORT_SELECT =
  `${BASE_REPORT_SELECT}, body_image_path, is_style_guide_paid`;

type ReportVaultRow = {
  id: string;
  status: string;
  is_paid: boolean;
  is_style_guide_paid: boolean;
  image_path: string;
  body_image_path: string | null;
  created_at: string;
  visual_assets: unknown;
  face_shape: { shape?: string } | null;
};

function parseVisualAssets(value: unknown): ReportVisualAssets | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as ReportVisualAssets;
}

function isMissingColumnError(error: { message?: string; code?: string }): boolean {
  const msg = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42703" ||
    msg.includes("is_style_guide_paid") ||
    msg.includes("body_image_path") ||
    msg.includes("does not exist")
  );
}

/** Tolerates DBs where migration 0026 has not been applied yet. */
async function fetchVaultReports(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<ReportVaultRow[]> {
  const runQuery = (select: string) =>
    admin
      .from("reports")
      .select(select)
      .eq("user_id", userId)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(VAULT_REPORT_LIMIT);

  const extended = await runQuery(EXTENDED_REPORT_SELECT);
  if (!extended.error) {
    return (extended.data ?? []) as unknown as ReportVaultRow[];
  }

  if (!isMissingColumnError(extended.error)) {
    throw extended.error;
  }

  const base = await runQuery(BASE_REPORT_SELECT);
  if (base.error) throw base.error;

  type BaseRow = Omit<ReportVaultRow, "is_style_guide_paid" | "body_image_path">;
  return ((base.data ?? []) as unknown as BaseRow[]).map((row) => ({
    ...row,
    is_style_guide_paid: false,
    body_image_path: null,
  }));
}

async function signPath(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  bucket: string,
  path: string,
): Promise<string | undefined> {
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl;
}

/** Sign many storage paths concurrently (deduped). */
async function signPathsParallel(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  bucket: string,
  paths: string[],
): Promise<Map<string, string | undefined>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const map = new Map<string, string | undefined>();

  for (let i = 0; i < unique.length; i += SIGN_URL_CONCURRENCY) {
    const chunk = unique.slice(i, i + SIGN_URL_CONCURRENCY);
    const signed = await Promise.all(
      chunk.map(async (path) => [path, await signPath(admin, bucket, path)] as const),
    );
    for (const [path, url] of signed) {
      map.set(path, url);
    }
  }

  return map;
}

function buildInfographicItem(
  report: ReportVaultRow,
  sectionKey: keyof AnalysisInfographics,
  asset: ReportVisualAsset,
  label: string,
  appUrl: string,
  signedUrl: string,
): VaultItem {
  const date = new Date(report.created_at).toISOString().slice(0, 10);
  const shape = report.face_shape?.shape;
  return {
    id: `${report.id}:analysis:${sectionKey}`,
    reportId: report.id,
    kind: "analysis",
    section: sectionKey as VaultItem["section"],
    label,
    createdAt: report.created_at,
    mime: asset.mime ?? "image/jpeg",
    signedUrl,
    downloadName: `Renovaara-${sectionKey}-${date}.jpg`,
    shareTitle: `My ${label} — Renovaara`,
    shareText: shape
      ? `My ${label} from Renovaara (${shape} face analysis).`
      : `My ${label} from Renovaara.`,
    reportUrl: `${appUrl}/report/${report.id}`,
    faceShape: shape,
  };
}

export async function compileVaultForUser(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  userEmail: string | null | undefined,
): Promise<VaultResponse> {
  const appUrl = env.app.url.replace(/\/$/, "");
  const bucket = env.supabase.bucket;

  const reports = await fetchVaultReports(admin, userId);

  const pathsToSign: string[] = [];
  type PendingAnalysis = {
    report: ReportVaultRow;
    sectionKey: keyof AnalysisInfographics;
    asset: ReportVisualAsset;
    label: string;
    path: string;
  };
  const pendingAnalysis: PendingAnalysis[] = [];

  type PendingUpload = {
    report: ReportVaultRow;
    path: string;
    uploadType: "selfie" | "body";
    label: string;
    downloadName: string;
    shareTitle: string;
    shareText: string;
  };
  const pendingUploads: PendingUpload[] = [];

  const pdfItems: VaultItem[] = [];

  for (const row of reports) {
    const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail });
    const hasStyleGuide = hasStyleGuideAccess({
      isStyleGuidePaid: !!row.is_style_guide_paid,
      userEmail,
    });
    const date = new Date(row.created_at).toISOString().slice(0, 10);
    const shape = row.face_shape?.shape;

    if (isVaultStoragePath(row.image_path)) {
      pathsToSign.push(row.image_path);
      pendingUploads.push({
        report: row,
        path: row.image_path,
        uploadType: "selfie",
        label: shape ? `Selfie — ${shape} analysis` : "Selfie upload",
        downloadName: `Renovaara-selfie-${date}.jpg`,
        shareTitle: "My Renovaara selfie",
        shareText: "Uploaded for my AI beauty analysis on Renovaara.",
      });
    }

    if (row.body_image_path) {
      pathsToSign.push(row.body_image_path);
      pendingUploads.push({
        report: row,
        path: row.body_image_path,
        uploadType: "body",
        label: "Full-body photo",
        downloadName: `Renovaara-body-${date}.jpg`,
        shareTitle: "My Renovaara style photo",
        shareText: "Full-body photo for my personal style guide on Renovaara.",
      });
    }

    const visualAssets = parseVisualAssets(row.visual_assets);
    const infographics = visualAssets?.assets?.analysisInfographics;

    if (infographics) {
      if (infographics.faceFeaturesPreview?.status === "ready") {
        const asset = infographics.faceFeaturesPreview;
        if (asset.path) {
          pathsToSign.push(asset.path);
          pendingAnalysis.push({
            report: row,
            sectionKey: "faceFeaturesPreview",
            asset,
            label: getBlueprintSection("faceFeaturesPreview")?.label ?? "Face Shape Preview",
            path: asset.path,
          });
        }
      }

      if (hasPremium) {
        const paidSections: (keyof AnalysisInfographics)[] = [
          "faceFeatures",
          "skin",
          "color",
          "hairstyle",
          "spectacles",
          "hairColor",
        ];

        for (const key of paidSections) {
          const asset = infographics[key];
          if (!asset || asset.status !== "ready" || !asset.path) continue;
          const meta = getBlueprintSection(key as Parameters<typeof getBlueprintSection>[0]);
          pathsToSign.push(asset.path);
          pendingAnalysis.push({
            report: row,
            sectionKey: key,
            asset,
            label: meta?.label ?? String(key),
            path: asset.path,
          });
        }
      }

      if (hasStyleGuide && infographics.styleGuide?.status === "ready") {
        const asset = infographics.styleGuide;
        if (asset.path) {
          pathsToSign.push(asset.path);
          pendingAnalysis.push({
            report: row,
            sectionKey: "styleGuide",
            asset,
            label: "Style Guide",
            path: asset.path,
          });
        }
      }
    }

    if (hasPremium) {
      const visualForPdf = parseReportVisualAssets(row.visual_assets);
      if (collectReportAnalysisSlides(visualForPdf).length > 0) {
        pdfItems.push({
          id: `${row.id}:pdf:report`,
          reportId: row.id,
          kind: "pdf",
          pdfVariant: "report",
          label: shape ? `Analysis PDF — ${shape}` : "Analysis PDF",
          createdAt: row.created_at,
          downloadName: `Renovaara-analysis-${date}.pdf`,
          shareTitle: "My Renovaara Beauty Analysis",
          shareText: shape
            ? `My complete ${shape} beauty analysis from Renovaara.`
            : "My complete beauty analysis from Renovaara.",
          reportUrl: `${appUrl}/report/${row.id}`,
          pdfDownloadUrl: `${appUrl}/api/reports/${row.id}/pdf`,
          faceShape: shape,
        });
      }
    }

    if (hasStyleGuide) {
      const visualForPdf = parseReportVisualAssets(row.visual_assets);
      if (collectStyleGuideSlides(visualForPdf).length > 0) {
        pdfItems.push({
          id: `${row.id}:pdf:style-guide`,
          reportId: row.id,
          kind: "pdf",
          pdfVariant: "styleGuide",
          label: "Style Guide PDF",
          createdAt: row.created_at,
          downloadName: `Renovaara-style-guide-${date}.pdf`,
          shareTitle: "My Renovaara Style Guide",
          shareText: "My personal style guide from Renovaara.",
          reportUrl: `${appUrl}/report/${row.id}`,
          pdfDownloadUrl: `${appUrl}/api/reports/${row.id}/pdf/style-guide`,
          faceShape: shape,
        });
      }
    }
  }

  const signedUrls = await signPathsParallel(admin, bucket, pathsToSign);

  const items: VaultItem[] = [];

  for (const upload of pendingUploads) {
    const signedUrl = signedUrls.get(upload.path);
    if (!signedUrl) continue;
    const shape = upload.report.face_shape?.shape;
    items.push({
      id: `${upload.report.id}:upload:${upload.uploadType}`,
      reportId: upload.report.id,
      kind: "upload",
      uploadType: upload.uploadType,
      label: upload.label,
      createdAt: upload.report.created_at,
      mime: "image/jpeg",
      signedUrl,
      downloadName: upload.downloadName,
      shareTitle: upload.shareTitle,
      shareText: upload.shareText,
      reportUrl: `${appUrl}/report/${upload.report.id}`,
      faceShape: shape,
    });
  }

  for (const pending of pendingAnalysis) {
    const signedUrl = signedUrls.get(pending.path);
    if (!signedUrl) continue;
    items.push(
      buildInfographicItem(
        pending.report,
        pending.sectionKey,
        pending.asset,
        pending.label,
        appUrl,
        signedUrl,
      ),
    );
  }

  items.push(...pdfItems);

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const uploads = items.filter((i) => i.kind === "upload").length;
  const analysis = items.filter((i) => i.kind === "analysis" || i.kind === "pdf").length;

  return {
    items,
    counts: { all: items.length, uploads, analysis },
  };
}
