import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchProgressReports, type MobileProgressReport } from "@/lib/api";
import { PillButton } from "@/lib/ui/PillButton";
import { mobileTheme as t } from "@/lib/theme";

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function dominant(items: string[]): string | null {
  if (!items.length) return null;
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function consistency(items: string[]): number {
  if (!items.length) return 0;
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
  const top = Math.max(...Object.values(counts));
  return Math.round((top / items.length) * 100);
}

export default function ProgressScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<MobileProgressReport[]>([]);

  async function load() {
    try {
      setError(null);
      const next = await fetchProgressReports();
      setReports(next);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    await load();
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, []),
  );

  const seasonValues = useMemo(() => reports.map((item) => item.colorAnalysis?.season).filter((item): item is string => Boolean(item)), [reports]);
  const faceValues = useMemo(() => reports.map((item) => item.faceShape?.shape).filter((item): item is string => Boolean(item)), [reports]);
  const skinValues = useMemo(() => reports.map((item) => item.skinAnalysis?.type).filter((item): item is string => Boolean(item)), [reports]);

  const dominantSeason = dominant(seasonValues);
  const dominantFace = dominant(faceValues);
  const dominantSkin = dominant(skinValues);
  const firstReport = reports[0] ?? null;

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
        <View style={styles.topActions}>
          <PillButton label="My reports" variant="subtle" onPress={() => router.back()} />
          <PillButton label="Refresh" variant="subtle" onPress={() => void refresh()} />
        </View>

        <Text style={styles.eyebrow}>✦ Your Journey</Text>
        <Text style={styles.title}>Progress Tracker</Text>
        <Text style={styles.subtitle}>
          How your style profile has evolved across {reports.length} completed {reports.length === 1 ? "analysis" : "analyses"}.
        </Text>

        {error ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
            <PillButton label="Try again" onPress={() => void refresh()} />
          </View>
        ) : null}

        {reports.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No completed analyses yet</Text>
            <Text style={styles.noteText}>Complete your first beauty analysis and return here to track how your profile evolves.</Text>
            <PillButton label="Get my report" onPress={() => router.push("/home")} />
          </View>
        ) : reports.length === 1 && firstReport ? (
          <View style={styles.card}>
            <Text style={styles.noteText}>You have 1 analysis. Complete a second one to see how your profile evolves over time.</Text>
            <View style={styles.singleTagsRow}>
              {firstReport.colorAnalysis?.season ? <Text style={styles.singleTag}>{firstReport.colorAnalysis.season}</Text> : null}
              {firstReport.faceShape?.shape ? <Text style={styles.singleTag}>{firstReport.faceShape.shape} face</Text> : null}
              {firstReport.skinAnalysis?.type ? <Text style={styles.singleTag}>{firstReport.skinAnalysis.type} skin</Text> : null}
            </View>
            <PillButton label="Add another analysis" variant="outline" onPress={() => router.push("/home")} />
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              {dominantSeason ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Dominant season</Text>
                  <Text style={styles.summaryValue}>{dominantSeason}</Text>
                  <Text style={styles.summaryMeta}>Consistency {consistency(seasonValues)}%</Text>
                </View>
              ) : null}
              {dominantFace ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Dominant face shape</Text>
                  <Text style={styles.summaryValue}>{dominantFace}</Text>
                  <Text style={styles.summaryMeta}>Consistency {consistency(faceValues)}%</Text>
                </View>
              ) : null}
              {dominantSkin ? (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Dominant skin type</Text>
                  <Text style={styles.summaryValue}>{dominantSkin}</Text>
                  <Text style={styles.summaryMeta}>Consistency {consistency(skinValues)}%</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Timeline</Text>
              <View style={styles.timelineList}>
                {reports.map((item, index) => (
                  <View key={item.id} style={styles.timelineItem}>
                    <View style={styles.timelineDotColumn}>
                      <View style={[styles.timelineDot, index === reports.length - 1 ? styles.timelineDotActive : null]} />
                      {index < reports.length - 1 ? <View style={styles.timelineLine} /> : null}
                    </View>
                    <View style={styles.timelineCopy}>
                      <Text style={styles.timelineDate}>{formatDate(item.createdAt)}</Text>
                      <Text style={styles.timelineMeta}>Season: {item.colorAnalysis?.season ?? "-"}</Text>
                      <Text style={styles.timelineMeta}>Face: {item.faceShape?.shape ?? "-"}</Text>
                      <Text style={styles.timelineMeta}>Skin: {item.skinAnalysis?.type ?? "-"}</Text>
                      <Pressable
                        onPress={() => router.push({ pathname: "/report/[id]", params: { id: item.id } })}
                        style={styles.timelineButton}
                      >
                        <Text style={styles.timelineButtonLabel}>Open report</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: t.color.bg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.bg,
  },
  container: {
    padding: 20,
    gap: 12,
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: t.color.text,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "700",
    color: t.color.brandWarm,
  },
  subtitle: {
    color: t.color.textMuted,
    lineHeight: 21,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: t.color.text,
    fontWeight: "700",
    fontSize: 16,
  },
  summaryRow: {
    gap: 10,
  },
  summaryCard: {
    borderRadius: 14,
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.border,
    padding: 12,
    gap: 4,
  },
  summaryLabel: {
    color: t.color.textFaint,
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: t.color.text,
    fontWeight: "700",
    fontSize: 17,
  },
  summaryMeta: {
    color: t.color.textMuted,
    fontSize: 12,
  },
  singleTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  singleTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    backgroundColor: t.color.surfaceMuted,
    color: t.color.textSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  timelineList: {
    gap: 10,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 10,
  },
  timelineDotColumn: {
    width: 18,
    alignItems: "center",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: t.color.borderStrong,
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: t.color.text,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    minHeight: 22,
    backgroundColor: t.color.border,
    marginTop: 4,
  },
  timelineCopy: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.color.divider,
    backgroundColor: t.color.bg,
    padding: 10,
    gap: 4,
  },
  timelineDate: {
    color: t.color.text,
    fontWeight: "700",
  },
  timelineMeta: {
    color: t.color.textMuted,
    fontSize: 13,
  },
  timelineButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: t.color.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timelineButtonLabel: {
    color: t.color.textOnDark,
    fontSize: 12,
    fontWeight: "700",
  },
  noteText: {
    color: t.color.textMuted,
  },
  errorText: {
    color: t.color.danger,
  },
});

