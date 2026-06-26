import type {
  AnalysisInfographicSectionId,
  AnalysisInfographics,
  ReportVisualAsset,
  ReportVisualAssets,
} from "@/types/report";
import { createVisualAssetsSkeleton } from "@/lib/ai/visuals";

export function analysisInfographicStoragePath(
  userId: string,
  reportId: string,
  section: AnalysisInfographicSectionId,
): string {
  return `${userId}/${reportId}/visuals/v1/infographic-${section}.jpg`;
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
): Promise<ReportVisualAssets> {
  const infographics = visualAssets.assets.analysisInfographics;
  if (!infographics) return visualAssets;

  const signedEntries = await Promise.all(
    (Object.entries(infographics) as [AnalysisInfographicSectionId, ReportVisualAsset | undefined][]).map(
      async ([key, asset]) => {
        if (!asset?.path || asset.status !== "ready") return [key, asset] as const;
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
