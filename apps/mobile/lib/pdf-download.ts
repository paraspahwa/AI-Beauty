import { cacheDirectory, downloadAsync } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { supabase } from "@/lib/supabase";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";

export async function downloadReportPdf(reportId: string, variant: "report" | "styleGuide" = "report"): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in required to download PDF");

  const base = getValidatedMobileApiBaseUrl();
  const path =
    variant === "styleGuide" ? `/api/reports/${reportId}/pdf/style-guide` : `/api/reports/${reportId}/pdf`;
  const url = `${base}${path}`;
  const fileUri = `${cacheDirectory ?? ""}${reportId}-${variant}.pdf`;

  const result = await downloadAsync(url, fileUri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device");
  }
  await Sharing.shareAsync(result.uri, { mimeType: "application/pdf" });
}
