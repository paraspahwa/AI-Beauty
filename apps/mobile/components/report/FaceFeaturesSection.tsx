import { StyleSheet, Text } from "react-native";
import { atelier } from "@/lib/theme";
import { displayFont } from "@/lib/theme-provider";
import type { ReportVisualAsset } from "@web/types/report";
import { ReportSurfacePanel } from "@/components/ui/ReportSurfacePanel";
import { InfographicImage } from "./InfographicImage";

type Props = {
  asset?: ReportVisualAsset;
  isPaid: boolean;
  highlighted?: boolean;
};

export function FaceFeaturesSection({ asset, isPaid, highlighted }: Props) {
  return (
    <ReportSurfacePanel
      style={[
        styles.panel,
        highlighted && { borderColor: `${atelier.color.terracotta}88`, borderWidth: 2 },
      ]}
    >
      <Text style={styles.chapter}>{isPaid ? "Chapter I" : "Free preview"}</Text>
      <Text style={styles.title}>{isPaid ? "Face Features Analysis" : "Face Shape Preview"}</Text>
      <InfographicImage asset={asset} />
    </ReportSurfacePanel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: atelier.space.sm, marginBottom: atelier.space.md },
  chapter: {
    fontFamily: atelier.font.bodySemibold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: atelier.color.terracotta,
  },
  title: { ...displayFont(), ...atelier.type.h2 },
});
