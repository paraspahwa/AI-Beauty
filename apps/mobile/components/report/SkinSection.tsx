import { StyleSheet, Text, View } from "react-native";
import type { MobileSkinAnalysis } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

export function SkinSection({ data }: { data: MobileSkinAnalysis; imageUrl?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Skin Analysis</Text>
      <Text style={styles.primary}>{data.type}</Text>
      {data.concerns?.map((c) => (
        <Text key={c.label} style={styles.bullet}>• {c.label}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: t.color.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    padding: 16,
    gap: 6,
  },
  title: { color: t.color.text, fontSize: 18, fontWeight: "700" },
  primary: { color: t.color.text, fontSize: 16, fontWeight: "600" },
  bullet: { color: t.color.textSoft, fontSize: 14, lineHeight: 20 },
});
