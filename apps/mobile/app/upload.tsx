import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { startAnalysisFromSelfie } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { mobileTheme as t } from "@/lib/theme";

export default function UploadScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function pickAndAnalyze(useCamera: boolean) {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      router.replace("/account");
      return;
    }

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to upload a selfie.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.9 });

    if (result.canceled || !result.assets.length) return;

    try {
      setLoading(true);
      const { reportId } = await startAnalysisFromSelfie(result.assets[0].uri, "report");
      router.replace({
        pathname: "/analysis/[id]",
        params: { id: reportId, imageUri: result.assets[0].uri },
      });
    } catch (err) {
      Alert.alert("Upload failed", String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Full analysis</Text>
        <Text style={styles.title}>Unlock your complete beauty report</Text>
        <Text style={styles.subtitle}>
          Upload a clear front-facing selfie. We analyze face shape, color season, skin type, hairstyle, and spectacles — then open your report with try-ons ready.
        </Text>

        <Pressable
          style={[styles.primaryButton, loading ? styles.primaryButtonDisabled : null]}
          onPress={() => void pickAndAnalyze(false)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={t.color.textOnDark} />
          ) : (
            <Text style={styles.primaryButtonLabel}>Choose from library</Text>
          )}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => void pickAndAnalyze(true)} disabled={loading}>
          <Text style={styles.secondaryButtonLabel}>Take photo</Text>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Back to Try-On</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.color.bg },
  container: { padding: 20, gap: 14, paddingBottom: 40 },
  eyebrow: { fontSize: 12, fontWeight: "700", color: t.color.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: "800", color: t.color.text, lineHeight: 34 },
  subtitle: { fontSize: 15, color: t.color.textSoft, lineHeight: 22, marginBottom: 8 },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: t.color.text,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonLabel: { color: t.color.textOnDark, fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonLabel: { color: t.color.text, fontWeight: "600", fontSize: 15 },
  link: { textAlign: "center", color: t.color.textMuted, fontWeight: "600", marginTop: 8 },
});
