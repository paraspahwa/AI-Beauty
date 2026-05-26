import { useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { uploadStudioCanvas } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

export default function CreateCanvasScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pickImage(mode: "camera" | "library") {
    try {
      const permission = mode === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", mode === "camera" ? "Allow camera access to capture your canvas photo." : "Allow photo access to choose your canvas photo.");
        return;
      }

      const result = mode === "camera"
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, cameraType: ImagePicker.CameraType.front, quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.9 });
      if (result.canceled || result.assets.length === 0) return;
      setImageUri(result.assets[0].uri);
    } catch (err) {
      Alert.alert("Canvas photo", String(err));
    }
  }

  async function startCanvas() {
    if (!imageUri) return;
    try {
      setUploading(true);
      const response = await uploadStudioCanvas(imageUri);
      router.push({ pathname: "/studio/canvas/[id]", params: { id: response.canvasId, photoUrl: response.photoUrl, tier: response.quota.tier, remaining: String(response.quota.remaining) } });
    } catch (err) {
      Alert.alert("Studio Canvas", String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Start Studio Canvas</Text>
        <Text style={styles.subtitle}>Upload a photo to open standalone Studio actions without creating a report first.</Text>

        <View style={styles.buttonRow}>
          <Pressable onPress={() => void pickImage("camera")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>Capture photo</Text>
          </Pressable>
          <Pressable onPress={() => void pickImage("library")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Choose from library</Text>
          </Pressable>
        </View>

        {imageUri ? (
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          </View>
        ) : null}

        <Pressable onPress={() => void startCanvas()} disabled={!imageUri || uploading} style={[styles.primaryButton, !imageUri || uploading ? styles.buttonDisabled : null]}>
          <Text style={styles.primaryButtonLabel}>{uploading ? "Creating canvas..." : "Open Studio Canvas"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: t.color.bg },
  container: { padding: 20, gap: 16 },
  backButton: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: t.color.surfaceSubtle, paddingHorizontal: 12, paddingVertical: 8 },
  backButtonLabel: { color: t.color.text, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "700", color: t.color.text },
  subtitle: { color: t.color.textMuted, lineHeight: 21 },
  buttonRow: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, borderRadius: 16, backgroundColor: t.color.text, paddingVertical: 14, alignItems: "center" },
  primaryButtonLabel: { color: t.color.textOnDark, fontWeight: "700" },
  secondaryButton: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: t.color.borderStrong, backgroundColor: t.color.surface, paddingVertical: 14, alignItems: "center" },
  secondaryButtonLabel: { color: t.color.text, fontWeight: "700" },
  buttonDisabled: { opacity: 0.5 },
  previewCard: { borderRadius: 18, backgroundColor: t.color.surface, padding: 14 },
  previewImage: { width: "100%", aspectRatio: 3 / 4, borderRadius: 18, backgroundColor: t.color.surfaceSubtle },
});
