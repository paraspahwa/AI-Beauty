import { StyleSheet, Text } from "react-native";
import { atelier } from "@/lib/theme";
import { bodyFont } from "@/lib/theme-provider";
import { DossierCard } from "@/components/ui/DossierCard";

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
      : "Unlock your complete beauty report — six illustrated chapters in one purchase.";

  return (
    <DossierCard style={styles.card}>
      <Text style={styles.message}>{message}</Text>
    </DossierCard>
  );
}

const styles = StyleSheet.create({
  card: { marginVertical: 8 },
  message: { ...bodyFont(), ...atelier.type.body, color: atelier.color.espresso },
});
