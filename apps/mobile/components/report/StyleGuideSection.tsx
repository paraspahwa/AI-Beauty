import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { retryStyleGuide, uploadBodyImage } from "@/lib/api";
import type { CompiledReport, ReportVisualAsset } from "@web/types/report";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ReportSurfacePanel } from "@/components/ui/ReportSurfacePanel";
import { InfographicImage } from "./InfographicImage";
import { StyleGuidePaywallSheet } from "./StyleGuidePaywallSheet";
import { PdfDownloadBar } from "./PdfDownloadBar";

type Props = {
  report: CompiledReport;
  onRefresh: () => void;
};

export function StyleGuideSection({ report, onRefresh }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const asset: ReportVisualAsset | undefined = report.visualAssets?.assets?.analysisInfographics?.styleGuide;
  const isPaid = !!report.isStyleGuidePaid;
  const bodyUploaded = !!report.bodyImageUploaded;
  const creating = isPaid && bodyUploaded && (!asset || asset.status === "pending");

  useEffect(() => {
    if (!creating && !(paymentInitiated && !isPaid)) return;
    const interval = setInterval(onRefresh, 5000);
    return () => clearInterval(interval);
  }, [creating, paymentInitiated, isPaid, onRefresh]);

  async function pickBodyImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setUploadError("Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    setUploadError(null);
    try {
      await uploadBodyImage(report.id, result.assets[0].uri);
      onRefresh();
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (isPaid && asset?.status === "ready") {
    return (
      <ReportSurfacePanel style={styles.panel}>
        <FoilLabel>Style Guide</FoilLabel>
        <Text style={styles.title}>Your Personal Style Board</Text>
        <InfographicImage asset={asset} />
        <PdfDownloadBar reportId={report.id} variant="styleGuide" />
      </ReportSurfacePanel>
    );
  }

  if (isPaid && asset?.status === "failed") {
    return (
      <ReportSurfacePanel style={styles.panel}>
        <Text style={styles.title}>Style Guide generation failed</Text>
        <Text style={styles.body}>{asset.error ?? "Please try again."}</Text>
        <PrimaryButton label="Retry generation" onPress={async () => { await retryStyleGuide(report.id); onRefresh(); }} />
      </ReportSurfacePanel>
    );
  }

  if (paymentInitiated && !isPaid && bodyUploaded) {
    return (
      <ReportSurfacePanel style={[styles.panel, styles.center]}>
        <ActivityIndicator color={atelier.color.terracotta} />
        <Text style={styles.body}>Payment received — starting your Personal Style Board…</Text>
      </ReportSurfacePanel>
    );
  }

  if (creating) {
    return (
      <ReportSurfacePanel style={[styles.panel, styles.center]}>
        <ActivityIndicator color={atelier.color.terracotta} />
        <Text style={styles.body}>Creating your Personal Style Board…</Text>
      </ReportSurfacePanel>
    );
  }

  if (bodyUploaded && !isPaid) {
    return (
      <>
        <ReportSurfacePanel style={styles.panel}>
          <FoilLabel>Step 2 of 3</FoilLabel>
          <Text style={styles.title}>Your Personal Style Board</Text>
          <Text style={styles.body}>
            Full-body photo uploaded. Pay to unlock your personalised wardrobe infographic.
          </Text>
          <PrimaryButton label="Unlock Style Guide — ₹99" onPress={() => setPaywallOpen(true)} />
        </ReportSurfacePanel>
        <StyleGuidePaywallSheet
          reportId={report.id}
          visible={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          onUnlocked={() => {
            setPaymentInitiated(true);
            onRefresh();
          }}
        />
      </>
    );
  }

  return (
    <ReportSurfacePanel style={styles.panel}>
      <FoilLabel>Step 1 of 3</FoilLabel>
      <Text style={styles.title}>Your Personal Style Board</Text>
      <Text style={styles.body}>
        Upload a separate full-body photo — not your face selfie. After upload, unlock the add-on and we&apos;ll
        analyze your silhouette to build your board.
      </Text>
      {uploadError ? <Text style={styles.error}>{uploadError}</Text> : null}
      <PrimaryButton
        label={uploading ? "Uploading…" : "Upload full-body photo"}
        onPress={pickBodyImage}
        loading={uploading}
      />
    </ReportSurfacePanel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: atelier.space.sm, marginBottom: atelier.space.md },
  center: { alignItems: "center", paddingVertical: atelier.space.xl },
  title: { ...displayFont(), ...atelier.type.h2 },
  body: { ...bodyFont(), ...atelier.type.body },
  error: { ...bodyFont(), color: atelier.color.danger },
});
