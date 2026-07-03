import { SafeAreaView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { fetchReport } from "@/lib/api";
import { atelier } from "@/lib/theme";
import { bodyFont } from "@/lib/theme-provider";
import { useRequireMobileSession } from "@/lib/use-mobile-session";
import type { CompiledReport } from "@web/types/report";
import { ReportLayout } from "@/components/report/ReportLayout";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useRouter } from "expo-router";

export default function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; checkout?: string; paywall?: string }>();
  const isAuthed = useRequireMobileSession();
  const [report, setReport] = useState<CompiledReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      setError(null);
      setReport(await fetchReport(params.id));
    } catch (err) {
      setError(String(err));
    }
  }, [params.id]);

  useEffect(() => {
    if (!isAuthed) return;
    void load();
  }, [isAuthed, load]);

  useEffect(() => {
    if (params.checkout !== "report_return" || !report) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [params.checkout, report, load]);

  if (!isAuthed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={atelier.color.terracotta} />
        </View>
      </SafeAreaView>
    );
  }

  if (!report && !error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={atelier.color.terracotta} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.error}>{error ?? "Report not found"}</Text>
          <PrimaryButton label="Go back" onPress={() => router.back()} variant="outline" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ReportLayout
        initialReport={report}
        initialPaywallOpen={params.paywall === "open"}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.color.parchment },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  error: { ...bodyFont(), color: atelier.color.danger, textAlign: "center" },
});
