import { Image, StyleSheet, Text, View } from "react-native";
import type { MobileHairstyle, MobileVisualAsset } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

function getPreviewUrl(asset?: MobileVisualAsset | null): string | null {
  return asset?.signedUrl && asset.signedUrl.length > 0 ? asset.signedUrl : null;
}

export function HairSection({
  data,
  previews,
}: {
  data: MobileHairstyle;
  previews?: MobileVisualAsset[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Hairstyle Guide</Text>
      {data.styles?.map((s) => (
        <Text key={s.name} style={styles.bullet}>• {s.name}: {s.description}</Text>
      ))}
      {previews && previews.length > 0 ? (
        <View style={styles.previewRow}>
          {previews.filter((p) => getPreviewUrl(p)).map((p, i) => (
            <Image key={i} source={{ uri: getPreviewUrl(p)! }} style={styles.preview} />
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
    gap: 6,
  },
  title: { color: t.color.text, fontSize: 18, fontWeight: "700" },
  bullet: { color: t.color.textSoft, fontSize: 14, lineHeight: 20 },
  previewRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  preview: { width: 96, height: 128, borderRadius: 12, backgroundColor: t.color.surfaceSubtle },
});
