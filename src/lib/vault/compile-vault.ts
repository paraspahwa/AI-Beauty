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

const SIGNED_URL_TTL = 60 * 60;

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

async function signPath(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  bucket: string,
  path: string,
): Promise<string | undefined> {
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl;
}

function addInfographicItem(
  items: VaultItem[],
  report: ReportVaultRow,
  sectionKey: keyof AnalysisInfographics,
  asset: ReportVisualAsset | undefined,
  label: string,
  appUrl: string,
  signedUrl?: string,
): void {
  if (!asset || asset.status !== "ready" || !signedUrl) return;
  const date = new Date(report.created_at).toISOString().slice(0, 10);
  const shape = report.face_shape?.shape;
  items.push({
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
  });
}

export async function compileVaultForUser(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  userEmail: string | null | undefined,
): Promise<VaultResponse> {
  const appUrl = env.app.url.replace(/\/$/, "");
  const bucket = env.supabase.bucket;

  const { data: reports, error } = await admin
    .from("reports")
    .select(
      "id, status, is_paid, is_style_guide_paid, image_path, body_image_path, created_at, visual_assets, face_shape",
    )
    .eq("user_id", userId)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const items: VaultItem[] = [];

  for (const row of (reports ?? []) as ReportVaultRow[]) {
    const hasPremium = hasPremiumAccess({ isPaid: !!row.is_paid, userEmail });
    const hasStyleGuide = hasStyleGuideAccess({
      isStyleGuidePaid: !!row.is_style_guide_paid,
      userEmail,
    });
    const date = new Date(row.created_at).toISOString().slice(0, 10);
    const shape = row.face_shape?.shape;

    if (row.image_path && row.image_path !== "pending") {
      const signedUrl = await signPath(admin, bucket, row.image_path);
      if (signedUrl) {
        items.push({
          id: `${row.id}:upload:selfie`,
          reportId: row.id,
          kind: "upload",
          uploadType: "selfie",
          label: shape ? `Selfie — ${shape} analysis` : "Selfie upload",
          createdAt: row.created_at,
          mime: "image/jpeg",
          signedUrl,
          downloadName: `Renovaara-selfie-${date}.jpg`,
          shareTitle: "My Renovaara selfie",
          shareText: "Uploaded for my AI beauty analysis on Renovaara.",
          reportUrl: `${appUrl}/report/${row.id}`,
          faceShape: shape,
        });
      }
    }

    if (row.body_image_path) {
      const signedUrl = await signPath(admin, bucket, row.body_image_path);
      if (signedUrl) {
        items.push({
          id: `${row.id}:upload:body`,
          reportId: row.id,
          kind: "upload",
          uploadType: "body",
          label: "Full-body photo",
          createdAt: row.created_at,
          mime: "image/jpeg",
          signedUrl,
          downloadName: `Renovaara-body-${date}.jpg`,
          shareTitle: "My Renovaara style photo",
          shareText: "Full-body photo for my personal style guide on Renovaara.",
          reportUrl: `${appUrl}/report/${row.id}`,
          faceShape: shape,
        });
      }
    }

    const visualAssets = parseVisualAssets(row.visual_assets);
    const infographics = visualAssets?.assets?.analysisInfographics;

    if (infographics) {
      const signAsset = async (path: string) => signPath(admin, bucket, path);

      if (!hasPremium && infographics.faceFeaturesPreview?.status === "ready") {
        const asset = infographics.faceFeaturesPreview;
        const signedUrl = asset.path ? await signAsset(asset.path) : undefined;
        addInfographicItem(
          items,
          row,
          "faceFeaturesPreview",
          asset,
          getBlueprintSection("faceFeaturesPreview")?.label ?? "Face Features Preview",
          appUrl,
          signedUrl,
        );
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
          const signedUrl = await signAsset(asset.path);
          addInfographicItem(
            items,
            row,
            key,
            asset,
            meta?.label ?? String(key),
            appUrl,
            signedUrl,
          );
        }
      }

      if (hasStyleGuide && infographics.styleGuide?.status === "ready") {
        const asset = infographics.styleGuide;
        const signedUrl = asset.path ? await signAsset(asset.path) : undefined;
        addInfographicItem(
          items,
          row,
          "styleGuide",
          asset,
          "Style Guide",
          appUrl,
          signedUrl,
        );
      }
    }

    if (hasPremium) {
      const visualForPdf = parseReportVisualAssets(row.visual_assets);
      if (collectReportAnalysisSlides(visualForPdf).length > 0) {
        items.push({
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
        items.push({
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

  const uploads = items.filter((i) => i.kind === "upload").length;
  const analysis = items.filter((i) => i.kind === "analysis" || i.kind === "pdf").length;

  return {
    items,
    counts: { all: items.length, uploads, analysis },
  };
}
