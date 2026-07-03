import { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getHomeContent, getSampleImageUrl } from "@/lib/home-content";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const DECK = [
  { chapter: "I", label: "Face Features", file: "report/faceFeatures.jpg" },
  { chapter: "II", label: "Skin", file: "report/skin.jpg" },
  { chapter: "III", label: "Colour", file: "report/color.jpg" },
];

type Props = {
  onPrimary: () => void;
  onSecondary: () => void;
};

export function LandingHero({ onPrimary, onSecondary }: Props) {
  const hero = getHomeContent().hero;
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiBase = getValidatedMobileApiBaseUrl();

  useEffect(() => {
    timer.current = setInterval(() => setIndex((i) => (i + 1) % DECK.length), 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const card = DECK[index];

  return (
    <LinearGradient colors={[atelier.color.parchment, atelier.color.blush, atelier.color.parchment]} style={styles.wrap}>
      <FoilLabel>{hero.badge}</FoilLabel>
      <Text style={styles.title}>{hero.title}</Text>
      <Text style={styles.accent}>{hero.titleAccent}</Text>
      <Text style={styles.description}>{hero.description}</Text>

      <View style={styles.deckStage}>
        <View style={styles.deckCard}>
          <FoilLabel>Chapter {card.chapter}</FoilLabel>
          <Text style={styles.deckLabel}>{card.label}</Text>
          <Image source={{ uri: getSampleImageUrl(apiBase, card.file) }} style={styles.deckImage} resizeMode="cover" />
        </View>
      </View>

      <PrimaryButton label={hero.primaryCta.label} onPress={onPrimary} />
      <PrimaryButton label={hero.secondaryCta.label} onPress={onSecondary} variant="outline" style={{ marginTop: 8 }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: atelier.space.lg, borderRadius: atelier.radius.xl, gap: atelier.space.sm, marginBottom: atelier.space.lg },
  title: { ...displayFont(), fontSize: 30, lineHeight: 36 },
  accent: { ...displayFont(), fontSize: 30, lineHeight: 36, color: atelier.color.terracotta, fontStyle: "italic" },
  description: { ...bodyFont(), marginTop: 4, marginBottom: atelier.space.md },
  deckStage: { alignItems: "center", marginVertical: atelier.space.md },
  deckCard: {
    width: "100%",
    backgroundColor: atelier.color.surface,
    borderRadius: atelier.radius.lg,
    borderWidth: 1,
    borderColor: atelier.color.border,
    padding: atelier.space.md,
    gap: atelier.space.sm,
    ...atelier.shadow.card,
  },
  deckLabel: { ...displayFont(), fontSize: 18 },
  deckImage: { width: "100%", height: 220, borderRadius: atelier.radius.md },
});
