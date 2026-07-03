import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import type { ReportVisualAsset } from "@web/types/report";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type Props = {
  asset?: ReportVisualAsset;
  chapterLabel?: string;
  title?: string;
  onRetry?: () => void;
};

export function InfographicImage({ asset, chapterLabel, title, onRetry }: Props) {
  const status = asset?.status ?? "missing";

  if (status === "ready" && asset?.signedUrl) {
    return (
      <View style={styles.frame}>
        {chapterLabel ? <FoilLabel>{chapterLabel}</FoilLabel> : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Image source={{ uri: asset.signedUrl }} style={styles.image} resizeMode="cover" />
      </View>
    );
  }

  if (status === "pending") {
    return (
      <View style={[styles.frame, styles.center]}>
        <ActivityIndicator color={atelier.color.terracotta} size="large" />
        <Text style={styles.pendingText}>Creating your illustrated board…</Text>
      </View>
    );
  }

  if (status === "failed") {
    return (
      <View style={[styles.frame, styles.center]}>
        <Text style={styles.failedTitle}>Generation failed</Text>
        <Text style={styles.failedBody}>{asset?.error ?? "Please try again."}</Text>
        {onRetry ? <PrimaryButton label="Retry" onPress={onRetry} style={{ marginTop: 12 }} /> : null}
      </View>
    );
  }

  return (
    <View style={[styles.frame, styles.center]}>
      <Text style={styles.pendingText}>Board not generated yet</Text>
    </View>
  );
}

export async function openSignedUrl(url: string) {
  await Linking.openURL(url);
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: atelier.color.infographicFrame,
    borderRadius: atelier.radius.xl,
    borderWidth: 1,
    borderColor: `${atelier.color.terracotta}22`,
    padding: atelier.space.md,
    gap: atelier.space.sm,
    aspectRatio: 4 / 5,
    overflow: "hidden",
  },
  image: { flex: 1, width: "100%", borderRadius: atelier.radius.md },
  title: { ...displayFont(), ...atelier.type.h3 },
  center: { alignItems: "center", justifyContent: "center" },
  pendingText: { ...bodyFont(), textAlign: "center" },
  failedTitle: { ...displayFont(), fontSize: 16 },
  failedBody: { ...bodyFont(), textAlign: "center", marginTop: 4 },
});
