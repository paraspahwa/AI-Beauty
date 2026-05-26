import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { ActivityIndicator, Alert, Animated, AppState, Image, Linking, Modal, PanResponder, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { createPaymentOrder, createReportShareLink, fetchReport, revokeReportShareLink, type MobileReport, type MobileVisualAsset, verifyTestPayment } from "@/lib/api";
import { mobileEnv } from "@/lib/env";
import { loadSavedVisuals, removeSavedVisual, type SavedVisual } from "@/lib/studio-history";

type CheckoutFlow = "report" | "studio_pro";

type ReportIntent = CheckoutFlow;

type ReportTab = "face" | "skin" | "glasses" | "hair" | "studio" | "shop";

type PreviewItem = {
  imageUrl: string;
  label: string;
};

const REPORT_TABS: { key: ReportTab; label: string }[] = [
  { key: "face", label: "Face" },
  { key: "skin", label: "Skin" },
  { key: "glasses", label: "Glasses" },
  { key: "hair", label: "Hair" },
  { key: "studio", label: "Studio" },
  { key: "shop", label: "Shop" },
];

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

function formatCreatedAt(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getAssetUrl(asset: MobileVisualAsset | null | undefined): string | null {
  if (!asset) return null;
  if (typeof asset.signedUrl === "string" && asset.signedUrl.length > 0) return asset.signedUrl;
  return null;
}

function getAssetLabel(asset: MobileVisualAsset | null | undefined, fallback: string): string {
  if (!asset) return fallback;
  if (typeof asset.styleName === "string" && asset.styleName.trim().length > 0) return asset.styleName;
  if (typeof asset.label === "string" && asset.label.trim().length > 0) return asset.label;
  return fallback;
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
  const params = useLocalSearchParams<{ id: string; checkout?: string; intent?: string }>();
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
  const previewTranslateY = useRef(new Animated.Value(0)).current;
  const preferredIntent = parseReportIntent(params.intent);

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
        if (!params.id) throw new Error("Missing report id");
        const next = await fetchReport(params.id);
        if (!cancelled) {
          setReport(next);
          setShareToken(next.shareToken ?? null);
          setActiveTab((current) => (current === "face" ? getDefaultTab(next, preferredIntent) : current));
        }
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      void loadReportVisuals();
    }, [params.id]),
  );

  useEffect(() => {
    if (previewVisual) {
      previewTranslateY.setValue(0);
    }
  }, [previewVisual, previewTranslateY]);

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

  const hasAnyReportVisuals = useMemo(() => {
    const visuals = report?.visualAssets?.assets;
    if (!visuals) return false;
    return Boolean(
      visuals.landmarkOverlay
      || visuals.paletteBoard
      || visuals.glassesPreviews?.length
      || visuals.hairstylePreviews?.length
      || visuals.colorSwatchPreviews?.length
      || visuals.makeupPreviews?.length,
    );
  }, [report?.visualAssets]);

  const studioPromptTitle = preferredIntent === "studio_pro" ? "Continue with Studio Pro" : "Go Studio Pro instead";

  function getBrowserReportUrl(reportId: string, flow: CheckoutFlow): string {
    const webUrl = new URL(`${mobileEnv.apiBaseUrl.replace(/\/$/, "")}/report/${reportId}`);
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
      let shareUrl = shareToken ? `${mobileEnv.apiBaseUrl.replace(/\/$/, "")}/r/${shareToken}` : "";

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
      const webUrl = `${mobileEnv.apiBaseUrl.replace(/\/$/, "")}/report/${report.id}`;
      Alert.alert(
        "Open PDF in web report",
        "Mobile cannot download the authenticated PDF directly in this app yet. We'll open the web report so you can use the existing PDF download there.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open web report", onPress: () => { void Linking.openURL(webUrl); } },
        ],
      );
    } catch (err) {
      Alert.alert("Open PDF", String(err));
    }
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
        <ActivityIndicator size="large" color="#111827" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heading}>Your report</Text>
              <Text style={styles.heroSubheading}>
                {report.isPaid ? "Full report unlocked" : "Preview unlocked. Premium sections are shown with contextual locks."}
              </Text>
            </View>
            <View style={styles.headerActionColumn}>
              <Pressable
                onPress={() => router.push({ pathname: "/chat/[id]", params: { id: report.id } })}
                style={styles.headerActionButton}
              >
                <Text style={styles.headerActionLabel}>Open chat</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleShareReport()}
                style={[styles.headerActionButton, styles.headerSecondaryAction]}
                disabled={shareLoading}
              >
                <Text style={styles.headerSecondaryActionLabel}>{shareLoading ? "Sharing..." : shareToken ? "Share link" : "Share"}</Text>
              </Pressable>
            </View>
          </View>

          {report.imageUrl ? <Image source={{ uri: report.imageUrl }} style={styles.heroImage} /> : null}

          <View style={styles.metricRow}>
            <MetricPill label="Status" value={report.status} />
            <MetricPill label="Access" value={report.isPaid ? "Premium" : "Preview"} />
            {formatCreatedAt(report.createdAt) ? <MetricPill label="Created" value={formatCreatedAt(report.createdAt) ?? ""} /> : null}
          </View>
        </View>

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
            {awaitingBrowserCheckout ? <ActivityIndicator size="small" color="#111827" /> : null}
          </Card>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {REPORT_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabChip, activeTab === tab.key ? styles.tabChipActive : null]}
            >
              <Text style={[styles.tabChipLabel, activeTab === tab.key ? styles.tabChipLabelActive : null]}>{tab.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {activeTab === "face" ? (
          <>
            {report.faceShape ? (
              <Card title="Face shape">
                <Text style={styles.bodyText}>{report.faceShape.shape}</Text>
                <Text style={styles.mutedText}>{report.faceShape.traits.join(", ")}</Text>
              </Card>
            ) : null}

            {report.colorAnalysis ? (
              <Card title="Color analysis">
                <Text style={styles.bodyText}>{report.colorAnalysis.season}</Text>
                <Text style={styles.mutedText}>Undertone: {report.colorAnalysis.undertone}</Text>
                <Text style={styles.mutedText}>{report.colorAnalysis.description}</Text>
                {report.colorAnalysis.metals?.length ? (
                  <Text style={styles.mutedText}>Best metals: {report.colorAnalysis.metals.join(", ")}</Text>
                ) : null}
                {report.colorAnalysis.palette?.length ? (
                  <View style={styles.swatchRow}>
                    {report.colorAnalysis.palette.slice(0, 6).map((item) => (
                      <View key={`${item.name}-${item.hex}`} style={styles.swatchCard}>
                        <View style={[styles.swatchCircle, { backgroundColor: item.hex }]} />
                        <Text style={styles.swatchLabel}>{item.name}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            ) : null}

            {report.features ? (
              <Card title="Feature breakdown">
                {Object.entries(report.features).map(([key, value]) => {
                  if (!value || typeof value !== "object") return null;
                  const feature = value as { shape?: string; notes?: string };
                  return (
                    <View key={key} style={styles.inlineSection}>
                      <Text style={styles.bodyText}>{key.replace(/^./, (char) => char.toUpperCase())}: {feature.shape ?? ""}</Text>
                      {feature.notes ? <Text style={styles.mutedText}>{feature.notes}</Text> : null}
                    </View>
                  );
                })}
              </Card>
            ) : null}

            {faceLandmarkLabels.length ? (
              <Card title="Landmarks detected">
                <View style={styles.tagRow}>
                  {faceLandmarkLabels.map((label) => (
                    <View key={label} style={styles.tag}>
                      <Text style={styles.tagLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            <VisualAssetCard
              title="Face overlay"
              asset={report.visualAssets?.assets?.landmarkOverlay}
              emptyText="Landmark overlay will appear here when the visual asset is ready."
              onPreview={setPreviewVisual}
            />

            <VisualAssetCard
              title="Palette board"
              asset={report.visualAssets?.assets?.paletteBoard}
              emptyText="Palette board will appear here when your color visual is ready."
              onPreview={setPreviewVisual}
            />
          </>
        ) : null}

        {activeTab === "skin" ? (
          report.isPaid ? (
            report.skinAnalysis ? (
              <Card title="Skin analysis">
                <Text style={styles.bodyText}>Skin type: {report.skinAnalysis.type}</Text>
                {report.skinAnalysis.concerns?.length ? (
                  <Text style={styles.mutedText}>Concerns: {report.skinAnalysis.concerns.map((item) => item.label).join(", ")}</Text>
                ) : null}
                {report.skinAnalysis.zones?.length ? (
                  <Text style={styles.mutedText}>Zones: {report.skinAnalysis.zones.map((item) => `${item.zone} (${item.observation})`).join(" • ")}</Text>
                ) : null}
              </Card>
            ) : (
              <EmptyCard text="Skin analysis is not available yet for this report." />
            )
          ) : (
            <LockedSection
              title="Skin analysis"
              body={getLockedCopy(preferredIntent, "Skin analysis")}
              preferredIntent={preferredIntent}
              unlocking={unlocking}
              awaitingBrowserCheckout={awaitingBrowserCheckout}
              checkoutFlow={checkoutFlow}
              checkoutStatus={checkoutStatus}
              onUnlock={handleUnlock}
              onStudioPro={handleStudioPro}
              onRefresh={() => void refreshReport()}
            />
          )
        ) : null}

        {activeTab === "glasses" ? (
          report.isPaid ? (
            <>
              {report.glasses ? (
                <Card title="Glasses guide">
                  {report.glasses.goals?.length ? <Text style={styles.mutedText}>Goals: {report.glasses.goals.join(", ")}</Text> : null}
                  {report.glasses.recommended?.slice(0, 4).map((item) => (
                    <View key={item.style} style={styles.inlineSection}>
                      <Text style={styles.bodyText}>{item.style}</Text>
                      <Text style={styles.mutedText}>{item.reason}</Text>
                    </View>
                  ))}
                  {report.glasses.fitTips?.length ? <Text style={styles.mutedText}>Fit tips: {report.glasses.fitTips.join(" • ")}</Text> : null}
                </Card>
              ) : (
                <EmptyCard text="Glasses guidance is not available yet for this report." />
              )}

              <VisualGallery
                title="Glasses previews"
                assets={report.visualAssets?.assets?.glassesPreviews}
                emptyText="Glasses previews will appear here when the visual assets are ready."
                fallbackLabel="Glasses preview"
                onPreview={setPreviewVisual}
              />
            </>
          ) : (
            <LockedSection
              title="Glasses guide"
              body={getLockedCopy(preferredIntent, "Glasses recommendations")}
              preferredIntent={preferredIntent}
              unlocking={unlocking}
              awaitingBrowserCheckout={awaitingBrowserCheckout}
              checkoutFlow={checkoutFlow}
              checkoutStatus={checkoutStatus}
              onUnlock={handleUnlock}
              onStudioPro={handleStudioPro}
              onRefresh={() => void refreshReport()}
            />
          )
        ) : null}

        {activeTab === "hair" ? (
          report.isPaid ? (
            <>
              {report.hairstyle ? (
                <Card title="Hairstyle guide">
                  {report.hairstyle.styles?.slice(0, 3).map((item) => (
                    <View key={item.name} style={styles.inlineSection}>
                      <Text style={styles.bodyText}>{item.name}</Text>
                      <Text style={styles.mutedText}>{item.description}</Text>
                    </View>
                  ))}
                  {report.hairstyle.colors?.slice(0, 3).map((item) => (
                    <Text key={`${item.name}-${item.description}`} style={styles.mutedText}>{item.name}: {item.description}</Text>
                  ))}
                  {report.hairstyle.avoid?.length ? <Text style={styles.mutedText}>Avoid: {report.hairstyle.avoid.join(", ")}</Text> : null}
                </Card>
              ) : (
                <EmptyCard text="Hairstyle guidance is not available yet for this report." />
              )}

              <VisualGallery
                title="Hairstyle previews"
                assets={report.visualAssets?.assets?.hairstylePreviews}
                emptyText="Hairstyle previews will appear here when the visual assets are ready."
                fallbackLabel="Hairstyle preview"
                onPreview={setPreviewVisual}
              />

              <Card title="Hair actions">
                <Text style={styles.mutedText}>Open the mobile hair color studio using your report photo.</Text>
                <Pressable
                  onPress={() => router.push({ pathname: "/studio/hair/[id]", params: { id: report.id, imageUrl: report.imageUrl } })}
                  style={styles.chatLaunchButton}
                >
                  <Text style={styles.chatLaunchButtonLabel}>Open hair color studio</Text>
                </Pressable>
              </Card>
            </>
          ) : (
            <LockedSection
              title="Hairstyle guide"
              body={getLockedCopy(preferredIntent, "Hairstyle guidance")}
              preferredIntent={preferredIntent}
              unlocking={unlocking}
              awaitingBrowserCheckout={awaitingBrowserCheckout}
              checkoutFlow={checkoutFlow}
              checkoutStatus={checkoutStatus}
              onUnlock={handleUnlock}
              onStudioPro={handleStudioPro}
              onRefresh={() => void refreshReport()}
            />
          )
        ) : null}

        {activeTab === "studio" ? (
          report.isPaid ? (
            <>
              <Card title="AI Studio">
                <Text style={styles.mutedText}>Start with mobile-safe Studio actions using your report photo.</Text>
                <Pressable
                  onPress={() => router.push({ pathname: "/studio/makeup/[id]", params: { id: report.id, imageUrl: report.imageUrl } })}
                  style={styles.chatLaunchButton}
                >
                  <Text style={styles.chatLaunchButtonLabel}>Open makeup studio</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push({ pathname: "/studio/hair/[id]", params: { id: report.id, imageUrl: report.imageUrl } })}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonLabel}>Open hair color studio</Text>
                </Pressable>
              </Card>

              <VisualGallery
                title="Makeup previews"
                assets={report.visualAssets?.assets?.makeupPreviews}
                emptyText="Makeup previews will appear here when the visual assets are ready."
                fallbackLabel="Makeup preview"
                onPreview={setPreviewVisual}
              />

              {savedVisuals.length ? (
                <Card title="Saved visuals">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedVisualsRow}>
                    {savedVisuals.map((item) => (
                      <View key={item.id} style={styles.savedVisualCard}>
                        <Pressable onPress={() => setPreviewVisual({ imageUrl: item.imageUrl, label: `${item.kind === "makeup" ? "Makeup" : "Hair"}${item.label ? ` - ${item.label}` : ""}` })}>
                          <Image source={{ uri: item.imageUrl }} style={styles.savedVisualImage} />
                        </Pressable>
                        <Text style={styles.savedVisualLabel} numberOfLines={1}>
                          {item.kind === "makeup" ? "Makeup" : "Hair"}
                          {item.label ? ` - ${item.label}` : ""}
                        </Text>
                        {formatSavedVisualTime(item.createdAt) ? <Text style={styles.savedVisualTime}>{formatSavedVisualTime(item.createdAt)}</Text> : null}
                        <Pressable onPress={() => void handleRemoveVisual(item)} style={styles.savedVisualRemoveButton}>
                          <Text style={styles.savedVisualRemoveButtonLabel}>Remove</Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </Card>
              ) : (
                <EmptyCard text="Saved makeup and hair looks will appear here once you keep them from Studio." />
              )}
            </>
          ) : (
            <LockedSection
              title="AI Studio"
              body={getLockedCopy(preferredIntent, "AI Studio")}
              preferredIntent={preferredIntent}
              unlocking={unlocking}
              awaitingBrowserCheckout={awaitingBrowserCheckout}
              checkoutFlow={checkoutFlow}
              checkoutStatus={checkoutStatus}
              onUnlock={handleUnlock}
              onStudioPro={handleStudioPro}
              onRefresh={() => void refreshReport()}
            />
          )
        ) : null}

        {activeTab === "shop" ? (
          report.isPaid ? (
            <>
              <Card title="Style summary">
                <Text style={styles.mutedText}>{report.summary ?? "Your premium summary will appear here once the report finishes compiling."}</Text>
              </Card>

              <VisualGallery
                title="Color swatches"
                assets={report.visualAssets?.assets?.colorSwatchPreviews}
                emptyText="Color swatches will appear here when the shopping visuals are ready."
                fallbackLabel="Color swatch"
                onPreview={setPreviewVisual}
              />

              <Card title="Continue with chat">
                <Text style={styles.mutedText}>Use the style consultant to ask follow-up questions about outfits, shopping choices, or how to use your palette.</Text>
                <Pressable onPress={() => router.push({ pathname: "/chat/[id]", params: { id: report.id } })} style={styles.chatLaunchButton}>
                  <Text style={styles.chatLaunchButtonLabel}>Open style chat</Text>
                </Pressable>
              </Card>

              <Card title="Share and export">
                <Text style={styles.mutedText}>Create a public report link to share with others, or open the web report to download the existing PDF export.</Text>
                <Pressable onPress={() => void handleShareReport()} style={styles.chatLaunchButton} disabled={shareLoading}>
                  <Text style={styles.chatLaunchButtonLabel}>{shareLoading ? "Preparing share..." : shareToken ? "Share public link" : "Create and share link"}</Text>
                </Pressable>
                {shareToken ? (
                  <Pressable onPress={() => void handleRevokeShare()} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonLabel}>Revoke public link</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => void handlePdfHandoff()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonLabel}>Open web report for PDF</Text>
                </Pressable>
              </Card>
            </>
          ) : (
            <LockedSection
              title="Shop your look"
              body={getLockedCopy(preferredIntent, "Shopping and styling guidance")}
              preferredIntent={preferredIntent}
              unlocking={unlocking}
              awaitingBrowserCheckout={awaitingBrowserCheckout}
              checkoutFlow={checkoutFlow}
              checkoutStatus={checkoutStatus}
              onUnlock={handleUnlock}
              onStudioPro={handleStudioPro}
              onRefresh={() => void refreshReport()}
            />
          )
        ) : null}

        {!report.isPaid && activeTab === "face" ? (
          <Card title="Unlock the rest of your report">
            <Text style={styles.mutedText}>You can already see your free preview. The remaining tabs unlock detailed skin, glasses, hair, Studio, and shopping guidance.</Text>
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

        {!hasAnyReportVisuals && activeTab === "face" ? (
          <EmptyCard text="Additional report visuals are still processing or were not generated for this report." />
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
            {previewVisual ? <Image source={{ uri: previewVisual.imageUrl }} style={styles.previewFullscreenImage} /> : null}
            {previewVisual ? (
              <Text style={styles.previewCaption}>{previewVisual.label}</Text>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyCardText}>{text}</Text>
    </View>
  );
}

function VisualAssetCard({
  title,
  asset,
  emptyText,
  onPreview,
}: {
  title: string;
  asset?: MobileVisualAsset | null;
  emptyText: string;
  onPreview: (item: PreviewItem) => void;
}) {
  const assetUrl = getAssetUrl(asset);

  if (!assetUrl) {
    return <EmptyCard text={emptyText} />;
  }

  return (
    <Card title={title}>
      <Pressable onPress={() => onPreview({ imageUrl: assetUrl, label: getAssetLabel(asset, title) })}>
        <Image source={{ uri: assetUrl }} style={styles.featuredVisual} />
      </Pressable>
      <Text style={styles.mutedText}>{getAssetLabel(asset, title)}</Text>
    </Card>
  );
}

function VisualGallery({
  title,
  assets,
  emptyText,
  fallbackLabel,
  onPreview,
}: {
  title: string;
  assets?: MobileVisualAsset[];
  emptyText: string;
  fallbackLabel: string;
  onPreview: (item: PreviewItem) => void;
}) {
  const readyAssets = (assets ?? []).filter((asset) => Boolean(getAssetUrl(asset)));

  if (readyAssets.length === 0) {
    return <EmptyCard text={emptyText} />;
  }

  return (
    <Card title={title}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
        {readyAssets.map((asset, index) => {
          const assetUrl = getAssetUrl(asset);
          if (!assetUrl) return null;
          const label = getAssetLabel(asset, `${fallbackLabel} ${index + 1}`);
          return (
            <Pressable key={`${label}-${index}`} onPress={() => onPreview({ imageUrl: assetUrl, label })} style={styles.galleryCard}>
              <Image source={{ uri: assetUrl }} style={styles.galleryImage} />
              <Text style={styles.galleryLabel} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Card>
  );
}

function LockedSection({
  title,
  body,
  preferredIntent,
  unlocking,
  awaitingBrowserCheckout,
  checkoutFlow,
  checkoutStatus,
  onUnlock,
  onStudioPro,
  onRefresh,
}: {
  title: string;
  body: string;
  preferredIntent: ReportIntent | null;
  unlocking: boolean;
  awaitingBrowserCheckout: boolean;
  checkoutFlow: CheckoutFlow | null;
  checkoutStatus: string | null;
  onUnlock: () => void;
  onStudioPro: () => void;
  onRefresh: () => void;
}) {
  const studioFirst = preferredIntent === "studio_pro";

  return (
    <Card title={title}>
      <Text style={styles.mutedText}>{body}</Text>
      <Pressable
        onPress={studioFirst ? onStudioPro : onUnlock}
        disabled={unlocking}
        style={[styles.unlockButton, unlocking ? styles.unlockButtonDisabled : null]}
      >
        <Text style={styles.unlockButtonLabel}>
          {studioFirst ? "Continue with Studio Pro" : unlocking ? "Processing..." : "Unlock full report"}
        </Text>
      </Pressable>
      <Pressable onPress={studioFirst ? onUnlock : onStudioPro} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonLabel}>{studioFirst ? "Unlock only this report" : "Go Studio Pro instead"}</Text>
      </Pressable>
      {checkoutStatus ? <Text style={styles.helperText}>{checkoutStatus}</Text> : null}
      {awaitingBrowserCheckout || checkoutStatus ? (
        <Pressable onPress={onRefresh} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonLabel}>
            {checkoutFlow === "studio_pro" ? "Check Studio Pro status again" : "Check unlock again"}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fffafc",
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
    color: "#111827",
  },
  heroSubheading: {
    color: "#6b7280",
    lineHeight: 20,
  },
  headerActionButton: {
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  headerActionLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  headerSecondaryAction: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerSecondaryActionLabel: {
    color: "#374151",
    fontWeight: "700",
  },
  heroImage: {
    width: "100%",
    height: 340,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricPill: {
    borderRadius: 999,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#f3e8ef",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#9ca3af",
  },
  metricValue: {
    color: "#111827",
    fontWeight: "700",
  },
  tabRow: {
    gap: 8,
    paddingRight: 8,
  },
  tabChip: {
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  tabChipLabel: {
    color: "#374151",
    fontWeight: "700",
  },
  tabChipLabelActive: {
    color: "#ffffff",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  bodyText: {
    fontSize: 16,
    color: "#111827",
  },
  inlineSection: {
    gap: 2,
  },
  mutedText: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 22,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  errorBody: {
    marginTop: 8,
    textAlign: "center",
    color: "#6b7280",
  },
  unlockButton: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#111827",
    paddingVertical: 12,
    alignItems: "center",
  },
  unlockButtonDisabled: {
    opacity: 0.5,
  },
  unlockButtonLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    color: "#9ca3af",
    lineHeight: 18,
  },
  emptyCard: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 18,
  },
  emptyCardText: {
    color: "#6b7280",
    lineHeight: 21,
  },
  featuredVisual: {
    width: "100%",
    height: 320,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
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
    backgroundColor: "#f3f4f6",
  },
  galleryLabel: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "700",
  },
  chatLaunchButton: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: "#111827",
    paddingVertical: 12,
    alignItems: "center",
  },
  chatLaunchButtonLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonLabel: {
    color: "#374151",
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
    borderColor: "rgba(17,24,39,0.08)",
  },
  swatchLabel: {
    color: "#6b7280",
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
    backgroundColor: "#fdf2f8",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagLabel: {
    color: "#9d174d",
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
    backgroundColor: "#f3f4f6",
  },
  savedVisualLabel: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "700",
  },
  savedVisualTime: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "500",
  },
  savedVisualRemoveButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 6,
    alignItems: "center",
  },
  savedVisualRemoveButtonLabel: {
    color: "#6b7280",
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
    backgroundColor: "rgba(17, 24, 39, 0.78)",
  },
  previewSheet: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 10,
  },
  previewGrabber: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
  },
  previewCloseButton: {
    alignSelf: "flex-end",
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  previewCloseButtonLabel: {
    color: "#111827",
    fontWeight: "700",
  },
  previewFullscreenImage: {
    width: "100%",
    height: 500,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
  previewCaption: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
});
