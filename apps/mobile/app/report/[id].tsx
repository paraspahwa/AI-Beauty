import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { ActivityIndicator, Alert, Animated, AppState, Image, Linking, Modal, PanResponder, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { BeforeAfterCompare } from "@/components/BeforeAfterCompare";
import { createPaymentOrder, createReportShareLink, fetchReport, revokeReportShareLink, type MobileReport, verifyTestPayment } from "@/lib/api";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { loadSavedVisuals, removeSavedVisual, type SavedVisual } from "@/lib/studio-history";
import { mobileTheme as t } from "@/lib/theme";
import { useRequireMobileSession } from "@/lib/use-mobile-session";
import { FaceSection } from "./_components/FaceSection";
import { GlassesSection } from "./_components/GlassesSection";
import { HairSection } from "./_components/HairSection";
import { ReportHeader } from "./_components/ReportHeader";
import { ReportTabs, type ReportTab } from "./_components/ReportTabs";
import { ShopSection } from "./_components/ShopSection";
import { SkinSection } from "./_components/SkinSection";
import { StudioSection } from "./_components/StudioSection";
import { Card, EmptyCard, type CheckoutFlow, type PreviewItem, type ReportIntent } from "./_components/ReportPrimitives";

function parseReportIntent(value: string | string[] | undefined): ReportIntent | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "report") return "report";
  if (candidate === "studio_pro") return "studio_pro";
  return null;
}

function parseCheckoutFlow(value: string | string[] | undefined): CheckoutFlow | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "report_return") return "report";
  if (candidate === "studio_pro_return") return "studio_pro";
  return null;
}

function parseReportTab(value: string | string[] | undefined): ReportTab | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "face") return "face";
  if (candidate === "skin") return "skin";
  if (candidate === "glasses") return "glasses";
  if (candidate === "hair") return "hair";
  if (candidate === "studio") return "studio";
  if (candidate === "shop") return "shop";
  return null;
}

function getCheckoutPendingText(flow: CheckoutFlow): string {
  return flow === "studio_pro"
    ? "Confirming your Studio Pro subscription and refreshing premium access..."
    : "Confirming your payment and unlocking the full report...";
}

function getCheckoutTimeoutText(flow: CheckoutFlow): string {
  return flow === "studio_pro"
    ? "Studio Pro is still being activated. This can take a few more seconds after the webhook arrives."
    : "Payment is still being confirmed. This can take a few more seconds after the webhook arrives.";
}

function getCheckoutFailureText(flow: CheckoutFlow): string {
  return flow === "studio_pro"
    ? "We could not confirm Studio Pro yet. Try refreshing again in a moment."
    : "We could not confirm the unlock yet. Try refreshing again in a moment.";
}

function getCheckoutSuccessTitle(flow: CheckoutFlow): string {
  return flow === "studio_pro" ? "Studio Pro active" : "Unlocked";
}

function getCheckoutSuccessBody(flow: CheckoutFlow): string {
  return flow === "studio_pro"
    ? "Your Studio Pro subscription is active and premium report access is now available."
    : "Your payment is confirmed and the full report is now available.";
}

function formatResetDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatSavedVisualTime(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function getLockedCopy(intent: ReportIntent | null, title: string): string {
  if (intent === "studio_pro") {
    return `${title} is part of the premium report. Continue with Studio Pro for ongoing generations and premium report access, or unlock just this report.`;
  }
  return `${title} is available after unlock. Continue with the full report to see this section.`;
}

function getDefaultTab(report: MobileReport, intent: ReportIntent | null): ReportTab {
  if (intent === "studio_pro" && report.isPaid) return "studio";
  return "face";
}

export default function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; checkout?: string; intent?: string; tab?: string; comparison?: string }>();
  const isAuthed = useRequireMobileSession();
  const [report, setReport] = useState<MobileReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [awaitingBrowserCheckout, setAwaitingBrowserCheckout] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [checkoutFlow, setCheckoutFlow] = useState<CheckoutFlow | null>(null);
  const [savedVisuals, setSavedVisuals] = useState<SavedVisual[]>([]);
  const [previewVisual, setPreviewVisual] = useState<PreviewItem | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("face");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const previewTranslateY = useRef(new Animated.Value(0)).current;
  const preferredIntent = parseReportIntent(params.intent);
  const requestedTab = parseReportTab(params.tab);
  const compareModeRequested = params.comparison === "1" || params.comparison === "true";

  const previewPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gestureState) => {
        return Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_event, gestureState) => {
        if (gestureState.dy > 0) {
          previewTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_event, gestureState) => {
        if (gestureState.dy > 130 || gestureState.vy > 1.1) {
          Animated.timing(previewTranslateY, {
            toValue: 420,
            duration: 160,
            useNativeDriver: true,
          }).start(() => {
            previewTranslateY.setValue(0);
            setPreviewVisual(null);
          });
          return;
        }

        Animated.spring(previewTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }).start();
      },
    }),
  ).current;
  const previewBackdropOpacity = previewTranslateY.interpolate({
    inputRange: [0, 320],
    outputRange: [1, 0.35],
    extrapolate: "clamp",
  });

  async function loadReportVisuals() {
    if (!params.id) return;
    const visuals = await loadSavedVisuals(params.id);
    setSavedVisuals(visuals);
  }

  async function handleRemoveVisual(visual: SavedVisual) {
    if (!params.id) return;
    Alert.alert("Remove saved visual?", "This will remove the visual from the report gallery on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            const next = await removeSavedVisual(params.id, visual.id);
            setSavedVisuals(next);
          })();
        },
      },
    ]);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!isAuthed) return;
        if (!params.id) throw new Error("Missing report id");
        const next = await fetchReport(params.id);
        if (!cancelled) {
          setReport(next);
          setShareToken(next.shareToken ?? null);
          setActiveTab((current) => {
            if (requestedTab) return requestedTab;
            if (compareModeRequested) return next.isPaid ? "studio" : "face";
            return current === "face" ? getDefaultTab(next, preferredIntent) : current;
          });
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, params.id]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthed) return;
      void loadReportVisuals();
    }, [isAuthed, params.id]),
  );

  useEffect(() => {
    if (!isAuthed) return;
    if (previewVisual) {
      previewTranslateY.setValue(0);
    }
  }, [isAuthed, previewVisual, previewTranslateY]);

  useEffect(() => {
    const flow = parseCheckoutFlow(params.checkout);
    if (!flow) return;
    setCheckoutFlow(flow);
    setAwaitingBrowserCheckout(true);
    setCheckoutStatus(getCheckoutPendingText(flow));
  }, [params.checkout]);

  useEffect(() => {
    if (!awaitingBrowserCheckout) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      void refreshReport();
    });

    return () => {
      subscription.remove();
    };
  }, [awaitingBrowserCheckout]);

  useEffect(() => {
    if (!awaitingBrowserCheckout || !params.id || report?.isPaid || !checkoutFlow) return;

    let cancelled = false;
    let attempts = 0;

    const pollUnlock = async () => {
      attempts += 1;

      try {
        const next = await refreshReport();
        if (cancelled || !next) return;

        if (next.isPaid) {
          setAwaitingBrowserCheckout(false);
          setCheckoutStatus(null);
          setCheckoutFlow(null);
          Alert.alert(getCheckoutSuccessTitle(checkoutFlow), getCheckoutSuccessBody(checkoutFlow));
          return;
        }

        if (attempts >= 8) {
          setAwaitingBrowserCheckout(false);
          setCheckoutStatus(getCheckoutTimeoutText(checkoutFlow));
          return;
        }

        setCheckoutStatus(getCheckoutPendingText(checkoutFlow));
      } catch {
        if (attempts >= 8) {
          setAwaitingBrowserCheckout(false);
          setCheckoutStatus(getCheckoutFailureText(checkoutFlow));
        }
      }
    };

    void pollUnlock();
    const interval = setInterval(() => {
      void pollUnlock();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [awaitingBrowserCheckout, params.id, report?.isPaid]);

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>Unable to load report</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </SafeAreaView>
    );
  }

  async function refreshReport(): Promise<MobileReport | null> {
    if (!params.id) return null;
    const next = await fetchReport(params.id);
    setReport(next);
    setShareToken(next.shareToken ?? null);
    return next;
  }

  const faceLandmarkLabels = useMemo(() => {
    if (!report?.faceLandmarks) return [];
    return Object.entries(report.faceLandmarks)
      .filter(([, point]) => Boolean(point))
      .map(([key]) => key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()));
  }, [report?.faceLandmarks]);

  if (!isAuthed) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={t.color.text} />
      </SafeAreaView>
    );
  }

  const studioPromptTitle = preferredIntent === "studio_pro" ? "Continue with Studio Pro" : "Go Studio Pro instead";

  function getBrowserReportUrl(reportId: string, flow: CheckoutFlow): string {
    const webUrl = new URL(`${getValidatedMobileApiBaseUrl()}/report/${reportId}`);
    const appReturnTo = ExpoLinking.createURL(`/report/${reportId}?checkout=${flow}_return`);
    webUrl.searchParams.set("appReturnTo", appReturnTo);
    return webUrl.toString();
  }

  function getBrowserStudioProUrl(reportId: string): string {
    const webUrl = new URL(getBrowserReportUrl(reportId, "studio_pro"));
    webUrl.searchParams.set("paywall", "open");
    webUrl.searchParams.set("plan", "studio_pro");
    return webUrl.toString();
  }

  async function handleShareReport() {
    try {
      if (!report) throw new Error("Missing report");
      setShareLoading(true);

      let nextToken = shareToken;
      let shareUrl = shareToken ? `${getValidatedMobileApiBaseUrl()}/r/${shareToken}` : "";

      if (!nextToken) {
        const response = await createReportShareLink(report.id);
        nextToken = response.shareToken;
        shareUrl = response.shareUrl;
        setShareToken(response.shareToken);
      }

      await Share.share({
        title: "My Renovaara report",
        message: `View my Renovaara beauty report: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      Alert.alert("Share report", String(err));
    } finally {
      setShareLoading(false);
    }
  }

  async function handleRevokeShare() {
    try {
      if (!report) throw new Error("Missing report");
      await revokeReportShareLink(report.id);
      setShareToken(null);
      Alert.alert("Share link removed", "This report is private again.");
    } catch (err) {
      Alert.alert("Share report", String(err));
    }
  }

  async function handlePdfHandoff() {
    try {
      if (!report) throw new Error("Missing report");
      setShowExportSheet(true);
    } catch (err) {
      Alert.alert("Open PDF", String(err));
    }
  }

  async function handleOpenWebReportForPdf() {
    if (!report) return;
    setShowExportSheet(false);
    const webUrl = `${getValidatedMobileApiBaseUrl()}/report/${report.id}`;
    await Linking.openURL(webUrl);
  }

  async function handleShareFromExportSheet() {
    setShowExportSheet(false);
    await handleShareReport();
  }

  async function handleRevokeFromExportSheet() {
    setShowExportSheet(false);
    await handleRevokeShare();
  }

  async function handleUnlock() {
    try {
      if (!params.id) throw new Error("Missing report id");
      setUnlocking(true);

      const order = await createPaymentOrder(params.id);

      if (order.mode === "test" && !order.requiresRealCheckout) {
        await verifyTestPayment(params.id, order.orderId);
        await refreshReport();
        Alert.alert("Unlocked", "Test-mode payment completed and the full report is now available.");
        return;
      }

      const browserUrl = getBrowserReportUrl(params.id, "report");
      setCheckoutFlow("report");
      setCheckoutStatus(getCheckoutPendingText("report"));
      setAwaitingBrowserCheckout(true);
      await Linking.openURL(browserUrl);
    } catch (err) {
      setAwaitingBrowserCheckout(false);
      setCheckoutFlow(null);
      setCheckoutStatus(null);
      Alert.alert("Unlock failed", String(err));
    } finally {
      setUnlocking(false);
    }
  }

  async function handleStudioPro() {
    try {
      if (!params.id) throw new Error("Missing report id");
      setCheckoutFlow("studio_pro");
      setAwaitingBrowserCheckout(true);
      setCheckoutStatus(getCheckoutPendingText("studio_pro"));
      await Linking.openURL(getBrowserStudioProUrl(params.id));
    } catch (err) {
      setAwaitingBrowserCheckout(false);
      setCheckoutFlow(null);
      setCheckoutStatus(null);
      Alert.alert("Studio Pro", String(err));
    }
  }

  if (!report) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={t.color.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <ReportHeader
          report={report}
          compareModeRequested={compareModeRequested}
          shareLoading={shareLoading}
          shareToken={shareToken}
          onOpenChat={() => router.push({ pathname: "/chat/[id]", params: { id: report.id } })}
          onShare={() => void handleShareReport()}
        />

        {report.studioEntitlement ? (
          <Card title={report.studioEntitlement.tier === "studio_pro" ? "Studio Pro membership" : "Studio access"}>
            <Text style={styles.bodyText}>
              Plan: {report.studioEntitlement.tier === "studio_pro" ? "Studio Pro" : report.studioEntitlement.tier === "report" ? "Paid report" : "Free"}
            </Text>
            {report.studioEntitlement.tier === "studio_pro" ? (
              <>
                <Text style={styles.mutedText}>
                  Monthly generations used: {report.studioEntitlement.usedGens ?? 0}
                  {report.studioEntitlement.cap ? ` / ${report.studioEntitlement.cap}` : ""}
                </Text>
                <Text style={styles.mutedText}>Remaining this period: {report.studioEntitlement.remainingGens ?? 0}</Text>
                {formatResetDate(report.studioEntitlement.periodResets) ? (
                  <Text style={styles.mutedText}>Resets on: {formatResetDate(report.studioEntitlement.periodResets)}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.mutedText}>Upgrade to Studio Pro for monthly AI generations, premium report access, and faster access to Studio features.</Text>
            )}
          </Card>
        ) : null}

        {checkoutStatus && !report.isPaid ? (
          <Card title={checkoutFlow === "studio_pro" ? "Studio Pro status" : "Payment status"}>
            <Text style={styles.mutedText}>{checkoutStatus}</Text>
            {awaitingBrowserCheckout ? <ActivityIndicator size="small" color={t.color.text} /> : null}
            <Pressable onPress={() => void refreshReport()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>I returned from browser, refresh now</Text>
            </Pressable>
            {checkoutFlow === "studio_pro" ? (
              <Pressable onPress={() => void handleStudioPro()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>Open Studio Pro checkout again</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => void handleUnlock()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>Open report checkout again</Text>
              </Pressable>
            )}
          </Card>
        ) : null}

        <ReportTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "face" ? (
          <FaceSection report={report} faceLandmarkLabels={faceLandmarkLabels} onPreview={setPreviewVisual} />
        ) : null}

        {activeTab === "skin" ? (
          <SkinSection
            report={report}
            lockedBody={getLockedCopy(preferredIntent, "Skin analysis")}
            preferredIntent={preferredIntent}
            unlocking={unlocking}
            awaitingBrowserCheckout={awaitingBrowserCheckout}
            checkoutFlow={checkoutFlow}
            checkoutStatus={checkoutStatus}
            onUnlock={handleUnlock}
            onStudioPro={handleStudioPro}
            onRefresh={() => void refreshReport()}
          />
        ) : null}

        {activeTab === "glasses" ? (
          <GlassesSection
            report={report}
            lockedBody={getLockedCopy(preferredIntent, "Glasses recommendations")}
            preferredIntent={preferredIntent}
            unlocking={unlocking}
            awaitingBrowserCheckout={awaitingBrowserCheckout}
            checkoutFlow={checkoutFlow}
            checkoutStatus={checkoutStatus}
            onUnlock={handleUnlock}
            onStudioPro={handleStudioPro}
            onRefresh={() => void refreshReport()}
            onOpenStudio={() => router.push({ pathname: "/studio/glasses/[id]", params: { id: report.id, imageUrl: report.imageUrl } })}
            onPreview={setPreviewVisual}
          />
        ) : null}

        {activeTab === "hair" ? (
          <HairSection
            report={report}
            lockedBody={getLockedCopy(preferredIntent, "Hairstyle guidance")}
            preferredIntent={preferredIntent}
            unlocking={unlocking}
            awaitingBrowserCheckout={awaitingBrowserCheckout}
            checkoutFlow={checkoutFlow}
            checkoutStatus={checkoutStatus}
            onUnlock={handleUnlock}
            onStudioPro={handleStudioPro}
            onRefresh={() => void refreshReport()}
            onOpenStudio={() => router.push({ pathname: "/studio/hair/[id]", params: { id: report.id, imageUrl: report.imageUrl } })}
            onPreview={setPreviewVisual}
          />
        ) : null}

        {activeTab === "studio" ? (
          <StudioSection
            report={report}
            savedVisuals={savedVisuals}
            lockedBody={getLockedCopy(preferredIntent, "AI Studio")}
            preferredIntent={preferredIntent}
            unlocking={unlocking}
            awaitingBrowserCheckout={awaitingBrowserCheckout}
            checkoutFlow={checkoutFlow}
            checkoutStatus={checkoutStatus}
            onUnlock={handleUnlock}
            onStudioPro={handleStudioPro}
            onRefresh={() => void refreshReport()}
            onOpenMakeupStudio={() => router.push({ pathname: "/studio/makeup/[id]", params: { id: report.id, imageUrl: report.imageUrl } })}
            onOpenHairStudio={() => router.push({ pathname: "/studio/hair/[id]", params: { id: report.id, imageUrl: report.imageUrl } })}
            onOpenGlassesStudio={() => router.push({ pathname: "/studio/glasses/[id]", params: { id: report.id, imageUrl: report.imageUrl } })}
            onOpenOutfitStudio={() => router.push({ pathname: "/studio/outfits/[id]", params: { id: report.id } })}
            onRemoveSavedVisual={(visual) => void handleRemoveVisual(visual)}
            onPreview={setPreviewVisual}
            formatSavedVisualTime={formatSavedVisualTime}
          />
        ) : null}

        {activeTab === "shop" ? (
          <ShopSection
            report={report}
            lockedBody={getLockedCopy(preferredIntent, "Shopping and styling guidance")}
            preferredIntent={preferredIntent}
            unlocking={unlocking}
            awaitingBrowserCheckout={awaitingBrowserCheckout}
            checkoutFlow={checkoutFlow}
            checkoutStatus={checkoutStatus}
            shareLoading={shareLoading}
            shareToken={shareToken}
            onUnlock={handleUnlock}
            onStudioPro={handleStudioPro}
            onRefresh={() => void refreshReport()}
            onOpenColorStudio={() => router.push({ pathname: "/studio/colors/[id]", params: { id: report.id } })}
            onOpenChat={() => router.push({ pathname: "/chat/[id]", params: { id: report.id } })}
            onShare={() => void handleShareReport()}
            onRevokeShare={() => void handleRevokeShare()}
            onOpenPdf={() => void handlePdfHandoff()}
            onPreview={setPreviewVisual}
          />
        ) : null}

        {!report.isPaid && activeTab === "face" ? (
          <Card title="Unlock the rest of your report">
            <Text style={styles.mutedText}>You can already see your free preview. Unlock only this report with a one-time payment, or choose Studio Pro for subscription access and monthly generations.</Text>
            <Pressable
              onPress={preferredIntent === "studio_pro" ? handleStudioPro : handleUnlock}
              disabled={unlocking}
              style={[styles.unlockButton, unlocking ? styles.unlockButtonDisabled : null]}
            >
              <Text style={styles.unlockButtonLabel}>{preferredIntent === "studio_pro" ? "Continue with Studio Pro" : unlocking ? "Processing..." : "Unlock full report"}</Text>
            </Pressable>
            <Pressable onPress={preferredIntent === "studio_pro" ? handleUnlock : handleStudioPro} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>{preferredIntent === "studio_pro" ? "Unlock only this report" : studioPromptTitle}</Text>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(previewVisual)} animationType="fade" transparent onRequestClose={() => setPreviewVisual(null)}>
        <View style={styles.previewRoot}>
          <Animated.View pointerEvents="none" style={[styles.previewBackdrop, { opacity: previewBackdropOpacity }]} />
          <Animated.View
            style={[styles.previewSheet, { transform: [{ translateY: previewTranslateY }] }]}
            {...previewPanResponder.panHandlers}
          >
            <View style={styles.previewGrabber} />
            <Pressable onPress={() => setPreviewVisual(null)} style={styles.previewCloseButton}>
              <Text style={styles.previewCloseButtonLabel}>Close</Text>
            </Pressable>
            {previewVisual ? (
              previewVisual.beforeImageUrl && previewVisual.beforeImageUrl !== previewVisual.imageUrl ? (
                <BeforeAfterCompare
                  beforeUri={previewVisual.beforeImageUrl}
                  afterUri={previewVisual.imageUrl}
                  height={460}
                />
              ) : (
                <Image source={{ uri: previewVisual.imageUrl }} style={styles.previewFullscreenImage} />
              )
            ) : null}
            {previewVisual ? (
              <Text style={styles.previewCaption}>{previewVisual.label}</Text>
            ) : null}
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showExportSheet} animationType="slide" transparent onRequestClose={() => setShowExportSheet(false)}>
        <View style={styles.exportSheetRoot}>
          <Pressable style={styles.exportSheetBackdrop} onPress={() => setShowExportSheet(false)} />
          <View style={styles.exportSheetPanel}>
            <View style={styles.previewGrabber} />
            <Text style={styles.exportSheetTitle}>Export report</Text>
            <Text style={styles.exportSheetBody}>
              Mobile export is handled through the web report for now. You can open the report PDF there, or share a public link from the app.
            </Text>
            <Pressable onPress={() => void handleOpenWebReportForPdf()} style={styles.chatLaunchButton}>
              <Text style={styles.chatLaunchButtonLabel}>Open web report for PDF</Text>
            </Pressable>
            <Pressable onPress={() => void handleShareFromExportSheet()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>{shareToken ? "Share public link" : "Create and share link"}</Text>
            </Pressable>
            {shareToken ? (
              <Pressable onPress={() => void handleRevokeFromExportSheet()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>Revoke public link</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setShowExportSheet(false)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: t.color.bg,
  },
  container: {
    padding: 20,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  heroCard: {
    gap: 14,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerActionColumn: {
    gap: 8,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: t.color.text,
  },
  heroSubheading: {
    color: t.color.textMuted,
    lineHeight: 20,
  },
  headerActionButton: {
    borderRadius: 999,
    backgroundColor: t.color.text,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  headerActionLabel: {
    color: t.color.surface,
    fontWeight: "700",
  },
  headerSecondaryAction: {
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.border,
  },
  headerSecondaryActionLabel: {
    color: t.color.textSoft,
    fontWeight: "700",
  },
  heroImage: {
    width: "100%",
    height: 340,
    borderRadius: 24,
    backgroundColor: t.color.surfaceSubtle,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricPill: {
    borderRadius: 999,
    backgroundColor: t.color.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: t.color.brandRoseBorderSoft,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    color: t.color.textFaint,
  },
  metricValue: {
    color: t.color.text,
    fontWeight: "700",
  },
  tabRow: {
    gap: 8,
    paddingRight: 8,
  },
  tabChip: {
    borderRadius: 999,
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabChipActive: {
    backgroundColor: t.color.text,
    borderColor: t.color.text,
  },
  tabChipLabel: {
    color: t.color.textSoft,
    fontWeight: "700",
  },
  tabChipLabelActive: {
    color: t.color.surface,
  },
  card: {
    backgroundColor: t.color.surface,
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: t.color.text,
  },
  bodyText: {
    fontSize: 16,
    color: t.color.text,
  },
  inlineSection: {
    gap: 2,
  },
  mutedText: {
    fontSize: 15,
    color: t.color.textMuted,
    lineHeight: 22,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: t.color.text,
  },
  errorBody: {
    marginTop: 8,
    textAlign: "center",
    color: t.color.textMuted,
  },
  unlockButton: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: t.color.text,
    paddingVertical: 12,
    alignItems: "center",
  },
  unlockButtonDisabled: {
    opacity: 0.5,
  },
  unlockButtonLabel: {
    color: t.color.surface,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    color: t.color.textFaint,
    lineHeight: 18,
  },
  emptyCard: {
    borderRadius: 20,
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.divider,
    padding: 18,
  },
  emptyCardText: {
    color: t.color.textMuted,
    lineHeight: 21,
  },
  featuredVisual: {
    width: "100%",
    height: 320,
    borderRadius: 18,
    backgroundColor: t.color.surfaceSubtle,
  },
  galleryRow: {
    gap: 10,
    paddingRight: 8,
  },
  galleryCard: {
    width: 170,
    gap: 6,
  },
  galleryImage: {
    width: 170,
    height: 220,
    borderRadius: 16,
    backgroundColor: t.color.surfaceSubtle,
  },
  galleryLabel: {
    color: t.color.text,
    fontSize: 12,
    fontWeight: "700",
  },
  chatLaunchButton: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: t.color.text,
    paddingVertical: 12,
    alignItems: "center",
  },
  chatLaunchButtonLabel: {
    color: t.color.surface,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonLabel: {
    color: t.color.textSoft,
    fontWeight: "600",
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  swatchCard: {
    alignItems: "center",
    gap: 6,
    width: 72,
  },
  swatchCircle: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.overlayDark08,
  },
  swatchLabel: {
    color: t.color.textMuted,
    fontSize: 11,
    textAlign: "center",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    backgroundColor: t.color.brandRoseSurface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagLabel: {
    color: t.color.brandRose,
    fontWeight: "700",
    fontSize: 12,
  },
  savedVisualsRow: {
    gap: 10,
    paddingRight: 8,
  },
  savedVisualCard: {
    width: 148,
    gap: 4,
  },
  savedVisualImage: {
    width: 148,
    height: 188,
    borderRadius: 14,
    backgroundColor: t.color.surfaceSubtle,
  },
  savedVisualLabel: {
    color: t.color.text,
    fontSize: 12,
    fontWeight: "700",
  },
  savedVisualTime: {
    color: t.color.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  savedVisualRemoveButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingVertical: 6,
    alignItems: "center",
  },
  savedVisualRemoveButtonLabel: {
    color: t.color.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  previewRoot: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: t.color.overlayDark78,
  },
  previewSheet: {
    borderRadius: 20,
    backgroundColor: t.color.surface,
    padding: 12,
    gap: 10,
  },
  previewGrabber: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: t.color.borderStrong,
  },
  previewCloseButton: {
    alignSelf: "flex-end",
    borderRadius: 999,
    backgroundColor: t.color.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewCloseButtonLabel: {
    color: t.color.text,
    fontWeight: "700",
  },
  previewFullscreenImage: {
    width: "100%",
    height: 500,
    borderRadius: 16,
    backgroundColor: t.color.surfaceSubtle,
  },
  previewCaption: {
    color: t.color.textSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  exportSheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  exportSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: t.color.overlayDark78,
  },
  exportSheetPanel: {
    backgroundColor: t.color.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    gap: 10,
  },
  exportSheetTitle: {
    color: t.color.text,
    fontSize: 20,
    fontWeight: "700",
  },
  exportSheetBody: {
    color: t.color.textMuted,
    lineHeight: 20,
  },
});



