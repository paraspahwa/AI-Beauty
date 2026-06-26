import { StyleSheet, Text, View } from "react-native";
import type { MobileColorAnalysis } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

export function ColorSection({ data }: { data: MobileColorAnalysis }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Colour Guide</Text>
      <Text style={styles.meta}>
        {data.season} · {data.undertone} undertone
      </Text>
      <Text style={styles.body}>{data.description}</Text>
      {data.palette && data.palette.length > 0 ? (
        <View style={styles.swatchRow}>
          {data.palette.map((c) => (
            <View key={c.hex} style={styles.swatchItem}>
              <View style={[styles.swatch, { backgroundColor: c.hex }]} />
              <Text style={styles.swatchLabel}>{c.name}</Text>
            </View>
          ))}
        </View>
      ) : null}
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
    gap: 8,
  },
  title: { color: t.color.text, fontSize: 18, fontWeight: "700" },
  meta: { color: t.color.textSoft, fontSize: 13, fontWeight: "600" },
  body: { color: t.color.textSoft, fontSize: 14, lineHeight: 20 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  swatchItem: { alignItems: "center", width: 56 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.color.border },
  swatchLabel: { color: t.color.textFaint, fontSize: 9, marginTop: 4, textAlign: "center" },
});
