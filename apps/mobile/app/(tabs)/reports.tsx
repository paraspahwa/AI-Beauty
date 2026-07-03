import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { deleteReport, listReports, type MobileReportListItem } from "@/lib/api";
import { getDashboardReportHint } from "@web/lib/report/journey-hints";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { PageHeader } from "@/components/ui/PageHeader";
import { DossierCard } from "@/components/ui/DossierCard";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void (async () => {
        try {
          setError(null);
          setReports(await listReports());
        } catch (err) {
          setError(String(err));
        } finally {
          setLoading(false);
        }
      })();
    }, []),
  );

  async function handleDelete(reportId: string) {
    Alert.alert("Delete report?", "This removes the report and associated assets.", [
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

  const sorted = useMemo(
    () => [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reports],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={atelier.color.terracotta} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <PageHeader
          foil="Your dossiers"
          title="Reports"
          subtitle={`${reports.length} analyses in your archive.`}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!error && reports.length === 0 ? (
          <DossierCard>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyBody}>Run your first analysis from Home.</Text>
            <PrimaryButton label="Start analysis" onPress={() => router.push("/upload")} />
          </DossierCard>
        ) : null}

        {sorted.map((report) => {
          const hint = getDashboardReportHint({
            status: report.status,
            is_paid: report.isPaid,
            hasPremium: report.isPaid,
          });
          return (
            <DossierCard key={report.id} style={styles.reportCard}>
              <Pressable onPress={() => router.push({ pathname: "/report/[id]", params: { id: report.id } })}>
                <FoilLabel>{hint.label}</FoilLabel>
                <Text style={styles.reportId}>Report #{report.id.slice(0, 8)}</Text>
                {hint.detail ? <Text style={styles.hintDetail}>{hint.detail}</Text> : null}
                <Text style={styles.reportMeta}>{formatDate(report.createdAt)}</Text>
                <Text style={styles.reportMeta}>{report.isPaid ? "Unlocked" : "Preview"}</Text>
              </Pressable>
              <View style={styles.actions}>
                <PrimaryButton
                  label="Open"
                  onPress={() => router.push({ pathname: "/report/[id]", params: { id: report.id } })}
                  variant="outline"
                />
                <PrimaryButton
                  label={deletingReportId === report.id ? "Deleting…" : "Delete"}
                  onPress={() => void handleDelete(report.id)}
                  variant="outline"
                  disabled={deletingReportId === report.id}
                />
              </View>
            </DossierCard>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: atelier.color.parchment },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: atelier.color.parchment },
  container: { padding: atelier.space.md, paddingBottom: 32 },
  error: { ...bodyFont(), color: atelier.color.danger, marginBottom: 12 },
  emptyTitle: { ...displayFont(), fontSize: 18 },
  emptyBody: { ...bodyFont(), marginBottom: 12 },
  reportCard: { marginBottom: 12, gap: 10 },
  reportId: { ...displayFont(), fontSize: 17 },
  hintDetail: { ...bodyFont(), color: atelier.color.terracotta },
  reportMeta: { ...bodyFont(), fontSize: 12, color: atelier.color.inkMist },
  actions: { flexDirection: "row", gap: 8 },
});
