import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { listReports } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

export default function HomeTabScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [latestReportId, setLatestReportId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const reports = await listReports(5);
        const ready = reports.find((r) => r.status === "ready");
        setLatestReportId(ready?.id ?? null);
      } catch {
        setLatestReportId(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Renovaara</Text>
        <Text style={styles.title}>Your AI beauty report</Text>
        <Text style={styles.subtitle}>
          Upload a selfie for face-shape preview, then unlock skin, colour, hairstyle, spectacles, and style guidance.
        </Text>

        <Pressable style={styles.primaryButton} onPress={() => router.push("/upload")}>
          <Text style={styles.primaryButtonLabel}>New analysis</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push("/reports")}>
          <Text style={styles.secondaryButtonLabel}>View all reports</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={t.color.text} style={{ marginTop: 24 }} />
        ) : latestReportId ? (
          <Pressable style={styles.latestCard} onPress={() => router.push(`/report/${latestReportId}`)}>
            <Text style={styles.latestLabel}>Latest report ready</Text>
            <Text style={styles.latestCta}>Open report →</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.color.bg },
  container: { padding: 24, gap: 12 },
  eyebrow: { color: t.color.textFaint, fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { color: t.color.text, fontSize: 28, fontWeight: "700" },
  subtitle: { color: t.color.textSoft, fontSize: 15, lineHeight: 22, marginBottom: 8 },
  primaryButton: {
    backgroundColor: t.color.text,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonLabel: { color: t.color.surface, fontWeight: "700", fontSize: 16 },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
  },
  secondaryButtonLabel: { color: t.color.text, fontWeight: "600", fontSize: 16 },
  latestCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.border,
  },
  latestLabel: { color: t.color.textSoft, fontSize: 12, fontWeight: "600" },
  latestCta: { color: t.color.text, fontSize: 16, fontWeight: "700", marginTop: 4 },
});
