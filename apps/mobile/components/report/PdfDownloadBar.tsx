import { Alert } from "react-native";
import { downloadReportPdf } from "@/lib/pdf-download";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type Props = {
  reportId: string;
  variant?: "report" | "styleGuide";
  disabled?: boolean;
};

export function PdfDownloadBar({ reportId, variant = "report", disabled }: Props) {
  async function openPdf() {
    try {
      await downloadReportPdf(reportId, variant);
    } catch (e) {
      Alert.alert("Download failed", (e as Error).message);
    }
  }

  return (
    <PrimaryButton
      label={variant === "styleGuide" ? "Download Style Guide PDF" : "Download Analysis PDF"}
      onPress={openPdf}
      disabled={disabled}
      variant="outline"
    />
  );
}
