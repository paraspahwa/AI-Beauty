import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { mobileTheme as t } from "@/lib/theme";

export type ReportTab = "face" | "skin" | "glasses" | "hair" | "studio" | "shop";

export const REPORT_TABS: { key: ReportTab; label: string }[] = [
  { key: "face", label: "Face" },
  { key: "skin", label: "Skin" },
  { key: "hair", label: "Hair" },
  { key: "glasses", label: "Glasses" },
  { key: "studio", label: "Studio" },
  { key: "shop", label: "Shop" },
];

export function ReportTabs({
  activeTab,
  onChange,
}: {
  activeTab: ReportTab;
  onChange: (next: ReportTab) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
      {REPORT_TABS.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[styles.tabChip, activeTab === tab.key ? styles.tabChipActive : null]}
        >
          <Text style={[styles.tabChipLabel, activeTab === tab.key ? styles.tabChipLabelActive : null]}>{tab.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    gap: 8,
    paddingRight: 8,
  },
  tabChip: {
    borderRadius: 999,
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabChipActive: {
    backgroundColor: t.color.text,
    borderColor: t.color.text,
  },
  tabChipLabel: {
    color: t.color.textSoft,
    fontWeight: "700",
  },
  tabChipLabelActive: {
    color: t.color.surface,
  },
});
