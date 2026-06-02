import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { BeforeAfterCompare } from "@/components/BeforeAfterCompare";
import { generateGlassesPreview } from "@/lib/api";
import { clearStudioHistory, type StudioHistoryItem, loadStudioHistory, pushStudioHistoryItem, saveVisualForReport } from "@/lib/studio-history";
import { mobileTheme as t } from "@/lib/theme";

export default function MobileGlassesStudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; imageUrl?: string }>();
  const [referenceImageUri, setReferenceImageUri] = useState<string | null>(null);
  const [personImageUri, setPersonImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultCreatedAt, setResultCreatedAt] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [recentLooks, setRecentLooks] = useState<StudioHistoryItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const sourceImageUrl = useMemo(() => {
    const value = Array.isArray(params.imageUrl) ? params.imageUrl[0] : params.imageUrl;
    return value ?? null;
  }, [params.imageUrl]);

  function formatUpdatedAt(value: string | null): string | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatHistoryTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!params.id) return;
      const entries = await loadStudioHistory("glasses", params.id);
      if (!cancelled) {
        setRecentLooks(entries);
        if (entries.length > 0) {
          setSelectedHistoryId(entries[0].id);
          setResultUrl(entries[0].imageUrl);
          setResultCreatedAt(entries[0].createdAt);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function chooseImage(
    mode: "camera" | "library",
    onPicked: (uri: string) => void,
    permissionMessage: string,
  ) {
    try {
      const permission = mode === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", permissionMessage);
        return;
      }

      const result = mode === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            cameraType: ImagePicker.CameraType.back,
            quality: 0.9,
          })
        : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      void Haptics.selectionAsync();
      onPicked(result.assets[0].uri);
    } catch (err) {
      Alert.alert("Reference image", String(err));
    }
  }

  async function handleGenerate() {
    try {
      if (!params.id) throw new Error("Missing report id");
      if (!referenceImageUri) {
        Alert.alert("Glasses reference", "Choose a glasses reference image first.");
        return;
      }

      void Haptics.selectionAsync();
      setLoading(true);
      const result = await generateGlassesPreview(params.id, {
        clothImageUri: referenceImageUri,
        personImageUri: personImageUri ?? undefined,
      });
      const generatedUrl = result.hdUrl ?? result.lowResUrl;
      setResultUrl(generatedUrl);
      const createdAt = result.asset?.createdAt ?? new Date().toISOString();
      setResultCreatedAt(createdAt);

      if (generatedUrl) {
        const historyId = result.asset?.id ?? `glasses_${Date.now()}`;
        const next = await pushStudioHistoryItem("glasses", params.id, {
          id: historyId,
          imageUrl: generatedUrl,
          createdAt,
          label: "Glasses try-on",
        });
        setRecentLooks(next);
        setSelectedHistoryId(historyId);
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Glasses preview", String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleClearHistory() {
    if (!params.id) return;
    void Haptics.selectionAsync();
    Alert.alert("Clear glasses history?", "This removes recent generated glasses looks for this report on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await clearStudioHistory("glasses", params.id);
            setRecentLooks([]);
            setNotice("History cleared");
            setTimeout(() => setNotice(null), 1800);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          })();
        },
      },
    ]);
  }

  async function handleUseInReport() {
    if (!params.id || !resultUrl) return;
    const visualId = selectedHistoryId ?? `glasses_saved_${Date.now()}`;
    const createdAt = resultCreatedAt ?? new Date().toISOString();
    await saveVisualForReport(params.id, {
      id: visualId,
      kind: "glasses",
      imageUrl: resultUrl,
      createdAt,
      label: "Glasses try-on",
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotice("Saved to report visuals");
    setTimeout(() => setNotice(null), 1800);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>Back</Text>
        </Pressable>

        <Text style={styles.heading}>AI Glasses Studio</Text>
        <Text style={styles.helperText}>Choose a glasses reference image and generate a try-on preview using your report photo.</Text>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {sourceImageUrl ? (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Source photo</Text>
            <Image source={{ uri: sourceImageUrl }} style={styles.previewImage} />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reference image</Text>
          <Text style={styles.helperText}>Upload a clean product or model image of the frame shape you want to try.</Text>
          <View style={styles.buttonRow}>
            <Pressable onPress={() => void chooseImage("library", setReferenceImageUri, "Allow photo access to choose a glasses reference image.")} style={styles.generateButtonCompact}>
              <Text style={styles.generateButtonLabel}>{referenceImageUri ? "Change from library" : "Choose from library"}</Text>
            </Pressable>
            <Pressable onPress={() => void chooseImage("camera", setReferenceImageUri, "Allow camera access to capture a glasses reference image.")} style={styles.generateButtonCompact}>
              <Text style={styles.generateButtonLabel}>Capture reference</Text>
            </Pressable>
          </View>
          {referenceImageUri ? <Image source={{ uri: referenceImageUri }} style={styles.previewImage} /> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alternate person photo</Text>
          <Text style={styles.helperText}>Optional. Override the report selfie with another person image for better try-on alignment.</Text>
          <View style={styles.buttonRow}>
            <Pressable onPress={() => void chooseImage("library", setPersonImageUri, "Allow photo access to choose a person image.")} style={styles.secondaryButtonCompact}>
              <Text style={styles.secondaryButtonLabel}>{personImageUri ? "Change person photo" : "Choose person photo"}</Text>
            </Pressable>
            <Pressable onPress={() => void chooseImage("camera", setPersonImageUri, "Allow camera access to capture a person image.")} style={styles.secondaryButtonCompact}>
              <Text style={styles.secondaryButtonLabel}>Capture person</Text>
            </Pressable>
          </View>
          {personImageUri ? (
            <>
              <Image source={{ uri: personImageUri }} style={styles.previewImage} />
              <Pressable onPress={() => setPersonImageUri(null)} style={styles.clearPersonButton}>
                <Text style={styles.clearPersonButtonLabel}>Use original report photo instead</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        <Pressable onPress={() => void handleGenerate()} disabled={loading || !referenceImageUri} style={[styles.generateButton, loading || !referenceImageUri ? styles.generateButtonDisabled : null]}>
          <Text style={styles.generateButtonLabel}>{loading ? "Generating..." : "Generate glasses preview"}</Text>
        </Pressable>

        {loading ? <ActivityIndicator size="small" color={t.color.text} /> : null}

        {resultUrl ? (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Generated preview</Text>
            {sourceImageUrl ? (
              <BeforeAfterCompare beforeUri={sourceImageUrl} afterUri={resultUrl} height={420} />
            ) : (
              <Image source={{ uri: resultUrl }} style={styles.previewImage} />
            )}
            {formatUpdatedAt(resultCreatedAt) ? <Text style={styles.timestampText}>Last updated: {formatUpdatedAt(resultCreatedAt)}</Text> : null}
            <Pressable onPress={() => void handleUseInReport()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonLabel}>Use latest look in report</Text>
            </Pressable>
          </View>
        ) : null}

        {recentLooks.length ? (
          <View style={styles.previewSection}>
            <View style={styles.historyHeaderRow}>
              <Text style={styles.sectionTitle}>Recent generated looks</Text>
              <Pressable onPress={() => void handleClearHistory()} style={styles.clearHistoryButton}>
                <Text style={styles.clearHistoryLabel}>Clear history</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyRow}>
              {recentLooks.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setResultUrl(item.imageUrl);
                    setResultCreatedAt(item.createdAt);
                    setSelectedHistoryId(item.id);
                  }}
                  style={[styles.historyCard, selectedHistoryId === item.id ? styles.historyCardActive : null]}
                >
                  <View style={styles.historyImageWrap}>
                    <Image source={{ uri: item.imageUrl }} style={styles.historyImage} />
                    {selectedHistoryId === item.id ? (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    ) : null}
                    {formatHistoryTime(item.createdAt) ? (
                      <View style={styles.historyTimePill}>
                        <Text style={styles.historyTimeText}>{formatHistoryTime(item.createdAt)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.historyLabel} numberOfLines={1}>{item.label ?? "Glasses look"}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!recentLooks.length && !loading ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>No looks yet</Text>
            <Text style={styles.emptyStateBody}>Choose a frame reference and generate your first glasses preview for this report.</Text>
          </View>
        ) : null}
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
    gap: 16,
  },
  backButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: t.color.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonLabel: {
    color: t.color.text,
    fontWeight: "600",
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: t.color.text,
  },
  helperText: {
    color: t.color.textMuted,
    lineHeight: 21,
  },
  notice: {
    color: t.color.brandWarm,
    fontWeight: "600",
  },
  section: {
    gap: 10,
  },
  previewSection: {
    borderRadius: 18,
    backgroundColor: t.color.surface,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: t.color.text,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 18,
    backgroundColor: t.color.surfaceSubtle,
  },
  generateButton: {
    borderRadius: 16,
    backgroundColor: t.color.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonCompact: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: t.color.text,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  generateButtonLabel: {
    color: t.color.textOnDark,
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonLabel: {
    color: t.color.text,
    fontWeight: "600",
  },
  secondaryButtonCompact: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  clearPersonButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  clearPersonButtonLabel: {
    color: t.color.textMuted,
    fontWeight: "600",
  },
  timestampText: {
    color: t.color.textMuted,
    fontSize: 12,
  },
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  clearHistoryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearHistoryLabel: {
    color: t.color.text,
    fontWeight: "600",
    fontSize: 12,
  },
  historyRow: {
    gap: 12,
  },
  historyCard: {
    width: 164,
    gap: 8,
  },
  historyCardActive: {
    opacity: 1,
  },
  historyImageWrap: {
    position: "relative",
  },
  historyImage: {
    width: 164,
    height: 220,
    borderRadius: 18,
    backgroundColor: t.color.surfaceSubtle,
  },
  currentBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 999,
    backgroundColor: t.color.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currentBadgeText: {
    color: t.color.textOnDark,
    fontSize: 10,
    fontWeight: "700",
  },
  historyTimePill: {
    position: "absolute",
    right: 10,
    bottom: 10,
    borderRadius: 999,
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyTimeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  historyLabel: {
    color: t.color.text,
    fontWeight: "600",
  },
  emptyStateCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 14,
    gap: 6,
  },
  emptyStateTitle: {
    color: t.color.text,
    fontWeight: "700",
  },
  emptyStateBody: {
    color: t.color.textMuted,
    lineHeight: 20,
  },
});