import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { BeforeAfterCompare } from "@/components/BeforeAfterCompare";
import { generateHairColorPreview, generateHairTransferPreview, postStudioProgress } from "@/lib/api";
import { clearStudioHistory, type StudioHistoryItem, loadStudioHistory, pushStudioHistoryItem, saveVisualForReport } from "@/lib/studio-history";
import { mobileTheme as t } from "@/lib/theme";

type HairColorOption = {
  label: string;
  colorName: string;
  colorHex: string;
};

const HAIR_COLOR_OPTIONS: HairColorOption[] = [
  { label: "Natural black", colorName: "black", colorHex: "#1f1f1f" },
  { label: "Dark brown", colorName: "dark_brown", colorHex: "#4b2e2b" },
  { label: "Chestnut", colorName: "chestnut", colorHex: "#8b5a2b" },
  { label: "Auburn", colorName: "auburn", colorHex: "#a52a2a" },
  { label: "Caramel", colorName: "caramel", colorHex: "#c68e5f" },
  { label: "Blonde", colorName: "blonde", colorHex: "#e2c07b" },
  { label: "Burgundy", colorName: "burgundy", colorHex: "#800020" },
  { label: "Silver", colorName: "silver", colorHex: "#c0c0c0" },
];

export default function MobileHairStudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; imageUrl?: string }>();
  const [mode, setMode] = useState<"custom" | "inspo">("custom");
  const [selectedColor, setSelectedColor] = useState<HairColorOption>(HAIR_COLOR_OPTIONS[0]);
  const [referenceImageUri, setReferenceImageUri] = useState<string | null>(null);
  const [detectedLook, setDetectedLook] = useState<string | null>(null);
  const [detectedStyle, setDetectedStyle] = useState<string | null>(null);
  const [detectedColor, setDetectedColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultCreatedAt, setResultCreatedAt] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [recentLooks, setRecentLooks] = useState<StudioHistoryItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

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

  const sourceImageUrl = useMemo(() => {
    const value = Array.isArray(params.imageUrl) ? params.imageUrl[0] : params.imageUrl;
    return value ?? null;
  }, [params.imageUrl]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!params.id) return;
      const entries = await loadStudioHistory("hair", params.id);
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
    modeValue: "camera" | "library",
    onPicked: (uri: string) => void,
    permissionMessage: string,
  ) {
    try {
      const permission = modeValue === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", permissionMessage);
        return;
      }

      const result = modeValue === "camera"
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

      if (result.canceled || result.assets.length === 0) return;
      void Haptics.selectionAsync();
      onPicked(result.assets[0].uri);
      setDetectedLook(null);
      setDetectedStyle(null);
      setDetectedColor(null);
    } catch (err) {
      Alert.alert("Reference image", String(err));
    }
  }

  async function handleGenerateCustom(colorOverride?: HairColorOption) {
    const color = colorOverride ?? selectedColor;
    try {
      if (!params.id) throw new Error("Missing report id");
      void Haptics.selectionAsync();
      setLoading(true);
      const result = await generateHairColorPreview(params.id, {
        colorName: color.colorName,
        colorHex: color.colorHex,
      });
      const generatedUrl = result.hdUrl ?? result.lowResUrl;
      setResultUrl(generatedUrl);
      const createdAt = result.asset?.createdAt ?? new Date().toISOString();
      setResultCreatedAt(createdAt);

      if (generatedUrl) {
        const historyId = result.asset?.id ?? `hair_${Date.now()}`;
        const next = await pushStudioHistoryItem("hair", params.id, {
          id: historyId,
          imageUrl: generatedUrl,
          createdAt,
          label: color.label,
        });
        setRecentLooks(next);
        setSelectedHistoryId(historyId);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void postStudioProgress("try_on").catch(() => undefined);
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Hair color preview", String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateInspo() {
    try {
      if (!params.id) throw new Error("Missing report id");
      if (!referenceImageUri) {
        Alert.alert("Hair reference", "Choose a hairstyle inspiration image first.");
        return;
      }

      void Haptics.selectionAsync();
      setLoading(true);
      const result = await generateHairTransferPreview(params.id, {
        referenceImageUri,
      });
      const generatedUrl = result.hdUrl ?? result.lowResUrl;
      setResultUrl(generatedUrl);
      const createdAt = result.asset?.createdAt ?? new Date().toISOString();
      setResultCreatedAt(createdAt);
      setDetectedLook(result.detectedLook ?? null);
      setDetectedStyle(result.controls?.styleName ?? null);
      setDetectedColor(result.controls?.colorName ?? null);

      if (generatedUrl) {
        const historyId = result.asset?.id ?? `hair_inspo_${Date.now()}`;
        const next = await pushStudioHistoryItem("hair", params.id, {
          id: historyId,
          imageUrl: generatedUrl,
          createdAt,
          label: result.detectedLook ? `Inspo: ${result.detectedLook}` : "Hair inspo transfer",
        });
        setRecentLooks(next);
        setSelectedHistoryId(historyId);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void postStudioProgress("try_on").catch(() => undefined);
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Hair transfer", String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleClearHistory() {
    if (!params.id) return;
    void Haptics.selectionAsync();
    Alert.alert("Clear hair history?", "This removes recent generated hair color looks for this report on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await clearStudioHistory("hair", params.id);
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
    const visualId = selectedHistoryId ?? `hair_saved_${Date.now()}`;
    const createdAt = resultCreatedAt ?? new Date().toISOString();
    await saveVisualForReport(params.id, {
      id: visualId,
      kind: "hair",
      imageUrl: resultUrl,
      createdAt,
      label: selectedColor.label,
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

        <Text style={styles.heading}>AI Hair Color Studio</Text>
        <Text style={styles.helperText}>Pick a color direction and generate a realistic recolor preview using your report photo.</Text>

        <View style={styles.modeToggleRow}>
          <Pressable onPress={() => setMode("custom")} style={[styles.modeToggleButton, mode === "custom" ? styles.modeToggleButtonActive : null]}>
            <Text style={[styles.modeToggleLabel, mode === "custom" ? styles.modeToggleLabelActive : null]}>Custom</Text>
          </Pressable>
          <Pressable onPress={() => setMode("inspo")} style={[styles.modeToggleButton, mode === "inspo" ? styles.modeToggleButtonActive : null]}>
            <Text style={[styles.modeToggleLabel, mode === "inspo" ? styles.modeToggleLabelActive : null]}>Inspo Transfer</Text>
          </Pressable>
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {sourceImageUrl ? (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Source photo</Text>
            <Image source={{ uri: sourceImageUrl }} style={styles.previewImage} />
          </View>
        ) : null}

        {mode === "custom" ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Color options</Text>
              <View style={styles.optionGrid}>
                {HAIR_COLOR_OPTIONS.map((option) => (
                  <Pressable
                    key={option.label}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setSelectedColor(option);
                    }}
                    style={[styles.optionChip, selectedColor.label === option.label ? styles.optionChipActive : null]}
                  >
                    <View style={[styles.colorDot, { backgroundColor: option.colorHex }]} />
                    <Text style={[styles.optionChipLabel, selectedColor.label === option.label ? styles.optionChipLabelActive : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => {
                const option = HAIR_COLOR_OPTIONS[Math.floor(Math.random() * HAIR_COLOR_OPTIONS.length)];
                setSelectedColor(option);
                void handleGenerateCustom(option);
              }}
              disabled={loading}
              style={[styles.generateButtonCompact, loading ? styles.generateButtonDisabled : null]}
            >
              <Text style={styles.generateButtonLabel}>Surprise Me</Text>
            </Pressable>
            <Pressable onPress={() => void handleGenerateCustom()} disabled={loading} style={[styles.generateButton, loading ? styles.generateButtonDisabled : null]}>
              <Text style={styles.generateButtonLabel}>{loading ? "Generating..." : "Generate hair color preview"}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reference image</Text>
              <Text style={styles.helperText}>Upload another person image with the hairstyle you want to transfer.</Text>
              <View style={styles.buttonRow}>
                <Pressable onPress={() => void chooseImage("library", setReferenceImageUri, "Allow photo access to choose a hairstyle reference image.")} style={styles.generateButtonCompact}>
                  <Text style={styles.generateButtonLabel}>{referenceImageUri ? "Change from library" : "Choose from library"}</Text>
                </Pressable>
                <Pressable onPress={() => void chooseImage("camera", setReferenceImageUri, "Allow camera access to capture a hairstyle reference image.")} style={styles.generateButtonCompact}>
                  <Text style={styles.generateButtonLabel}>Capture reference</Text>
                </Pressable>
              </View>
              {referenceImageUri ? <Image source={{ uri: referenceImageUri }} style={styles.previewImage} /> : null}
              {detectedLook ? <Text style={styles.detectedText}>Detected look: {detectedLook}</Text> : null}
              {(detectedStyle || detectedColor) ? (
                <Text style={styles.detectedText}>Applied controls: {detectedStyle ?? "No change"} + {detectedColor ?? "natural"}</Text>
              ) : null}
            </View>

            <Pressable onPress={() => void handleGenerateInspo()} disabled={loading || !referenceImageUri} style={[styles.generateButton, loading || !referenceImageUri ? styles.generateButtonDisabled : null]}>
              <Text style={styles.generateButtonLabel}>{loading ? "Transferring..." : "Transfer hairstyle look"}</Text>
            </Pressable>
          </>
        )}

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
                  <Text style={styles.historyLabel} numberOfLines={1}>{item.label ?? "Hair look"}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!recentLooks.length && !loading ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>No looks yet</Text>
            <Text style={styles.emptyStateBody}>Generate your first hair color preview to create reusable history for this report.</Text>
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
  modeToggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeToggleButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    paddingVertical: 8,
    alignItems: "center",
  },
  modeToggleButtonActive: {
    backgroundColor: t.color.text,
    borderColor: t.color.text,
  },
  modeToggleLabel: {
    color: t.color.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  modeToggleLabelActive: {
    color: t.color.surface,
  },
  section: {
    gap: 10,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  generateButtonCompact: {
    borderRadius: 12,
    backgroundColor: t.color.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detectedText: {
    color: t.color.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: t.color.text,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionChipActive: {
    backgroundColor: t.color.text,
    borderColor: t.color.text,
  },
  optionChipLabel: {
    color: t.color.textSoft,
    fontWeight: "600",
  },
  optionChipLabelActive: {
    color: t.color.surface,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.borderDark12,
  },
  generateButton: {
    borderRadius: 16,
    backgroundColor: t.color.text,
    paddingVertical: 14,
    alignItems: "center",
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonLabel: {
    color: t.color.surface,
    fontWeight: "700",
  },
  previewSection: {
    gap: 10,
  },
  previewImage: {
    width: "100%",
    height: 420,
    borderRadius: 24,
    backgroundColor: t.color.surfaceSubtle,
  },
  notice: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: t.color.text,
    color: t.color.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  historyRow: {
    gap: 10,
    paddingRight: 8,
  },
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clearHistoryButton: {
    borderRadius: 999,
    backgroundColor: t.color.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearHistoryLabel: {
    fontSize: 12,
    color: t.color.textSoft,
    fontWeight: "700",
  },
  historyCard: {
    width: 132,
    gap: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 2,
  },
  historyCardActive: {
    borderColor: t.color.text,
  },
  historyImageWrap: {
    position: "relative",
  },
  historyImage: {
    width: 132,
    height: 168,
    borderRadius: 14,
    backgroundColor: t.color.surfaceSubtle,
  },
  historyTimePill: {
    position: "absolute",
    right: 6,
    bottom: 6,
    borderRadius: 999,
    backgroundColor: t.color.overlayDark78,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  historyTimeText: {
    color: t.color.surface,
    fontSize: 10,
    fontWeight: "700",
  },
  currentBadge: {
    position: "absolute",
    left: 6,
    top: 6,
    borderRadius: 999,
    backgroundColor: t.color.overlayDark86,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: {
    color: t.color.surface,
    fontSize: 10,
    fontWeight: "700",
  },
  historyLabel: {
    fontSize: 12,
    color: t.color.textSoft,
    fontWeight: "600",
  },
  timestampText: {
    color: t.color.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonLabel: {
    color: t.color.textSoft,
    fontWeight: "600",
  },
  emptyStateCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 14,
    gap: 4,
  },
  emptyStateTitle: {
    color: t.color.text,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyStateBody: {
    color: t.color.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});

