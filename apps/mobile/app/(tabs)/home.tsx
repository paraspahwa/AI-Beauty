import { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { analyzeSelfie, listReports } from "@/lib/api";
import { assertMobileEnv } from "@/lib/env";

export default function HomeTabScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

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

      const response = await analyzeSelfie(asset.uri);
      setStatus("Analysis started");
      router.push({ pathname: "/analysis/[id]", params: { id: response.reportId, imageUri: asset.uri } });
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

      const response = await analyzeSelfie(asset.uri);
      setStatus("Analysis started");
      router.push({ pathname: "/analysis/[id]", params: { id: response.reportId, imageUri: asset.uri } });
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
        <Text style={styles.subtitle}>Upload a selfie to generate your personalized beauty report.</Text>

        {!envOk ? (
          <Text style={styles.error}>Set EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_SUPABASE_URL, and EXPO_PUBLIC_SUPABASE_ANON_KEY.</Text>
        ) : null}

        <ActionButton label="Capture selfie and analyze" disabled={loading || !envOk} onPress={captureAndAnalyze} />
        <ActionButton label="Pick selfie and analyze" disabled={loading || !envOk} onPress={pickAndAnalyze} />
        <ActionButton label="Open latest report" disabled={loading || !envOk} onPress={openLatestReport} variant="secondary" />

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