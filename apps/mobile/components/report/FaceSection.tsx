import { StyleSheet, Text, View } from "react-native";
import type { MobileFaceShape, MobileFeatures } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

export function FaceSection({
  faceShape,
  features,
  previewOnly = false,
}: {
  faceShape?: MobileFaceShape;
  features?: MobileFeatures;
  previewOnly?: boolean;
}) {
  if (!faceShape) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Face Analysis</Text>
      <Text style={styles.primary}>{faceShape.shape}</Text>
      <Text style={styles.body}>{faceShape.traits.join(" · ")}</Text>
      {!previewOnly && features ? (
        <View style={styles.block}>
          {(["eyes", "lips", "nose"] as const).map((key) =>
            features[key] ? (
              <Text key={key} style={styles.bullet}>
                {key}: {features[key]!.shape}
              </Text>
            ) : null,
          )}
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
    gap: 6,
  },
  title: { color: t.color.text, fontSize: 18, fontWeight: "700" },
  primary: { color: t.color.text, fontSize: 16, fontWeight: "600" },
  body: { color: t.color.textSoft, fontSize: 14, lineHeight: 20 },
  block: { marginTop: 8, gap: 4 },
  bullet: { color: t.color.textSoft, fontSize: 14, lineHeight: 20 },
});
