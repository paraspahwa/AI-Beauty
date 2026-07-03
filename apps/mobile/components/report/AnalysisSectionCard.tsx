import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { generateInfographic, retryInfographic } from "@/lib/api";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import type { ReportVisualAsset } from "@web/types/report";
import type { ManualPaidInfographicSection } from "@web/lib/ai/infographic-sections";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ReportSurfacePanel } from "@/components/ui/ReportSurfacePanel";
import { InfographicImage } from "./InfographicImage";

type Props = {
  reportId: string;
  section: ManualPaidInfographicSection;
  chapterLabel: string;
  title: string;
  description: string;
  asset?: ReportVisualAsset;
  highlighted?: boolean;
  onRefresh: () => void;
};

export function AnalysisSectionCard({
  reportId,
  section,
  chapterLabel,
  title,
  description,
  asset,
  highlighted,
  onRefresh,
}: Props) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = asset?.status ?? "missing";
  const isGenerating = starting || status === "pending";
  const isReady = status === "ready";

  async function startGeneration() {
    setStarting(true);
    setError(null);
    try {
      await generateInfographic(reportId, section);
      onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function handleRetry() {
    await retryInfographic(reportId, section);
    onRefresh();
  }

  return (
    <ReportSurfacePanel
      style={[
        styles.panel,
        highlighted && { borderColor: `${atelier.color.terracotta}88`, borderWidth: 2 },
      ]}
    >
      <FoilLabel>{chapterLabel}</FoilLabel>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {isReady || isGenerating || status === "failed" ? (
        <InfographicImage
          asset={asset}
          onRetry={status === "failed" ? handleRetry : undefined}
        />
      ) : (
        <View style={styles.generateBox}>
          <Text style={styles.generateCopy}>Tap Generate to craft this illustrated chapter.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label={isGenerating ? "Generating…" : "Generate chapter"}
            onPress={startGeneration}
            loading={isGenerating}
          />
        </View>
      )}
    </ReportSurfacePanel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: atelier.space.sm, marginBottom: atelier.space.md },
  title: { ...displayFont(), ...atelier.type.h2 },
  description: { ...bodyFont(), ...atelier.type.body },
  generateBox: { gap: atelier.space.md, paddingVertical: atelier.space.lg, alignItems: "center" },
  generateCopy: { ...bodyFont(), textAlign: "center" },
  error: { ...bodyFont(), color: atelier.color.danger, textAlign: "center" },
});
