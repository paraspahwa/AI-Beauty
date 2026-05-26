import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchReport, generateReportColorSwatchSlot, type MobilePaletteColor, type MobileReport, type MobileVisualAsset } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

type SlotState = "idle" | "generating" | "ready" | "failed";

export default function MobileColorStudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<MobileReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slotState, setSlotState] = useState<Record<number, SlotState>>({});

  const bestColors = report?.colorAnalysis?.palette?.slice(0, 6) ?? [];
  const avoidColors = report?.colorAnalysis?.avoidColors?.slice(0, 6) ?? [];

  async function loadReport() {
    try {
      setError(null);
      const next = await fetchReport(params.id);
      setReport(next);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!params.id) return;
    void loadReport();
  }, [params.id]);

  async function generateSlots(slots: number[]) {
    if (!params.id || slots.length === 0) return;
    setSlotState((prev) => {
      const next = { ...prev };
      for (const slot of slots) next[slot] = "generating";
      return next;
    });

    const results = await Promise.allSettled(slots.map((slot) => generateReportColorSwatchSlot(params.id, slot)));
    setSlotState((prev) => {
      const next = { ...prev };
      results.forEach((result, index) => {
        const slot = slots[index];
        next[slot] = result.status === "fulfilled" ? "ready" : "failed";
      });
      return next;
    });
    await loadReport();
  }

  const missingSlots = useMemo(() => {
    const current = report?.visualAssets?.assets?.colorSwatchPreviews ?? [];
    return Array.from({ length: 12 }, (_, index) => index).filter((slot) => current[slot]?.status !== "ready");
  }, [report?.visualAssets?.assets?.colorSwatchPreviews]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={t.color.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Color Swatch Studio</Text>
        <Text style={styles.subtitle}>Generate your report swatches in slot-based batches so you can retry only what is still missing.</Text>

        <View style={styles.actionRow}>
          <Pressable onPress={() => void generateSlots(Array.from({ length: 12 }, (_, index) => index))} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>Generate all 12</Text>
          </Pressable>
          <Pressable onPress={() => void generateSlots(missingSlots)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Generate missing</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Section title="Best colors">
          <View style={styles.grid}>
            {bestColors.map((color, index) => (
              <SwatchCard
                key={`best-${color.hex}-${index}`}
                slot={index}
                label={color}
                asset={report?.visualAssets?.assets?.colorSwatchPreviews?.[index]}
                state={slotState[index] ?? "idle"}
                onGenerate={() => void generateSlots([index])}
              />
            ))}
          </View>
        </Section>

        <Section title="Avoid colors">
          <View style={styles.grid}>
            {avoidColors.map((color, index) => {
              const slot = index + 6;
              return (
                <SwatchCard
                  key={`avoid-${color.hex}-${slot}`}
                  slot={slot}
                  label={color}
                  asset={report?.visualAssets?.assets?.colorSwatchPreviews?.[slot]}
                  state={slotState[slot] ?? "idle"}
                  onGenerate={() => void generateSlots([slot])}
                />
              );
            })}
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SwatchCard({ slot, label, asset, state, onGenerate }: { slot: number; label: MobilePaletteColor; asset?: MobileVisualAsset; state: SlotState; onGenerate: () => void }) {
  const isReady = asset?.status === "ready" && typeof asset?.signedUrl === "string";
  const effectiveState = state === "generating" ? "Generating..." : asset?.status === "failed" || state === "failed" ? "Failed" : isReady ? "Ready" : "Missing";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.colorChip, { backgroundColor: label.hex }]} />
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{label.name}</Text>
          <Text style={styles.cardMeta}>Slot {slot + 1} · {effectiveState}</Text>
        </View>
      </View>
      {isReady ? <Image source={{ uri: asset?.signedUrl }} style={styles.cardImage} /> : <View style={styles.cardPlaceholder}><Text style={styles.cardPlaceholderText}>{effectiveState}</Text></View>}
      <Pressable onPress={onGenerate} style={styles.retryButton}>
        <Text style={styles.retryButtonLabel}>{isReady ? "Regenerate" : "Generate slot"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: t.color.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.color.bg },
  container: { padding: 20, gap: 16 },
  backButton: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: t.color.surfaceSubtle, paddingHorizontal: 12, paddingVertical: 8 },
  backButtonLabel: { color: t.color.text, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "700", color: t.color.text },
  subtitle: { color: t.color.textMuted, lineHeight: 21 },
  actionRow: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, borderRadius: 16, backgroundColor: t.color.text, paddingVertical: 14, alignItems: "center" },
  primaryButtonLabel: { color: t.color.textOnDark, fontWeight: "700" },
  secondaryButton: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: t.color.borderStrong, backgroundColor: t.color.surface, paddingVertical: 14, alignItems: "center" },
  secondaryButtonLabel: { color: t.color.text, fontWeight: "700" },
  errorText: { color: t.color.danger },
  section: { gap: 12 },
  sectionTitle: { color: t.color.text, fontWeight: "700", fontSize: 18 },
  grid: { gap: 12 },
  card: { borderRadius: 18, backgroundColor: t.color.surface, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  colorChip: { width: 28, height: 28, borderRadius: 999, borderWidth: 1, borderColor: t.color.border },
  cardCopy: { flex: 1 },
  cardTitle: { color: t.color.text, fontWeight: "700" },
  cardMeta: { color: t.color.textMuted, fontSize: 12 },
  cardImage: { width: "100%", aspectRatio: 3 / 4, borderRadius: 16, backgroundColor: t.color.surfaceSubtle },
  cardPlaceholder: { width: "100%", aspectRatio: 3 / 4, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: t.color.surfaceMuted },
  cardPlaceholderText: { color: t.color.textMuted, fontWeight: "600" },
  retryButton: { borderRadius: 14, borderWidth: 1, borderColor: t.color.borderStrong, paddingVertical: 12, alignItems: "center" },
  retryButtonLabel: { color: t.color.text, fontWeight: "600" },
});