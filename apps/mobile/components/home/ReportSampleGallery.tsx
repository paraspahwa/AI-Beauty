import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getHomeContent, getSampleImageUrl } from "@/lib/home-content";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { DossierCard } from "@/components/ui/DossierCard";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { Image } from "react-native";

export function ReportSampleGallery() {
  const samples = getHomeContent().reportSamples;
  const apiBase = getValidatedMobileApiBaseUrl();

  return (
    <View style={styles.wrap}>
      <FoilLabel>Sample boards</FoilLabel>
      <Text style={styles.title}>Inside your dossier</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {samples.map((sample) => (
          <DossierCard key={sample.id} style={styles.card}>
            <Image
              source={{ uri: getSampleImageUrl(apiBase, sample.imageFile) }}
              style={styles.image}
              resizeMode="cover"
            />
            <Text style={styles.cardTitle}>{sample.label}</Text>
            <Text style={styles.cardBody} numberOfLines={2}>{sample.description}</Text>
          </DossierCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: atelier.space.sm, marginBottom: atelier.space.lg },
  title: { ...displayFont(), ...atelier.type.h2 },
  row: { gap: atelier.space.md, paddingVertical: atelier.space.sm },
  card: { width: 220, gap: 8 },
  image: { width: "100%", height: 160, borderRadius: atelier.radius.md },
  cardTitle: { ...displayFont(), fontSize: 16 },
  cardBody: { ...bodyFont(), fontSize: 12 },
});
