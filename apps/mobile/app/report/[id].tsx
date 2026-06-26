import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ExpoLinking from "expo-linking";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createPaymentOrder, fetchReport, type MobileReport, verifyTestPayment } from "@/lib/api";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { mobileTheme as t } from "@/lib/theme";
import { useRequireMobileSession } from "@/lib/use-mobile-session";
import { FaceSection } from "@/components/report/FaceSection";
import { GlassesSection } from "@/components/report/GlassesSection";
import { HairSection } from "@/components/report/HairSection";
import { ColorSection } from "@/components/report/ColorSection";
import { StyleGuideSection } from "@/components/report/StyleGuideSection";
import { ReportHeader } from "@/components/report/ReportHeader";
import { FreePreviewTeaser } from "@/components/FreePreviewTeaser";
import { UnlockTeaserBanner } from "@/components/UnlockTeaserBanner";
import { SkinSection } from "@/components/report/SkinSection";
import { Card, EmptyCard } from "@/components/report/ReportPrimitives";

export default function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; checkout?: string }>();
  const isAuthed = useRequireMobileSession();
  const [report, setReport] = useState<MobileReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      setError(null);
      const data = await fetchReport(params.id);
      setReport(data);
    } catch (err) {
      setError(String(err));
    }
  }, [params.id]);

  useEffect(() => {
    if (!isAuthed) return;
    void load();
  }, [isAuthed, load]);

  useEffect(() => {
    if (params.checkout !== "report_return" || !report) return;
    setCheckoutStatus("Confirming payment…");
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [params.checkout, report, load]);

  async function handleUnlock() {
    if (!report) return;
    try {
      setUnlocking(true);
      const order = await createPaymentOrder(report.id);
      const returnUrl = ExpoLinking.createURL(`/report/${report.id}`, { queryParams: { checkout: "report_return" } });

      if (order.mode === "test" || !order.requiresRealCheckout) {
        await verifyTestPayment(report.id, order.orderId);
        await load();
        setCheckoutStatus("Payment confirmed — refreshing report…");
        return;
      }

      const base = getValidatedMobileApiBaseUrl();
      const payUrl = `${base}/report/${report.id}?paywall=open`;
      await Linking.openURL(payUrl);
      setCheckoutStatus("Complete checkout in your browser, then return here.");
    } catch (err) {
      Alert.alert("Unlock failed", String(err));
    } finally {
      setUnlocking(false);
    }
  }

  if (!isAuthed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={t.color.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (!report && !error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={t.color.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.error}>{error ?? "Report not found"}</Text>
          <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isPaid = report.isPaid;
  const processing = report.status === "processing" || report.status === "pending";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ReportHeader report={report} onBack={() => router.back()} />

        {checkoutStatus ? <Text style={styles.checkoutStatus}>{checkoutStatus}</Text> : null}

        {report.faceShape ? (
          <FaceSection faceShape={report.faceShape} features={report.features} previewOnly={!isPaid} />
        ) : null}

        {!isPaid ? (
          <>
            <UnlockTeaserBanner hints={{ season: report.colorAnalysis?.season, faceShape: report.faceShape?.shape }} />
            <FreePreviewTeaser colorAnalysis={report.colorAnalysis} summary={report.summary} />
            <Card title="Unlock full report">
              <Text style={styles.lockBody}>Skin, colour, hairstyle, hair colour, spectacles, and style guide.</Text>
              <Pressable style={styles.primaryButton} onPress={() => void handleUnlock()} disabled={unlocking}>
                {unlocking ? (
                  <ActivityIndicator color={t.color.surface} />
                ) : (
                  <Text style={styles.primaryButtonLabel}>Unlock full report</Text>
                )}
              </Pressable>
            </Card>
          </>
        ) : (
          <>
            {report.skinAnalysis ? <SkinSection data={report.skinAnalysis} /> : null}
            {report.colorAnalysis ? <ColorSection data={report.colorAnalysis} /> : null}
            {report.hairstyle ? (
              <HairSection data={report.hairstyle} previews={report.visualAssets?.assets?.hairstylePreviews} />
            ) : null}
            {report.glasses ? (
              <GlassesSection data={report.glasses} previews={report.visualAssets?.assets?.glassesPreviews} />
            ) : null}
            {report.styleGuide ? <StyleGuideSection data={report.styleGuide} /> : null}
          </>
        )}

        {processing ? <EmptyCard text="Analysis in progress — refresh shortly." /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.color.bg },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  error: { color: t.color.text, textAlign: "center" },
  checkoutStatus: { color: t.color.textSoft, fontSize: 13, textAlign: "center" },
  lockBody: { color: t.color.textSoft, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  primaryButton: {
    backgroundColor: t.color.text,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonLabel: { color: t.color.surface, fontWeight: "700" },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: t.color.border,
  },
  secondaryButtonLabel: { color: t.color.text, fontWeight: "600" },
});
