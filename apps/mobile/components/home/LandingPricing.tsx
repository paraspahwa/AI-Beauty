import { StyleSheet, Text, View } from "react-native";
import { PRODUCT_COPY } from "@web/lib/product-copy";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { DossierCard } from "@/components/ui/DossierCard";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type Props = { onUpload: () => void };

export function LandingPricing({ onUpload }: Props) {
  const tiers = [PRODUCT_COPY.free, PRODUCT_COPY.report, PRODUCT_COPY.styleGuide];

  return (
    <View style={styles.wrap}>
      <FoilLabel>Pricing</FoilLabel>
      <Text style={styles.title}>One selfie. One unlock.</Text>
      {tiers.map((tier) => (
        <DossierCard key={tier.name} style={styles.tier}>
          <Text style={styles.tierName}>{tier.name}</Text>
          <Text style={styles.tierTag}>{tier.tagline}</Text>
          {"priceInr" in tier ? <Text style={styles.price}>₹{tier.priceInr}</Text> : null}
          {tier.items.map((item) => (
            <Text key={item} style={styles.item}>✓ {item}</Text>
          ))}
        </DossierCard>
      ))}
      <PrimaryButton label={PRODUCT_COPY.primaryCta} onPress={onUpload} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: atelier.space.sm, marginBottom: atelier.space.lg },
  title: { ...displayFont(), ...atelier.type.h2 },
  tier: { gap: 6 },
  tierName: { ...displayFont(), fontSize: 18 },
  tierTag: { ...bodyFont(), fontSize: 13 },
  price: { ...displayFont(), color: atelier.color.terracotta, fontSize: 24 },
  item: { ...bodyFont(), fontSize: 13 },
});
