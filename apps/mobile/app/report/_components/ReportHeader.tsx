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
  compareModeRequested,
  shareLoading,
  shareToken,
  onOpenChat,
  onShare,
}: {
  report: MobileReport;
  compareModeRequested: boolean;
  shareLoading: boolean;
  shareToken: string | null;
  onOpenChat: () => void;
  onShare: () => void;
}) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroHeaderRow}>
        <View style={styles.heroCopy}>
          <Text style={styles.heading}>Your report</Text>
          <Text style={styles.heroSubheading}>
            {report.isPaid ? "Full report unlocked" : "Preview unlocked. Premium sections are shown with contextual locks."}
          </Text>
        </View>
        <View style={styles.headerActionColumn}>
          <Pressable onPress={onOpenChat} style={styles.headerActionButton}>
            <Text style={styles.headerActionLabel}>Open chat</Text>
          </Pressable>
          <Pressable onPress={onShare} style={[styles.headerActionButton, styles.headerSecondaryAction]} disabled={shareLoading}>
            <Text style={styles.headerSecondaryActionLabel}>{shareLoading ? "Sharing..." : shareToken ? "Share link" : "Share"}</Text>
          </Pressable>
        </View>
      </View>

      {report.imageUrl ? <Image source={{ uri: report.imageUrl }} style={styles.heroImage} /> : null}

      <View style={styles.metricRow}>
        <MetricPill label="Status" value={report.status} />
        <MetricPill label="Access" value={report.isPaid ? "Premium" : "Preview"} />
        {formatCreatedAt(report.createdAt) ? <MetricPill label="Created" value={formatCreatedAt(report.createdAt) ?? ""} /> : null}
        {compareModeRequested ? <MetricPill label="Mode" value="Compare" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: 14,
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: t.color.text,
  },
  heroSubheading: {
    color: t.color.textMuted,
    lineHeight: 20,
  },
  headerActionColumn: {
    gap: 8,
  },
  headerActionButton: {
    borderRadius: 999,
    backgroundColor: t.color.text,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  headerActionLabel: {
    color: t.color.surface,
    fontWeight: "700",
  },
  headerSecondaryAction: {
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.border,
  },
  headerSecondaryActionLabel: {
    color: t.color.textSoft,
    fontWeight: "700",
  },
  heroImage: {
    width: "100%",
    height: 340,
    borderRadius: 24,
    backgroundColor: t.color.surfaceSubtle,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
