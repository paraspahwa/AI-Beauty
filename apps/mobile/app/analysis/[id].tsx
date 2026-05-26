import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { pollReportUntilReady } from "@/lib/analyze-polling";

const ANALYSIS_STEPS = [
  "Checking image quality",
  "Reading facial structure",
  "Mapping your color profile",
  "Preparing recommendations",
  "Compiling final report",
];

export default function AnalysisScreen() {
  const params = useLocalSearchParams<{ id: string; imageUri?: string; intent?: string }>();
  const [status, setStatus] = useState("Preparing analysis...");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const activeStep = useMemo(() => {
    const step = Math.min(Math.floor(elapsedSeconds / 12), ANALYSIS_STEPS.length - 1);
    return step;
  }, [elapsedSeconds]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!params.id) throw new Error("Missing report id");
        setStatus("AI analysis running. This can take around a minute.");
        const result = await pollReportUntilReady(params.id);
        if (cancelled) return;

        if (result.status === "failed") {
          setError(result.error ?? "Analysis failed");
          return;
        }

        router.replace({ pathname: "/report/[id]", params: { id: params.id, intent: params.intent } });
      } catch (err) {
        if (cancelled) return;
        setError(String(err));
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <SafeAreaView style={styles.container}>
      {params.imageUri ? <Image source={{ uri: params.imageUri }} style={styles.image} /> : null}
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.title}>Creating your Renovaara report</Text>
        <Text style={styles.body}>{error ?? status}</Text>
        {!error ? (
          <View style={styles.steps}>
            {ANALYSIS_STEPS.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={[styles.stepDot, index <= activeStep ? styles.stepDotActive : null]} />
                <Text style={[styles.stepText, index === activeStep ? styles.stepTextActive : null]}>{step}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={styles.footnote}>Elapsed: {elapsedSeconds}s</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff7fb",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  image: {
    width: 180,
    height: 220,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    textAlign: "center",
    color: "#6b7280",
    lineHeight: 22,
  },
  steps: {
    width: "100%",
    marginTop: 8,
    gap: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  stepDotActive: {
    backgroundColor: "#ec4899",
  },
  stepText: {
    color: "#9ca3af",
  },
  stepTextActive: {
    color: "#111827",
    fontWeight: "600",
  },
  footnote: {
    marginTop: 4,
    fontSize: 12,
    color: "#9ca3af",
  },
});
