import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { type MobileReport } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";
import { MetricPill } from "./ReportPrimitives";

export function formatCreatedAt(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ReportHeader({
  report,
  onBack,
}: {
  report: MobileReport;
  onBack?: () => void;
}) {
  return (
    <View style={styles.heroCard}>
      {onBack ? (
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
      ) : null}
      <Text style={styles.heading}>Your report</Text>
      <Text style={styles.heroSubheading}>
        {report.isPaid ? "Full report unlocked" : "Face preview — unlock for all seven sections"}
      </Text>
      {report.imageUrl ? <Image source={{ uri: report.imageUrl }} style={styles.heroImage} /> : null}
      <View style={styles.metricRow}>
        <MetricPill label="Status" value={report.status} />
        <MetricPill label="Access" value={report.isPaid ? "Premium" : "Preview"} />
        {formatCreatedAt(report.createdAt) ? <MetricPill label="Created" value={formatCreatedAt(report.createdAt) ?? ""} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { gap: 14 },
  back: { color: t.color.textSoft, fontWeight: "600", marginBottom: 4 },
  heading: { fontSize: 28, fontWeight: "700", color: t.color.text },
  heroSubheading: { color: t.color.textMuted, lineHeight: 20 },
  heroImage: {
    width: "100%",
    height: 280,
    borderRadius: 24,
    backgroundColor: t.color.surfaceSubtle,
  },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
