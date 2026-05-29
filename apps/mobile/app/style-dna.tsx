import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchStyleDnaSummary, type MobileStyleDnaSummary } from "@/lib/api";
import { PillButton } from "@/lib/ui/PillButton";
import { mobileTheme as t } from "@/lib/theme";
import { useRequireMobileSession } from "@/lib/use-mobile-session";

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function StyleDnaScreen() {
  const router = useRouter();
  const isAuthed = useRequireMobileSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MobileStyleDnaSummary | null>(null);

  const topPalette = useMemo(() => summary?.latest?.colorAnalysis?.palette?.slice(0, 6) ?? [], [summary]);

  async function load() {
    try {
      setError(null);
      const next = await fetchStyleDnaSummary();
      setSummary(next);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    await load();
  }

  useFocusEffect(
    useCallback(() => {
      if (!isAuthed) return;
      setLoading(true);
      void load();
    }, [isAuthed]),
  );

  if (!isAuthed || loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={t.color.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topActions}>
          <PillButton label="My reports" variant="subtle" onPress={() => router.back()} />
          <PillButton label="Refresh" variant="subtle" onPress={() => void refresh()} />
        </View>

        <Text style={styles.eyebrow}>✦ Style Profile</Text>
        <Text style={styles.title}>Your Style DNA</Text>
        <Text style={styles.subtitle}>
          {summary?.totalReports
            ? `Derived from ${summary.totalReports} analysis${summary.totalReports === 1 ? "" : "es"}${formatDate(summary?.prefs?.updatedAt) ? ` · Last updated ${formatDate(summary?.prefs?.updatedAt)}` : ""}.`
            : "Complete your first report to unlock your Style DNA profile."}
        </Text>

        <PillButton label="New analysis" variant="outline" onPress={() => router.push("/home")} />

        {error ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
            <PillButton label="Try again" onPress={() => void refresh()} />
          </View>
        ) : null}

        {summary?.prefs ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Identity snapshot</Text>
            <Text style={styles.bodyText}>Season: {summary.prefs.colorSeason ?? "Unknown"}</Text>
            <Text style={styles.bodyText}>Undertone: {summary.prefs.undertone ?? "Unknown"}</Text>
            <Text style={styles.bodyText}>Face shape: {summary.prefs.faceShape ?? "Unknown"}</Text>
            <Text style={styles.bodyText}>Skin type: {summary.prefs.skinType ?? "Unknown"}</Text>
            {summary.prefs.metals.length ? <Text style={styles.bodyText}>Best metals: {summary.prefs.metals.join(", ")}</Text> : null}
            {formatDate(summary.prefs.updatedAt) ? <Text style={styles.noteText}>Updated: {formatDate(summary.prefs.updatedAt)}</Text> : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No style data yet</Text>
            <Text style={styles.noteText}>Complete your first beauty analysis to unlock your Style DNA profile.</Text>
            <PillButton label="Get my report" onPress={() => router.push("/home")} />
          </View>
        )}

        {summary?.latest ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Latest report details</Text>
            <Text style={styles.bodyText}>Report: #{summary.latest.id.slice(0, 8)}</Text>
            {formatDate(summary.latest.createdAt) ? <Text style={styles.noteText}>Created: {formatDate(summary.latest.createdAt)}</Text> : null}
            {summary.latest.colorAnalysis?.season ? <Text style={styles.bodyText}>Season: {summary.latest.colorAnalysis.season}</Text> : null}
            {summary.latest.faceShape?.shape ? <Text style={styles.bodyText}>Face shape: {summary.latest.faceShape.shape}</Text> : null}
            {summary.latest.skinAnalysis?.type ? <Text style={styles.bodyText}>Skin type: {summary.latest.skinAnalysis.type}</Text> : null}
            {summary.latest.hairstyle?.styles?.length ? (
              <Text style={styles.bodyText}>Top hairstyle picks: {summary.latest.hairstyle.styles.slice(0, 3).map((item) => item.name).join(", ")}</Text>
            ) : null}
          </View>
        ) : null}

        {topPalette.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Palette highlights</Text>
            <View style={styles.swatchRow}>
              {topPalette.map((item) => (
                <View key={`${item.name}-${item.hex}`} style={styles.swatchCard}>
                  <View style={[styles.swatch, { backgroundColor: item.hex }]} />
                  <Text style={styles.swatchLabel}>{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: t.color.bg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.color.bg,
  },
  container: {
    padding: 20,
    gap: 12,
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: t.color.text,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "700",
    color: t.color.brandWarm,
  },
  subtitle: {
    color: t.color.textMuted,
    lineHeight: 21,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    color: t.color.text,
    fontWeight: "700",
    fontSize: 16,
  },
  bodyText: {
    color: t.color.textSoft,
    lineHeight: 20,
  },
  noteText: {
    color: t.color.textMuted,
    fontSize: 12,
  },
  errorText: {
    color: t.color.danger,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  swatchCard: {
    width: 72,
    alignItems: "center",
    gap: 6,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.overlayDark08,
  },
  swatchLabel: {
    fontSize: 11,
    color: t.color.textMuted,
    textAlign: "center",
  },
});
