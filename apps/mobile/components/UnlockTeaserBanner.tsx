import { StyleSheet, Text, View } from "react-native";
import { mobileTheme as t } from "@/lib/theme";

export function UnlockTeaserBanner({
  hints,
}: {
  hints?: { season?: string; faceShape?: string };
}) {
  const shape = hints?.faceShape;
  const season = hints?.season && hints.season !== "?" ? hints.season : null;
  const message = season
    ? `Your ${season} palette and full styling guide are ready — unlock to see every section.`
    : shape
      ? `We mapped your ${shape} face shape — unlock for skin, colour, hair, spectacles, and style guidance.`
      : "Unlock your complete beauty report — all seven sections in one purchase.";

  return (
    <View style={styles.card}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 16,
  },
  message: { color: t.color.text, fontSize: 14, lineHeight: 20 },
});
