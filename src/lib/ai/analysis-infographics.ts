import type {
  AnalysisInfographicSectionId,
  AnalysisInfographics,
  ReportVisualAsset,
  ReportVisualAssets,
} from "@/types/report";
import { createVisualAssetsSkeleton } from "@/lib/ai/visuals";
import { isReportScopedStoragePath } from "@/lib/vault/vault-item-id";

export function analysisInfographicStoragePath(
  userId: string,
  reportId: string,
  section: AnalysisInfographicSectionId,
): string {
  return `${userId}/${reportId}/visuals/v1/infographic-${section}.jpg`;
}

export function styleGuideInfographicStoragePath(userId: string, reportId: string): string {
  return `${userId}/${reportId}/visuals/v1/infographic-styleGuide.jpg`;
}

export function getStyleGuideInfographicAsset(
  visualAssets: ReportVisualAssets | undefined | null,
): ReportVisualAsset | undefined {
  return visualAssets?.assets?.analysisInfographics?.styleGuide;
}

export function setStyleGuideInfographicAsset(
  visualAssets: ReportVisualAssets,
  asset: ReportVisualAsset,
): ReportVisualAssets {
  const analysisInfographics: AnalysisInfographics = {
    ...visualAssets.assets.analysisInfographics,
    styleGuide: asset,
  };
  return {
    ...visualAssets,
    assets: {
      ...visualAssets.assets,
      analysisInfographics,
    },
  };
}

export function getAnalysisInfographicAsset(
  visualAssets: ReportVisualAssets | undefined | null,
  section: AnalysisInfographicSectionId,
): ReportVisualAsset | undefined {
  return visualAssets?.assets?.analysisInfographics?.[section];
}

export function ensureVisualAssetsShell(
  existing: ReportVisualAssets | undefined | null,
  userId: string,
  reportId: string,
  bucket: string,
): ReportVisualAssets {
  if (existing?.version && existing.bucket && existing.basePath) {
    return {
      ...existing,
      assets: {
        ...existing.assets,
        analysisInfographics: { ...existing.assets.analysisInfographics },
      },
    };
  }
  return createVisualAssetsSkeleton(userId, reportId, bucket);
}

export function setAnalysisInfographicAsset(
  visualAssets: ReportVisualAssets,
  section: AnalysisInfographicSectionId,
  asset: ReportVisualAsset,
): ReportVisualAssets {
  const analysisInfographics: AnalysisInfographics = {
    ...visualAssets.assets.analysisInfographics,
    [section]: asset,
  };
  return {
    ...visualAssets,
    assets: {
      ...visualAssets.assets,
      analysisInfographics,
    },
  };
}

export async function signAnalysisInfographicAssets(
  visualAssets: ReportVisualAssets,
  admin: { storage: { from: (bucket: string) => { createSignedUrl: (path: string, ttl: number) => Promise<{ data: { signedUrl?: string } | null }> } } },
  userId: string,
  reportId: string,
): Promise<ReportVisualAssets> {
  const infographics = visualAssets.assets.analysisInfographics;
  if (!infographics) return visualAssets;

  const signedEntries = await Promise.all(
    (Object.entries(infographics) as [keyof AnalysisInfographics, ReportVisualAsset | undefined][]).map(
      async ([key, asset]) => {
        if (!asset?.path || asset.status !== "ready") return [key, asset] as const;
        if (!isReportScopedStoragePath(asset.path, userId, reportId)) return [key, asset] as const;
        const { data } = await admin.storage.from(visualAssets.bucket).createSignedUrl(asset.path, 60 * 30);
        return [key, { ...asset, signedUrl: data?.signedUrl }] as const;
      },
    ),
  );

  const signedInfographics = Object.fromEntries(signedEntries) as AnalysisInfographics;

  return {
    ...visualAssets,
    assets: {
      ...visualAssets.assets,
      analysisInfographics: signedInfographics,
    },
  };
}
