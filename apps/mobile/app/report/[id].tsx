import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { ActivityIndicator, Alert, Animated, AppState, Image, Linking, Modal, PanResponder, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { createPaymentOrder, fetchReport, type MobileReport, verifyTestPayment } from "@/lib/api";
import { mobileEnv } from "@/lib/env";
import { loadSavedVisuals, removeSavedVisual, type SavedVisual } from "@/lib/studio-history";

type CheckoutFlow = "report" | "studio_pro";

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

export default function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; checkout?: string }>();
  const [report, setReport] = useState<MobileReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [awaitingBrowserCheckout, setAwaitingBrowserCheckout] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [checkoutFlow, setCheckoutFlow] = useState<CheckoutFlow | null>(null);
  const [savedVisuals, setSavedVisuals] = useState<SavedVisual[]>([]);
  const [previewVisual, setPreviewVisual] = useState<SavedVisual | null>(null);
  const previewTranslateY = useRef(new Animated.Value(0)).current;

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
        if (!cancelled) setReport(next);
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
    return next;
  }

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
        <Text style={styles.heading}>Your mobile report</Text>
        {report.imageUrl ? <Image source={{ uri: report.imageUrl }} style={styles.heroImage} /> : null}

        <Card title="Status">
          <Text style={styles.bodyText}>Status: {report.status}</Text>
          <Text style={styles.bodyText}>Tier access: {report.isPaid ? "Full report unlocked" : "Free preview"}</Text>
        </Card>

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
                <Text style={styles.mutedText}>
                  Remaining this period: {report.studioEntitlement.remainingGens ?? 0}
                </Text>
                {formatResetDate(report.studioEntitlement.periodResets) ? (
                  <Text style={styles.mutedText}>
                    Resets on: {formatResetDate(report.studioEntitlement.periodResets)}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.mutedText}>
                Upgrade to Studio Pro for monthly AI generations, premium report access, and faster access to Studio features.
              </Text>
            )}
          </Card>
        ) : null}

        {report.isPaid ? (
          <Card title="AI Studio">
            <Text style={styles.mutedText}>
              Start with mobile-safe Studio actions using your report photo.
            </Text>
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
        ) : null}

        {savedVisuals.length ? (
          <Card title="Saved visuals">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedVisualsRow}>
              {savedVisuals.map((item) => (
                <View key={item.id} style={styles.savedVisualCard}>
                  <Pressable onPress={() => setPreviewVisual(item)}>
                    <Image source={{ uri: item.imageUrl }} style={styles.savedVisualImage} />
                  </Pressable>
                  <Text style={styles.savedVisualLabel} numberOfLines={1}>
                    {item.kind === "makeup" ? "Makeup" : "Hair"}
                    {item.label ? ` - ${item.label}` : ""}
                  </Text>
                  {formatSavedVisualTime(item.createdAt) ? (
                    <Text style={styles.savedVisualTime}>{formatSavedVisualTime(item.createdAt)}</Text>
                  ) : null}
                  <Pressable onPress={() => void handleRemoveVisual(item)} style={styles.savedVisualRemoveButton}>
                    <Text style={styles.savedVisualRemoveButtonLabel}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </Card>
        ) : null}

        {checkoutStatus && !report.isPaid ? (
          <Card title={checkoutFlow === "studio_pro" ? "Studio Pro status" : "Payment status"}>
            <Text style={styles.mutedText}>{checkoutStatus}</Text>
            {awaitingBrowserCheckout ? <ActivityIndicator size="small" color="#111827" /> : null}
          </Card>
        ) : null}

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
          </Card>
        ) : null}

        <Card title="Style consultant chat">
          <Text style={styles.mutedText}>
            Continue your style conversation in a dedicated chat view with more room for follow-up questions.
          </Text>
          <Pressable
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: report.id } })}
            style={styles.chatLaunchButton}
          >
            <Text style={styles.chatLaunchButtonLabel}>Open full chat</Text>
          </Pressable>
        </Card>

        {report.skinAnalysis ? (
          <Card title="Skin analysis">
            <Text style={styles.bodyText}>Skin type: {report.skinAnalysis.type}</Text>
            {report.skinAnalysis.concerns?.length ? (
              <Text style={styles.mutedText}>
                Concerns: {report.skinAnalysis.concerns.map((item) => item.label).join(", ")}
              </Text>
            ) : null}
            {report.skinAnalysis.zones?.length ? (
              <Text style={styles.mutedText}>
                Zones: {report.skinAnalysis.zones.map((item) => `${item.zone} (${item.observation})`).join(" • ")}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {report.glasses ? (
          <Card title="Glasses guide">
            {report.glasses.goals?.length ? <Text style={styles.mutedText}>Goals: {report.glasses.goals.join(", ")}</Text> : null}
            {report.glasses.recommended?.slice(0, 3).map((item) => (
              <Text key={item.style} style={styles.mutedText}>{item.style}: {item.reason}</Text>
            ))}
          </Card>
        ) : null}

        {report.hairstyle ? (
          <Card title="Hairstyle guide">
            {report.hairstyle.styles?.slice(0, 3).map((item) => (
              <Text key={item.name} style={styles.mutedText}>{item.name}: {item.description}</Text>
            ))}
            {report.hairstyle.avoid?.length ? <Text style={styles.mutedText}>Avoid: {report.hairstyle.avoid.join(", ")}</Text> : null}
          </Card>
        ) : null}

        {!report.isPaid ? (
          <Card title="Unlock full report">
            <Text style={styles.mutedText}>
              This is the free preview. Unlock the full report to view your detailed skin, glasses, hairstyle, and summary guidance.
            </Text>
            <Pressable
              onPress={handleUnlock}
              disabled={unlocking}
              style={[styles.unlockButton, unlocking ? styles.unlockButtonDisabled : null]}
            >
              <Text style={styles.unlockButtonLabel}>{unlocking ? "Processing..." : "Unlock full report"}</Text>
            </Pressable>
              <Text style={styles.helperText}>
                In test mode this completes inside the app. In real mode, the app opens your existing web checkout and refreshes when you return.
              </Text>
              <Pressable onPress={handleStudioPro} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>Go Studio Pro instead</Text>
              </Pressable>
              {awaitingBrowserCheckout ? (
                <Pressable onPress={() => void refreshReport()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonLabel}>
                    {checkoutFlow === "studio_pro" ? "I completed Studio Pro checkout" : "I completed payment in browser"}
                  </Text>
                </Pressable>
              ) : checkoutStatus ? (
                <Pressable onPress={() => void refreshReport()} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonLabel}>
                    {checkoutFlow === "studio_pro" ? "Check Studio Pro status again" : "Check unlock again"}
                  </Text>
                </Pressable>
              ) : null}
          </Card>
        ) : null}

        {report.summary ? (
          <Card title="Summary">
            <Text style={styles.mutedText}>{report.summary}</Text>
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
            {previewVisual ? <Image source={{ uri: previewVisual.imageUrl }} style={styles.previewFullscreenImage} /> : null}
            {previewVisual ? (
              <Text style={styles.previewCaption}>
                {previewVisual.kind === "makeup" ? "Makeup" : "Hair"}
                {previewVisual.label ? ` - ${previewVisual.label}` : ""}
              </Text>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
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
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  heroImage: {
    width: "100%",
    height: 340,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
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
