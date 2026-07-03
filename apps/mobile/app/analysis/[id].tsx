import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { pollReportUntilReady } from "@/lib/analyze-polling";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { useRequireMobileSession } from "@/lib/use-mobile-session";
import { DossierCard } from "@/components/ui/DossierCard";
import { FoilLabel } from "@/components/ui/FoilLabel";

const ANALYSIS_STEPS = [
  "Checking image quality",
  "Reading facial structure",
  "Mapping your colour profile",
  "Preparing recommendations",
  "Compiling your dossier",
];

export default function AnalysisScreen() {
  const params = useLocalSearchParams<{ id: string; imageUri?: string }>();
  const isAuthed = useRequireMobileSession();
  const [status, setStatus] = useState("Preparing analysis...");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeStep = useMemo(() => Math.min(Math.floor(elapsedSeconds / 12), ANALYSIS_STEPS.length - 1), [elapsedSeconds]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!isAuthed) return;
        if (!params.id) throw new Error("Missing report id");
        setStatus("AI analysis running — usually under a minute.");
        const result = await pollReportUntilReady(params.id);
        if (cancelled) return;

        if (result.status === "failed") {
          setError(result.error ?? "Analysis failed");
          return;
        }

        router.replace({ pathname: "/report/[id]", params: { id: params.id } });
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, params.id]);

  if (!isAuthed) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={atelier.color.terracotta} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {params.imageUri ? <Image source={{ uri: params.imageUri }} style={styles.image} /> : null}
      <DossierCard style={styles.card}>
        <FoilLabel>Analyzing</FoilLabel>
        <Text style={styles.title}>Creating your Renovaara report</Text>
        <ActivityIndicator size="large" color={atelier.color.terracotta} />
        <Text style={styles.body}>{error ?? status}</Text>
        {!error ? (
          <View style={styles.steps}>
            {ANALYSIS_STEPS.map((step, index) => (
              <Text key={step} style={[styles.stepText, index === activeStep && styles.stepTextActive]}>
                {index <= activeStep ? "✓" : "○"} {step}
              </Text>
            ))}
          </View>
        ) : null}
        <Text style={styles.footnote}>Elapsed: {elapsedSeconds}s</Text>
      </DossierCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.color.parchment,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  image: { width: 180, height: 220, borderRadius: 20, backgroundColor: atelier.color.infographicFrame },
  card: { width: "100%", alignItems: "center", gap: 12 },
  title: { ...displayFont(), textAlign: "center" },
  body: { ...bodyFont(), textAlign: "center" },
  steps: { width: "100%", gap: 8 },
  stepText: { ...bodyFont(), fontSize: 13, color: atelier.color.inkMist },
  stepTextActive: { color: atelier.color.espresso, fontFamily: atelier.font.bodySemibold },
  footnote: { fontSize: 12, color: atelier.color.inkMist },
});
