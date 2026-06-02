import { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { analyzeSelfie, listReports, type AnalyzeIntent } from "@/lib/api";
import { assertMobileEnv } from "@/lib/env";
import { mobileTheme as t } from "@/lib/theme";

const INTENT_COPY: Record<AnalyzeIntent, { title: string; subtitle: string; bullets: string[]; price: string; cadence: string; badge?: string }> = {
  report: {
    title: "Master Blueprint Report",
    subtitle: "One-time deep diagnostic with your complete beauty profile and downloadable report.",
    bullets: ["Skin routine (AM + PM)", "Color season palette", "Hairstyle guide", "Spectacles recommendations", "PDF download + style chat"],
    price: "\u20b9299",
    cadence: "One-time",
  },
  studio_pro: {
    title: "Full Interactive AI Studio",
    subtitle: "Live try-ons, hair and makeup sandbox, plus premium report access and monthly generations.",
    bullets: ["Everything in Blueprint Report", "Hair and makeup try-ons", "Wardrobe and swatches", "150 generations / month", "Cancel anytime"],
    price: "\u20b9999/mo",
    cadence: "Monthly",
    badge: "Best value",
  },
};

const TIPS = [
  "Look straight into the camera and keep hair off your forehead",
  "Use natural light and avoid heavy filters",
  "Use one face per photo for strongest results",
];

export default function HomeTabScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<AnalyzeIntent>("report");

  const envOk = useMemo(() => {
    try {
      assertMobileEnv();
      return true;
    } catch {
      return false;
    }
  }, []);

  async function openLatestReport() {
    try {
      setLoading(true);
      const reports = await listReports(1);
      if (!reports.length) {
        Alert.alert("No reports yet", "Run your first analysis to create a report.");
        return;
      }
      router.push({ pathname: "/report/[id]", params: { id: reports[0].id } });
    } catch (err) {
      Alert.alert("Open latest report", String(err));
    } finally {
      setLoading(false);
    }
  }

  async function pickAndAnalyze(intentOverride?: AnalyzeIntent) {
    try {
      setLoading(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow photo access to upload a selfie.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled || result.assets.length === 0) {
        setStatus("Image selection cancelled");
        return;
      }

      const asset = result.assets[0];
      setSelectedImageUri(asset.uri);
      setStatus("Uploading selfie...");

      const effectiveIntent = intentOverride ?? selectedIntent;
      const response = await analyzeSelfie(asset.uri, effectiveIntent);
      setStatus("Analysis started");
      router.push({
        pathname: "/analysis/[id]",
        params: { id: response.reportId, imageUri: asset.uri, intent: effectiveIntent },
      });
    } catch (err) {
      Alert.alert("Analyze failed", String(err));
      setStatus("Analyze failed");
    } finally {
      setLoading(false);
    }
  }

  async function captureAndAnalyze(intentOverride?: AnalyzeIntent) {
    try {
      setLoading(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow camera access to capture a selfie.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        cameraType: ImagePicker.CameraType.front,
        quality: 0.9,
      });

      if (result.canceled || result.assets.length === 0) {
        setStatus("Camera capture cancelled");
        return;
      }

      const asset = result.assets[0];
      setSelectedImageUri(asset.uri);
      setStatus("Uploading selfie...");

      const effectiveIntent = intentOverride ?? selectedIntent;
      const response = await analyzeSelfie(asset.uri, effectiveIntent);
      setStatus("Analysis started");
      router.push({
        pathname: "/analysis/[id]",
        params: { id: response.reportId, imageUri: asset.uri, intent: effectiveIntent },
      });
    } catch (err) {
      Alert.alert("Analyze failed", String(err));
      setStatus("Analyze failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Renovaara Mobile</Text>
          <Text style={styles.title}>Upload your selfie</Text>
          <Text style={styles.subtitle}>Upload your selfie for a free face-shape overview, then unlock your complete skin routine, hairstyle guide, virtual try-ons, and more.</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaLabel}>Fast result</Text>
            </View>
            <View style={styles.heroMetaPill}>
              <Text style={styles.heroMetaLabel}>Private upload</Text>
            </View>
          </View>
          <ActionButton
            label="One-tap instant analysis"
            disabled={loading || !envOk}
            onPress={() => {
              setSelectedIntent("report");
              void pickAndAnalyze("report");
            }}
          />
        </View>

        <View style={styles.intentSection}>
          <Text style={styles.intentEyebrow}>Choose your path</Text>
          <View style={styles.intentGrid}>
            {(["report", "studio_pro"] as AnalyzeIntent[]).map((intent) => {
              const active = selectedIntent === intent;
              return (
                <Pressable
                  key={intent}
                  onPress={() => setSelectedIntent(intent)}
                  style={[styles.intentCard, active ? styles.intentCardActive : null]}
                >
                  {INTENT_COPY[intent].badge ? (
                    <View style={[styles.intentBadge, active ? styles.intentBadgeActive : null]}>
                      <Text style={styles.intentBadgeLabel}>{INTENT_COPY[intent].badge}</Text>
                    </View>
                  ) : null}
                  <Text style={[styles.intentTitle, active ? styles.intentTitleActive : null]}>{INTENT_COPY[intent].title}</Text>
                  <Text style={[styles.intentBody, active ? styles.intentBodyActive : null]}>{INTENT_COPY[intent].subtitle}</Text>
                  <View style={styles.intentBulletList}>
                    {INTENT_COPY[intent].bullets.map((item) => (
                      <Text key={`${intent}-${item}`} style={[styles.intentBullet, active ? styles.intentBulletActive : null]}>• {item}</Text>
                    ))}
                  </View>
                  <View style={styles.intentPriceRow}>
                    <Text style={[styles.intentPrice, active ? styles.intentTitleActive : null]}>{INTENT_COPY[intent].cadence} · {INTENT_COPY[intent].price}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Photo tips</Text>
            {TIPS.map((tip) => (
              <Text key={tip} style={styles.tipsBody}>• {tip}</Text>
            ))}
          </View>
        </View>

        {!envOk ? (
          <Text style={styles.error}>Set EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_SUPABASE_URL, and EXPO_PUBLIC_SUPABASE_ANON_KEY.</Text>
        ) : null}

        <ActionButton
          label={`Capture selfie for ${selectedIntent === "studio_pro" ? "Studio Pro" : "Complete Analysis"}`}
          disabled={loading || !envOk}
          onPress={captureAndAnalyze}
        />
        <ActionButton
          label={`Pick selfie for ${selectedIntent === "studio_pro" ? "Studio Pro" : "Complete Analysis"}`}
          disabled={loading || !envOk}
          onPress={pickAndAnalyze}
        />
        <ActionButton label="Open latest report" disabled={loading || !envOk} onPress={openLatestReport} variant="secondary" />
        <View style={styles.quickLinksRow}>
          <View style={styles.quickLinkItem}>
            <ActionButton label="Open Style DNA" disabled={loading || !envOk} onPress={() => router.push("/style-dna")} variant="secondary" />
          </View>
          <View style={styles.quickLinkItem}>
            <ActionButton label="Open Progress" disabled={loading || !envOk} onPress={() => router.push("/progress")} variant="secondary" />
          </View>
        </View>

        <View style={styles.trustCard}>
          <Text style={styles.trustTitle}>Why users finish here</Text>
          <View style={styles.trustRow}>
            <Text style={styles.trustItem}>Private photo handling</Text>
            <Text style={styles.trustItem}>Results in about 60 seconds</Text>
            <Text style={styles.trustItem}>Instant digital delivery</Text>
          </View>
        </View>

        {selectedImageUri ? (
          <View style={styles.previewBlock}>
            <Text style={styles.previewLabel}>Selected selfie</Text>
            <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
          </View>
        ) : null}

        <Text style={styles.status}>Status: {status}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === "secondary" ? styles.buttonSecondary : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text style={[styles.buttonLabel, variant === "secondary" ? styles.buttonLabelSecondary : null]}>{label}</Text>
    </Pressable>
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
    gap: 8,
    shadowColor: "#111827",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: t.color.brandRose,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  heroMetaPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroMetaLabel: {
    color: t.color.textSoft,
    fontSize: 11,
    fontWeight: "700",
  },
  intentSection: {
    gap: 10,
    marginBottom: 4,
  },
  intentEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: t.color.brandRose,
  },
  intentGrid: {
    gap: 10,
  },
  intentCard: {
    borderRadius: 18,
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.border,
    padding: 16,
    gap: 6,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  intentBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    backgroundColor: t.color.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  intentBadgeActive: {
    borderColor: t.color.surface,
    backgroundColor: t.color.overlayDark08,
  },
  intentBadgeLabel: {
    color: t.color.textSoft,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  intentCardActive: {
    backgroundColor: t.color.text,
    borderColor: t.color.text,
  },
  intentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: t.color.text,
  },
  intentTitleActive: {
    color: t.color.textOnDark,
  },
  intentBody: {
    color: t.color.textMuted,
    lineHeight: 20,
  },
  intentBodyActive: {
    color: t.color.textOnDark80,
  },
  intentBulletList: {
    marginTop: 4,
    gap: 3,
  },
  intentBullet: {
    color: t.color.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  intentBulletActive: {
    color: t.color.textOnDark75,
  },
  intentPriceRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: t.color.overlayDark08,
  },
  intentPrice: {
    color: t.color.text,
    fontSize: 13,
    fontWeight: "700",
  },
  tipsCard: {
    borderRadius: 16,
    backgroundColor: t.color.brandRoseSurface,
    borderWidth: 1,
    borderColor: t.color.brandRoseBorder,
    padding: 14,
    gap: 4,
  },
  tipsTitle: {
    color: t.color.text,
    fontWeight: "700",
  },
  tipsBody: {
    color: t.color.textMuted,
    lineHeight: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: t.color.text,
    lineHeight: 36,
  },
  subtitle: {
    color: t.color.textMuted,
    lineHeight: 22,
    marginBottom: 2,
  },
  error: {
    marginBottom: 10,
    color: t.color.danger,
  },
  button: {
    borderRadius: 12,
    backgroundColor: t.color.text,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonSecondary: {
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
  },
  buttonDisabled: {
    opacity: t.opacity.disabled,
  },
  buttonLabel: {
    color: t.color.textOnDark,
    fontWeight: "700",
  },
  buttonLabelSecondary: {
    color: t.color.textSoft,
  },
  quickLinksRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  quickLinkItem: {
    flex: 1,
  },
  trustCard: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 12,
    gap: 8,
  },
  trustTitle: {
    color: t.color.text,
    fontSize: 13,
    fontWeight: "700",
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  trustItem: {
    color: t.color.textSoft,
    fontSize: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  status: {
    marginTop: 8,
    color: t.color.textSoft,
    fontSize: 12,
  },
  previewBlock: {
    marginTop: 8,
    gap: 8,
  },
  previewLabel: {
    color: t.color.textSoft,
    fontWeight: "600",
  },
  previewImage: {
    width: 180,
    height: 220,
    borderRadius: 16,
    backgroundColor: t.color.surfaceSubtle,
  },
});