import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { generateMakeupPreview } from "@/lib/api";
import { clearStudioHistory, type StudioHistoryItem, loadStudioHistory, pushStudioHistoryItem, saveVisualForReport } from "@/lib/studio-history";
import { mobileTheme as t } from "@/lib/theme";

type StyleOption = {
  label: string;
  style: "natural" | "glamorous" | "smoky_eyes" | "bold_lips" | "professional" | "korean_style" | "bridal";
  lipColor?: string;
  eyeshadow?: string;
  blushColor?: string;
  blushIntensity?: string;
  eyeliner?: string;
  contour?: boolean;
};

const STYLE_OPTIONS: StyleOption[] = [
  {
    label: "Soft natural",
    style: "natural",
    lipColor: "soft_pink",
    blushColor: "natural",
    blushIntensity: "soft",
    eyeliner: "subtle",
    contour: false,
  },
  {
    label: "Work polish",
    style: "professional",
    lipColor: "mauve",
    eyeshadow: "neutral",
    blushColor: "peach",
    blushIntensity: "medium",
    eyeliner: "classic",
    contour: false,
  },
  {
    label: "Evening glam",
    style: "glamorous",
    lipColor: "berry",
    eyeshadow: "bronze",
    blushColor: "rose",
    blushIntensity: "flushed",
    eyeliner: "winged",
    contour: true,
  },
  {
    label: "Bridal glow",
    style: "bridal",
    lipColor: "rose",
    eyeshadow: "pink_rose",
    blushColor: "rose",
    blushIntensity: "soft",
    eyeliner: "classic",
    contour: true,
  },
];

const INTENSITY_OPTIONS = [
  { label: "Light", value: "light" as const },
  { label: "Medium", value: "medium" as const },
  { label: "Heavy", value: "heavy" as const },
];

export default function MobileMakeupStudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; imageUrl?: string }>();
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(STYLE_OPTIONS[0]);
  const [selectedIntensity, setSelectedIntensity] = useState<(typeof INTENSITY_OPTIONS)[number]["value"]>("medium");
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
      const entries = await loadStudioHistory("makeup", params.id);
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

  async function handleGenerate() {
    try {
      if (!params.id) throw new Error("Missing report id");
      void Haptics.selectionAsync();
      setLoading(true);
      const result = await generateMakeupPreview(params.id, {
        style: selectedStyle.style,
        intensity: selectedIntensity,
        lipColor: selectedStyle.lipColor,
        eyeshadow: selectedStyle.eyeshadow,
        blushColor: selectedStyle.blushColor,
        blushIntensity: selectedStyle.blushIntensity,
        eyeliner: selectedStyle.eyeliner,
        contour: selectedStyle.contour,
      });
      const generatedUrl = result.hdUrl ?? result.lowResUrl;
      setResultUrl(generatedUrl);
      const createdAt = result.asset?.createdAt ?? new Date().toISOString();
      setResultCreatedAt(createdAt);

      if (generatedUrl) {
        const historyId = result.asset?.id ?? `makeup_${Date.now()}`;
        const next = await pushStudioHistoryItem("makeup", params.id, {
          id: historyId,
          imageUrl: generatedUrl,
          createdAt,
          label: `${selectedStyle.label} (${selectedIntensity})`,
        });
        setRecentLooks(next);
        setSelectedHistoryId(historyId);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Makeup preview", String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleClearHistory() {
    if (!params.id) return;
    void Haptics.selectionAsync();
    Alert.alert("Clear makeup history?", "This removes recent generated makeup looks for this report on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await clearStudioHistory("makeup", params.id);
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
    const visualId = selectedHistoryId ?? `makeup_saved_${Date.now()}`;
    const createdAt = resultCreatedAt ?? new Date().toISOString();
    await saveVisualForReport(params.id, {
      id: visualId,
      kind: "makeup",
      imageUrl: resultUrl,
      createdAt,
      label: `${selectedStyle.label} (${selectedIntensity})`,
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

        <Text style={styles.heading}>AI Makeup Studio</Text>
        <Text style={styles.helperText}>Choose a curated makeup direction and generate a try-on preview on your report photo.</Text>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {sourceImageUrl ? (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Source photo</Text>
            <Image source={{ uri: sourceImageUrl }} style={styles.previewImage} />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Looks</Text>
          <View style={styles.optionGrid}>
            {STYLE_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelectedStyle(option);
                }}
                style={[styles.optionChip, selectedStyle.label === option.label ? styles.optionChipActive : null]}
              >
                <Text style={[styles.optionChipLabel, selectedStyle.label === option.label ? styles.optionChipLabelActive : null]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intensity</Text>
          <View style={styles.optionGrid}>
            {INTENSITY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelectedIntensity(option.value);
                }}
                style={[styles.optionChip, selectedIntensity === option.value ? styles.optionChipActive : null]}
              >
                <Text style={[styles.optionChipLabel, selectedIntensity === option.value ? styles.optionChipLabelActive : null]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable onPress={handleGenerate} disabled={loading} style={[styles.generateButton, loading ? styles.generateButtonDisabled : null]}>
          <Text style={styles.generateButtonLabel}>{loading ? "Generating..." : "Generate preview"}</Text>
        </Pressable>

        {loading ? <ActivityIndicator size="small" color=t.color.text /> : null}

        {resultUrl ? (
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Generated preview</Text>
            <Image source={{ uri: resultUrl }} style={styles.previewImage} />
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
                  <Text style={styles.historyLabel} numberOfLines={1}>{item.label ?? "Makeup look"}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
          {!recentLooks.length && !loading ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No looks yet</Text>
              <Text style={styles.emptyStateBody}>Generate your first makeup preview to start a reusable history for this report.</Text>
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
  section: {
    gap: 10,
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

