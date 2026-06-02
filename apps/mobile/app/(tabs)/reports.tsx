import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { deleteReport, listReports, type MobileReportListItem } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ReportsTabScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [reports, setReports] = useState<MobileReportListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"continue" | "history">("continue");

  const { continueReports, historyReports, activeReports } = useMemo(() => {
    const inFlight = reports.filter((report) => report.status === "processing");
    const failed = reports.filter((report) => report.status === "failed");
    const latestReady = reports.find((report) => report.status === "ready") ?? null;
    const continueItems = [...inFlight, ...failed];
    if (latestReady && !continueItems.some((item) => item.id === latestReady.id)) {
      continueItems.push(latestReady);
    }

    const historyItems = reports.filter((report) => report.status === "ready" && report.id !== latestReady?.id);
    return {
      continueReports: continueItems,
      historyReports: historyItems,
      activeReports: activeView === "continue" ? continueItems : historyItems,
    };
  }, [reports, activeView]);

  async function load() {
    try {
      setError(null);
      const next = await listReports();
      setReports(next);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, []),
  );

  async function handleDelete(reportId: string) {
    Alert.alert("Delete report?", "This removes the report and associated assets. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              setDeletingReportId(reportId);
              await deleteReport(reportId);
              setReports((prev) => prev.filter((item) => item.id !== reportId));
            } catch (err) {
              Alert.alert("Delete report", String(err));
            } finally {
              setDeletingReportId(null);
            }
          })();
        },
      },
    ]);
  }

  async function refreshReports() {
    setLoading(true);
    await load();
  }

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
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>History</Text>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Your reports</Text>
              <Text style={styles.subtitle}>{reports.length} analyses in your history. Open any report to review insights, chat, or Studio actions.</Text>
            </View>
            <Pressable onPress={() => void refreshReports()} style={styles.refreshButton}>
              <Text style={styles.refreshButtonLabel}>Refresh</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>Your style insights</Text>
          <Text style={styles.insightsBody}>Track consistency across reports and review your aggregated profile.</Text>
          <View style={styles.insightsActions}>
            <Pressable onPress={() => router.push("/style-dna")} style={styles.insightsButton}>
              <Text style={styles.insightsButtonLabel}>Open Style DNA</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/progress")} style={styles.insightsButton}>
              <Text style={styles.insightsButtonLabel}>Open Progress</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load reports</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable onPress={() => void refreshReports()} style={styles.retryButton}>
              <Text style={styles.retryButtonLabel}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {!error && reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyBody}>Run your first analysis from Home to create a report.</Text>
          </View>
        ) : null}

        {!error && reports.length > 0 ? (
          <View style={styles.viewSwitchRow}>
            <Pressable
              onPress={() => setActiveView("continue")}
              style={[styles.viewChip, activeView === "continue" ? styles.viewChipActive : null]}
            >
              <Text style={[styles.viewChipLabel, activeView === "continue" ? styles.viewChipLabelActive : null]}>
                Continue ({continueReports.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveView("history")}
              style={[styles.viewChip, activeView === "history" ? styles.viewChipActive : null]}
            >
              <Text style={[styles.viewChipLabel, activeView === "history" ? styles.viewChipLabelActive : null]}>
                History ({historyReports.length})
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!error && reports.length > 0 && activeReports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{activeView === "continue" ? "You are all caught up" : "No older completed reports yet"}</Text>
            <Text style={styles.emptyBody}>
              {activeView === "continue"
                ? "Start a new analysis anytime to get fresh recommendations."
                : "Your previous completed reports will appear here as your history grows."}
            </Text>
          </View>
        ) : null}

        {activeReports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <Pressable onPress={() => router.push({ pathname: "/report/[id]", params: { id: report.id } })}>
              <Text style={styles.reportId} numberOfLines={1}>#{report.id.slice(0, 8)}</Text>
              <Text style={styles.reportMeta}>Status: {report.status}</Text>
              <Text style={styles.reportMeta}>Access: {report.isPaid ? "Paid" : "Preview"}</Text>
              <Text style={styles.reportMeta}>Created: {formatDate(report.createdAt)}</Text>
            </Pressable>
            <View style={styles.reportActionsRow}>
              <Pressable
                onPress={() => router.push({ pathname: "/report/[id]", params: { id: report.id } })}
                style={styles.reportActionButton}
              >
                <Text style={styles.reportActionLabel}>Open</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: "/report/[id]", params: { id: report.id, comparison: "1", tab: "studio" } })}
                style={[styles.reportActionButton, styles.reportCompareButton]}
              >
                <Text style={styles.reportActionLabel}>Compare</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleDelete(report.id)}
                style={[styles.reportDeleteButton, deletingReportId === report.id ? styles.reportDeleteButtonDisabled : null]}
                disabled={deletingReportId === report.id}
              >
                <Text style={styles.reportDeleteLabel}>{deletingReportId === report.id ? "Deleting..." : "Delete"}</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Pressable
          onPress={() => {
            if (!reports.length) {
              Alert.alert("No reports", "Create a report from Home first.");
              return;
            }
            router.push({ pathname: "/report/[id]", params: { id: reports[0].id } });
          }}
          style={styles.quickOpenButton}
        >
          <Text style={styles.quickOpenLabel}>Open latest report</Text>
        </Pressable>
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
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
    color: t.color.brandRose,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: t.color.text,
  },
  subtitle: {
    color: t.color.textMuted,
    lineHeight: 21,
    marginBottom: 0,
  },
  refreshButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: t.color.surface,
  },
  refreshButtonLabel: {
    color: t.color.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  insightsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.brandRoseBorder,
    backgroundColor: t.color.brandRoseSurface,
    padding: 14,
    gap: 8,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  insightsTitle: {
    color: t.color.text,
    fontWeight: "700",
    fontSize: 15,
  },
  insightsBody: {
    color: t.color.textMuted,
    lineHeight: 20,
  },
  insightsActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  insightsButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    backgroundColor: t.color.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  insightsButtonLabel: {
    color: t.color.textSoft,
    fontWeight: "700",
    fontSize: 12,
  },
  errorCard: {
    borderRadius: 16,
    backgroundColor: t.color.dangerSurface,
    borderWidth: 1,
    borderColor: t.color.dangerBorder,
    padding: 14,
    gap: 6,
  },
  errorTitle: {
    color: t.color.dangerStrong,
    fontWeight: "700",
  },
  errorBody: {
    color: t.color.danger,
  },
  retryButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: t.color.text,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryButtonLabel: {
    color: t.color.textOnDark,
    fontWeight: "700",
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 14,
    gap: 4,
  },
  emptyTitle: {
    color: t.color.text,
    fontWeight: "700",
  },
  emptyBody: {
    color: t.color.textMuted,
  },
  reportCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 14,
    gap: 3,
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  viewSwitchRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  viewChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    backgroundColor: t.color.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewChipActive: {
    backgroundColor: t.color.text,
    borderColor: t.color.text,
  },
  viewChipLabel: {
    color: t.color.textSoft,
    fontWeight: "700",
    fontSize: 12,
  },
  viewChipLabelActive: {
    color: t.color.textOnDark,
  },
  reportId: {
    color: t.color.text,
    fontWeight: "700",
  },
  reportMeta: {
    color: t.color.textMuted,
    fontSize: 13,
  },
  reportActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  reportActionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: t.color.surface,
  },
  reportCompareButton: {
    backgroundColor: t.color.surfaceMuted,
  },
  reportActionLabel: {
    color: t.color.textSoft,
    fontWeight: "700",
    fontSize: 12,
  },
  reportDeleteButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.color.dangerBorder,
    backgroundColor: t.color.dangerSurface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reportDeleteButtonDisabled: {
    opacity: 0.6,
  },
  reportDeleteLabel: {
    color: t.color.danger,
    fontWeight: "700",
    fontSize: 12,
  },
  quickOpenButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: t.color.text,
    paddingVertical: 12,
    alignItems: "center",
  },
  quickOpenLabel: {
    color: t.color.textOnDark,
    fontWeight: "700",
  },
});
