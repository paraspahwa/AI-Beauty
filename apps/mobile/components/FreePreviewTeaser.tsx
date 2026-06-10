import { StyleSheet, Text, View } from "react-native";
import type { MobileColorAnalysis } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

export function FreePreviewTeaser({
  colorAnalysis,
  summary,
}: {
  colorAnalysis?: MobileColorAnalysis | null;
  summary?: string | null;
}) {
  if (!colorAnalysis && !summary) return null;

  return (
    <View style={styles.card}>
      {colorAnalysis ? (
        <>
          <Text style={styles.eyebrow}>Your color season preview</Text>
          <Text style={styles.title}>? season — try a look to reveal</Text>
          <Text style={styles.body}>Your undertone and palette unlock as you explore looks in Try & Shop.</Text>
        </>
      ) : null}
      {summary ? <Text style={styles.body} numberOfLines={3}>{summary}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surfaceSubtle,
    padding: 16,
    gap: 6,
  },
  eyebrow: { fontSize: 11, fontWeight: "700", color: t.color.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: "700", color: t.color.text },
  body: { fontSize: 14, color: t.color.textSoft, lineHeight: 20 },
});
