import type { ColorAnalysisResult } from "@/types/report";
import { signAnalysisInfographicAssets } from "@/lib/ai/analysis-infographics";

export function redactColorAnalysisForPreview(
  color: ColorAnalysisResult | null | undefined,
): ColorAnalysisResult | undefined {
  if (!color) return undefined;
  return {
    ...color,
    season: "?" as ColorAnalysisResult["season"],
    description: "Unlock your report to reveal your full seasonal palette.",
    palette: color.palette.slice(0, 2),
    avoidColors: [],
  };
}

export function previewSummaryForUnpaid(summary: string | null | undefined): string | undefined {
  if (!summary) return undefined;
  return summary.slice(0, 280) + (summary.length > 280 ? "…" : "");
}

async function signPreviewAssets(
  visualAssets: import("@/types/report").ReportVisualAssets,
  admin: ReturnType<typeof import("@/lib/supabase/server").createSupabaseAdminClient>,
) {
  const signList = async (list?: import("@/types/report").ReportVisualAsset[]) => {
    if (!list) return list;
    return Promise.all(
      list.map(async (asset) => {
        if (asset.path && asset.status === "ready") {
          const { data } = await admin.storage.from(visualAssets.bucket).createSignedUrl(asset.path, 60 * 30);
          return { ...asset, signedUrl: data?.signedUrl };
        }
        return asset;
      }),
    );
  };

  return {
    ...visualAssets,
    assets: {
      ...visualAssets.assets,
      glassesPreviews: await signList(visualAssets.assets.glassesPreviews),
      hairstylePreviews: await signList(visualAssets.assets.hairstylePreviews),
      hairColorPreviews: await signList(visualAssets.assets.hairColorPreviews),
    },
  };
}

function filterInfographicsForAccess(
  visualAssets: import("@/types/report").ReportVisualAssets,
  hasPremium: boolean,
  hasStyleGuide: boolean,
): import("@/types/report").ReportVisualAssets {
  const infographics = visualAssets.assets.analysisInfographics;
  if (!infographics) return visualAssets;

  const { faceFeaturesPreview: preview, styleGuide: styleGuideAsset, ...rest } = infographics;

  if (hasPremium) {
    const paid: typeof infographics = { ...rest };
    if (preview) paid.faceFeaturesPreview = preview;
    if (hasStyleGuide && styleGuideAsset) {
      paid.styleGuide = styleGuideAsset;
    }
    return {
      ...visualAssets,
      assets: {
        ...visualAssets.assets,
        analysisInfographics: paid,
      },
    };
  }

  return {
    ...visualAssets,
    assets: {
      ...visualAssets.assets,
      analysisInfographics: preview ? { faceFeaturesPreview: preview } : {},
    },
  };
}

export async function resolveReportVisualAssets(
  row: Record<string, unknown>,
  reportId: string,
  admin: ReturnType<typeof import("@/lib/supabase/server").createSupabaseAdminClient>,
  hasPremium = false,
  hasStyleGuide = false,
): Promise<import("@/types/report").ReportVisualAssets | undefined> {
  const direct = row.visual_assets;
  let visualAssets =
    direct && typeof direct === "object" ? (direct as import("@/types/report").ReportVisualAssets) : undefined;

  if (!visualAssets) {
    const { data: rec } = await admin
      .from("recommendations")
      .select("data")
      .eq("report_id", reportId)
      .eq("category", "visual_assets")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (rec?.data && typeof rec.data === "object") {
      visualAssets = rec.data as import("@/types/report").ReportVisualAssets;
    }
  }

  if (!visualAssets) return undefined;
  const signed = await signPreviewAssets(visualAssets, admin);
  const withInfographics = await signAnalysisInfographicAssets(signed, admin);
  return filterInfographicsForAccess(withInfographics, hasPremium, hasStyleGuide);
}
