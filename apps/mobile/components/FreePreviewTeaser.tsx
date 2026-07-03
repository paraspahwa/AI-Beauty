import { StyleSheet, Text, View } from "react-native";
import type { ColorAnalysisResult } from "@web/types/report";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { DossierCard } from "@/components/ui/DossierCard";
import { FoilLabel } from "@/components/ui/FoilLabel";

export function FreePreviewTeaser({
  colorAnalysis,
  summary,
  teaserOnly,
}: {
  colorAnalysis?: ColorAnalysisResult | null;
  summary?: string | null;
  teaserOnly?: boolean;
}) {
  if (!colorAnalysis && !summary) return null;

  return (
    <DossierCard style={styles.card}>
      {colorAnalysis ? (
        <>
          <FoilLabel>Colour preview locked</FoilLabel>
          <Text style={styles.title}>
            {teaserOnly ? "Your season unlocks with the full report" : colorAnalysis.season}
          </Text>
          <Text style={styles.body}>
            Unlock to reveal your full seasonal palette, undertone analysis, and illustrated colour board.
          </Text>
        </>
      ) : null}
      {summary ? <Text style={styles.body} numberOfLines={3}>{summary}</Text> : null}
    </DossierCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, marginTop: 12 },
  title: { ...displayFont(), fontSize: 20 },
  body: { ...bodyFont(), ...atelier.type.body },
});
