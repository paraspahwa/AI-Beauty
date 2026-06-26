import { StyleSheet, Text, View } from "react-native";
import type { MobileStyleGuide } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

export function StyleGuideSection({ data }: { data: MobileStyleGuide }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Style Guide</Text>
      <Text style={styles.primary}>{data.primaryStyle}</Text>
      {data.identitySummary ? <Text style={styles.body}>{data.identitySummary}</Text> : null}
      {data.secondaryStyles.length > 0 ? (
        <Text style={styles.body}>Also explore: {data.secondaryStyles.join(", ")}</Text>
      ) : null}
      {data.wardrobeEssentials.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label}>Wardrobe essentials</Text>
          {data.wardrobeEssentials.map((item) => (
            <Text key={item} style={styles.bullet}>• {item}</Text>
          ))}
        </View>
      ) : null}
      {data.styleNotes.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label}>Style notes</Text>
          {data.styleNotes.map((note) => (
            <Text key={note} style={styles.bullet}>• {note}</Text>
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
  primary: { color: t.color.text, fontSize: 16, fontWeight: "600" },
  body: { color: t.color.textSoft, fontSize: 14, lineHeight: 20 },
  block: { marginTop: 8, gap: 4 },
  label: { color: t.color.textFaint, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  bullet: { color: t.color.textSoft, fontSize: 14, lineHeight: 20 },
});
