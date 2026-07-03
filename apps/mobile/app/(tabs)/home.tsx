import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { atelier } from "@/lib/theme";
import { getHomeContent } from "@/lib/home-content";
import { LandingHero } from "@/components/home/LandingHero";
import { LandingJourneyBanner } from "@/components/home/LandingJourneyBanner";
import { ReportSampleGallery } from "@/components/home/ReportSampleGallery";
import { JourneyTimeline } from "@/components/home/JourneyTimeline";
import { LandingPricing } from "@/components/home/LandingPricing";
import { FAQAccordion } from "@/components/home/FAQAccordion";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { Text } from "react-native";
import { displayFont, bodyFont } from "@/lib/theme-provider";

export default function HomeTabScreen() {
  const router = useRouter();
  const banner = getHomeContent().ctaBanner;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <LandingJourneyBanner />
        <LandingHero
          onPrimary={() => router.push("/upload")}
          onSecondary={() => router.push("/upload")}
        />

        <View style={styles.statsRow}>
          {getHomeContent().stats.map((stat) => (
            <View key={stat.id} style={styles.stat}>
              <Text style={styles.statValue}>
                {stat.value.toLocaleString()}
                {stat.suffix}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <ReportSampleGallery />
        <JourneyTimeline />
        <LandingPricing onUpload={() => router.push("/upload")} />
        <FAQAccordion />

        <View style={styles.finalCta}>
          <FoilLabel>Ready</FoilLabel>
          <Text style={styles.finalTitle}>{banner.title}</Text>
          <Text style={styles.finalBody}>{banner.description}</Text>
          <PrimaryButton label={banner.buttonLabel} onPress={() => router.push("/upload")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.color.parchment },
  container: { padding: atelier.space.md, paddingBottom: 48 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: atelier.space.lg },
  stat: {
    flex: 1,
    minWidth: 100,
    backgroundColor: atelier.color.surface,
    borderRadius: atelier.radius.md,
    borderWidth: 1,
    borderColor: atelier.color.border,
    padding: 12,
  },
  statValue: { ...displayFont(), fontSize: 20, color: atelier.color.terracotta },
  statLabel: { ...bodyFont(), fontSize: 11, marginTop: 4 },
  finalCta: { gap: atelier.space.sm, paddingTop: atelier.space.md },
  finalTitle: { ...displayFont(), ...atelier.type.h2 },
  finalBody: { ...bodyFont() },
});
