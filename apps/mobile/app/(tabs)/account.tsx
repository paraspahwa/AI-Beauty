import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as ExpoLinking from "expo-linking";
import { Alert, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { cancelSubscription, fetchSubscriptionStatus, listReports, requestCloudDataRemoval, type MobileStudioEntitlement } from "@/lib/api";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { mobileTheme as t } from "@/lib/theme";

export default function AccountTabScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Not signed in");
  const [managing, setManaging] = useState(false);
  const [entitlement, setEntitlement] = useState<MobileStudioEntitlement | null>(null);
  const [latestReportId, setLatestReportId] = useState<string | null>(null);
  const [activationPending, setActivationPending] = useState(false);
  const [activationStatus, setActivationStatus] = useState<string | null>(null);
  const [removingCloudData, setRemovingCloudData] = useState(false);

  const isFormValid = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password]);

  function formatResetDate(value: string | null | undefined): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  async function loadEntitlement(): Promise<MobileStudioEntitlement | null> {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      setEntitlement(null);
      setLatestReportId(null);
      setStatus("Not signed in");
      return null;
    }

    setStatus("Signed in");
    // Entitlement no longer depends on report existence.
    const nextEntitlement = await fetchSubscriptionStatus();
    setEntitlement(nextEntitlement);

    // Keep latest report only for nicer checkout routing when available.
    const reports = await listReports(1).catch(() => []);
    setLatestReportId(reports[0]?.id ?? null);

    return nextEntitlement;
  }

  useFocusEffect(
    useCallback(() => {
      void loadEntitlement();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (params.checkout === "studio_pro_return") {
        setActivationPending(true);
        setActivationStatus("Checking Studio Pro activation...");

        let cancelled = false;
        let attempts = 0;

        const run = async () => {
          attempts += 1;
          const nextEntitlement = await loadEntitlement();

          if (cancelled) return;
          if (nextEntitlement?.tier === "studio_pro") {
            setActivationPending(false);
            setActivationStatus("Studio Pro is now active.");
            return;
          }

          if (attempts >= 8) {
            setActivationPending(false);
            setActivationStatus("Activation is still processing. Pull to refresh in a few seconds.");
            return;
          }

          setActivationStatus("Payment received. Activating your Studio Pro access...");
          setTimeout(() => {
            void run();
          }, 3000);
        };

        void run();

        return () => {
          cancelled = true;
        };
      }
      return () => {};
    }, [params.checkout]),
  );

  useFocusEffect(
    useCallback(() => {
      if (entitlement?.tier === "studio_pro") {
        setActivationPending(false);
      }
    }, [entitlement?.tier]),
  );

  async function signIn() {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setStatus("Signed in");
      await loadEntitlement();
    } catch (err) {
      Alert.alert("Sign in failed", String(err));
      setStatus("Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setStatus("Signed out");
    setEntitlement(null);
    setLatestReportId(null);
  }

  function getStudioCheckoutUrl(): string {
    const returnTo = ExpoLinking.createURL("/account?checkout=studio_pro_return");
    const apiBaseUrl = getValidatedMobileApiBaseUrl();
    if (latestReportId) {
      const reportUrl = new URL(`${apiBaseUrl}/report/${latestReportId}`);
      reportUrl.searchParams.set("paywall", "open");
      reportUrl.searchParams.set("plan", "studio_pro");
      reportUrl.searchParams.set("appReturnTo", returnTo);
      return reportUrl.toString();
    }

    const uploadUrl = new URL(`${apiBaseUrl}/upload`);
    uploadUrl.searchParams.set("paywall", "open");
    uploadUrl.searchParams.set("plan", "studio_pro");
    uploadUrl.searchParams.set("appReturnTo", returnTo);
    return uploadUrl.toString();
  }

  async function handleUpgrade() {
    try {
      setManaging(true);
      await Linking.openURL(getStudioCheckoutUrl());
    } catch (err) {
      Alert.alert("Studio Pro", String(err));
    } finally {
      setManaging(false);
    }
  }

  async function handleCancel() {
    if (!entitlement?.subscriptionId) {
      Alert.alert("Subscription", "No active subscription found.");
      return;
    }

    Alert.alert("Cancel Studio Pro?", "This will cancel at period end.", [
      { text: "Keep plan", style: "cancel" },
      {
        text: "Cancel plan",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              setManaging(true);
              await cancelSubscription(entitlement.subscriptionId!);
              await loadEntitlement();
              Alert.alert("Subscription", "Studio Pro will cancel at period end.");
            } catch (err) {
              Alert.alert("Subscription", String(err));
            } finally {
              setManaging(false);
            }
          })();
        },
      },
    ]);
  }

  async function handleOpenPrivacyPolicy() {
    try {
      const apiBaseUrl = getValidatedMobileApiBaseUrl();
      await Linking.openURL(`${apiBaseUrl}/privacy`);
    } catch (err) {
      Alert.alert("Privacy", String(err));
    }
  }

  async function runCloudCacheRemovalRequest() {
    try {
      setRemovingCloudData(true);
      const result = await requestCloudDataRemoval();
      const lines = [
        `Removed canvas sessions: ${result.removed.canvases}`,
        `Removed generated assets: ${result.removed.generatedAssets}`,
        `Removed storage files: ${result.removed.storageFiles}`,
      ];
      if (result.storageCleanupFailed) {
        lines.push("Some file cleanup may still be processing. Please retry in a minute if needed.");
      }

      Alert.alert("Cloud data removed", lines.join("\n"));
    } catch (err) {
      Alert.alert("Cloud data request", String(err));
    } finally {
      setRemovingCloudData(false);
    }
  }

  function handleCloudCacheRemovalRequest() {
    Alert.alert(
      "Remove cloud-edited photos?",
      "This will delete your temporary Studio canvas uploads and generated try-on images from cloud storage. Your report text remains unchanged.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove now",
          style: "destructive",
          onPress: () => {
            void runCloudCacheRemovalRequest();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Membership</Text>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.subtitle}>Sign in to access your reports, chat, and Studio features.</Text>
          <View style={styles.tierPill}>
            <Text style={styles.tierPillLabel}>
              {entitlement?.tier === "studio_pro" ? "Studio Pro" : entitlement?.tier === "report" ? "Report" : "Free"}
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            secureTextEntry
            placeholder="Password"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <Pressable onPress={() => void signIn()} disabled={loading || !isFormValid} style={[styles.button, loading || !isFormValid ? styles.buttonDisabled : null]}>
            <Text style={styles.buttonLabel}>Sign in</Text>
          </Pressable>

          <Pressable onPress={() => void signOut()} disabled={loading} style={[styles.secondaryButton, loading ? styles.buttonDisabled : null]}>
            <Text style={styles.secondaryButtonLabel}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Studio Pro</Text>
          <Text style={styles.sectionBody}>
            Tier: {entitlement?.tier === "studio_pro" ? "Studio Pro" : entitlement?.tier === "report" ? "Paid report" : "Free"}
          </Text>
          {entitlement?.tier === "studio_pro" ? (
            <>
              <Text style={styles.sectionBody}>
                Remaining generations: {entitlement.remainingGens ?? 0}
              </Text>
              {formatResetDate(entitlement.periodResets) ? (
                <Text style={styles.sectionBody}>Resets on: {formatResetDate(entitlement.periodResets)}</Text>
              ) : null}
              <Pressable onPress={() => void handleCancel()} disabled={managing} style={[styles.secondaryButton, managing ? styles.buttonDisabled : null]}>
                <Text style={styles.secondaryButtonLabel}>Cancel at period end</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.sectionBody}>Upgrade for monthly generations and premium report access.</Text>
              <Pressable onPress={() => void handleUpgrade()} disabled={managing} style={[styles.button, managing ? styles.buttonDisabled : null]}>
                <Text style={styles.buttonLabel}>{managing ? "Opening..." : "Go Studio Pro"}</Text>
              </Pressable>
            </>
          )}

          {activationStatus ? <Text style={styles.activationNote}>{activationStatus}</Text> : null}
          {activationPending ? (
            <Pressable onPress={() => void loadEntitlement()} disabled={managing} style={[styles.secondaryButton, managing ? styles.buttonDisabled : null]}>
              <Text style={styles.secondaryButtonLabel}>Refresh activation status</Text>
            </Pressable>
          ) : null}
          {activationStatus && entitlement?.tier !== "studio_pro" ? (
            <Pressable onPress={() => void handleUpgrade()} disabled={managing} style={[styles.secondaryButton, managing ? styles.buttonDisabled : null]}>
              <Text style={styles.secondaryButtonLabel}>Open Studio Pro checkout again</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Style insights</Text>
          <Text style={styles.sectionBody}>Open your aggregated style profile and track changes across completed reports.</Text>
          <Pressable onPress={() => router.push("/style-dna")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Open Style DNA</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/progress")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Open Progress Tracker</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Privacy controls</Text>
          <Text style={styles.sectionBody}>Only the photo you choose for editing is uploaded for processing. Cloud edits are temporary and should be removed shortly after processing.</Text>
          <Text style={styles.privacyFinePrint}>If you want immediate removal, use the cloud data request action below.</Text>
          <Pressable onPress={handleCloudCacheRemovalRequest} disabled={removingCloudData} style={[styles.secondaryButton, removingCloudData ? styles.buttonDisabled : null]}>
            <Text style={styles.secondaryButtonLabel}>{removingCloudData ? "Removing..." : "Request cloud data removal"}</Text>
          </Pressable>
          <Pressable onPress={() => void handleOpenPrivacyPolicy()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Open Privacy Policy</Text>
          </Pressable>
        </View>

        <Text style={styles.status}>Status: {status}</Text>
      </ScrollView>
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
    gap: 12,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.color.brandRoseBorderSoft,
    backgroundColor: t.color.surface,
    padding: 16,
    gap: 6,
    shadowColor: "#111827",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
    color: t.color.brandRose,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 12,
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: t.color.text,
  },
  subtitle: {
    color: t.color.textMuted,
    lineHeight: 21,
    marginBottom: 2,
  },
  tierPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    backgroundColor: t.color.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tierPillLabel: {
    color: t.color.textSoft,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: t.color.surface,
  },
  button: {
    borderRadius: 12,
    backgroundColor: t.color.text,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonDisabled: {
    opacity: t.opacity.disabled,
  },
  buttonLabel: {
    color: t.color.textOnDark,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: t.color.surface,
  },
  secondaryButtonLabel: {
    color: t.color.textSoft,
    fontWeight: "600",
  },
  status: {
    marginTop: 8,
    color: t.color.textMuted,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 14,
    gap: 8,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  sectionTitle: {
    color: t.color.text,
    fontSize: 17,
    fontWeight: "700",
  },
  sectionBody: {
    color: t.color.textMuted,
    lineHeight: 20,
  },
  activationNote: {
    marginTop: 4,
    color: t.color.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  privacyFinePrint: {
    color: t.color.textFaint,
    fontSize: 12,
    lineHeight: 18,
  },
});