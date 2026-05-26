import { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { analyzeSelfie, listReports, type AnalyzeIntent } from "@/lib/api";
import { assertMobileEnv } from "@/lib/env";

const INTENT_COPY: Record<AnalyzeIntent, { title: string; subtitle: string; bullets: string[] }> = {
  report: {
    title: "Master Blueprint Report",
    subtitle: "One-time deep diagnostic with your complete beauty profile and downloadable report.",
    bullets: ["Skin routine (AM + PM)", "Color season palette", "Hairstyle guide", "Spectacles recommendations"],
  },
  studio_pro: {
    title: "Full Interactive AI Studio",
    subtitle: "Live try-ons, hair and makeup sandbox, plus premium report access and monthly generations.",
    bullets: ["Everything in Blueprint Report", "Hair and makeup try-ons", "Wardrobe and swatches", "150 generations / month"],
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

  async function pickAndAnalyze() {
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

      const response = await analyzeSelfie(asset.uri, selectedIntent);
      setStatus("Analysis started");
      router.push({
        pathname: "/analysis/[id]",
        params: { id: response.reportId, imageUri: asset.uri, intent: selectedIntent },
      });
    } catch (err) {
      Alert.alert("Analyze failed", String(err));
      setStatus("Analyze failed");
    } finally {
      setLoading(false);
    }
  }

  async function captureAndAnalyze() {
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

      const response = await analyzeSelfie(asset.uri, selectedIntent);
      setStatus("Analysis started");
      router.push({
        pathname: "/analysis/[id]",
        params: { id: response.reportId, imageUri: asset.uri, intent: selectedIntent },
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
        <Text style={styles.title}>Renovaara Mobile</Text>
        <Text style={styles.subtitle}>Upload your selfie for a free face-shape preview, then unlock your full beauty analysis.</Text>

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
                  <Text style={[styles.intentTitle, active ? styles.intentTitleActive : null]}>{INTENT_COPY[intent].title}</Text>
                  <Text style={[styles.intentBody, active ? styles.intentBodyActive : null]}>{INTENT_COPY[intent].subtitle}</Text>
                  <View style={styles.intentBulletList}>
                    {INTENT_COPY[intent].bullets.map((item) => (
                      <Text key={`${intent}-${item}`} style={[styles.intentBullet, active ? styles.intentBulletActive : null]}>• {item}</Text>
                    ))}
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

        <View style={styles.trustRow}>
          <Text style={styles.trustItem}>Private photo handling</Text>
          <Text style={styles.trustItem}>Results in about 60 seconds</Text>
          <Text style={styles.trustItem}>Instant digital delivery</Text>
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
    backgroundColor: "#fffafc",
  },
  container: {
    padding: 20,
    gap: 10,
  },
  intentSection: {
    gap: 10,
    marginBottom: 6,
  },
  intentEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#9d174d",
  },
  intentGrid: {
    gap: 10,
  },
  intentCard: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    gap: 6,
  },
  intentCardActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  intentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  intentTitleActive: {
    color: "#ffffff",
  },
  intentBody: {
    color: "#6b7280",
    lineHeight: 20,
  },
  intentBodyActive: {
    color: "rgba(255,255,255,0.8)",
  },
  intentBulletList: {
    marginTop: 4,
    gap: 3,
  },
  intentBullet: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 17,
  },
  intentBulletActive: {
    color: "rgba(255,255,255,0.75)",
  },
  tipsCard: {
    borderRadius: 16,
    backgroundColor: "#fff1f6",
    padding: 14,
    gap: 4,
  },
  tipsTitle: {
    color: "#111827",
    fontWeight: "700",
  },
  tipsBody: {
    color: "#6b7280",
    lineHeight: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  subtitle: {
    color: "#6b7280",
    lineHeight: 22,
    marginBottom: 8,
  },
  error: {
    marginBottom: 10,
    color: "#b91c1c",
  },
  button: {
    borderRadius: 12,
    backgroundColor: "#111827",
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  buttonLabelSecondary: {
    color: "#374151",
  },
  quickLinksRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickLinkItem: {
    flex: 1,
  },
  trustRow: {
    marginTop: 6,
    gap: 6,
  },
  trustItem: {
    color: "#6b7280",
    fontSize: 12,
  },
  status: {
    marginTop: 8,
    color: "#374151",
  },
  previewBlock: {
    marginTop: 8,
    gap: 8,
  },
  previewLabel: {
    color: "#374151",
    fontWeight: "600",
  },
  previewImage: {
    width: 180,
    height: 220,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
  },
});