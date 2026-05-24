import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { listReports, type MobileReportListItem } from "@/lib/api";

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ReportsTabScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<MobileReportListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#111827" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Your reports</Text>
        <Text style={styles.subtitle}>Open any report to review insights, chat, or Studio actions.</Text>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load reports</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryButton}>
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

        {reports.map((report) => (
          <Pressable
            key={report.id}
            onPress={() => router.push({ pathname: "/report/[id]", params: { id: report.id } })}
            style={styles.reportCard}
          >
            <Text style={styles.reportId} numberOfLines={1}>#{report.id.slice(0, 8)}</Text>
            <Text style={styles.reportMeta}>Status: {report.status}</Text>
            <Text style={styles.reportMeta}>Access: {report.isPaid ? "Paid" : "Preview"}</Text>
            <Text style={styles.reportMeta}>Created: {formatDate(report.createdAt)}</Text>
          </Pressable>
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
    backgroundColor: "#fffafc",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffafc",
  },
  container: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    color: "#6b7280",
    lineHeight: 21,
    marginBottom: 6,
  },
  errorCard: {
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 14,
    gap: 6,
  },
  errorTitle: {
    color: "#991b1b",
    fontWeight: "700",
  },
  errorBody: {
    color: "#b91c1c",
  },
  retryButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryButtonLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 4,
  },
  emptyTitle: {
    color: "#111827",
    fontWeight: "700",
  },
  emptyBody: {
    color: "#6b7280",
  },
  reportCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 3,
  },
  reportId: {
    color: "#111827",
    fontWeight: "700",
  },
  reportMeta: {
    color: "#6b7280",
    fontSize: 13,
  },
  quickOpenButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "#111827",
    paddingVertical: 12,
    alignItems: "center",
  },
  quickOpenLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
});