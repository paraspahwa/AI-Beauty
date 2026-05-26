import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchReportOutfitHistory, generateReportOutfits, toggleReportOutfitFeedback, type MobileOutfitFeedback, type MobileOutfitOccasion, type MobileOutfitSession, type MobileOutfitVibe } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

const OCCASIONS: MobileOutfitOccasion[] = ["casual", "work", "date", "wedding", "travel"];
const VIBES: MobileOutfitVibe[] = ["minimal", "classic", "bold", "romantic", "street"];
const FEEDBACK_FIELDS: (keyof MobileOutfitFeedback)[] = ["liked", "saved", "worn"];

export default function MobileOutfitStudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<MobileOutfitOccasion>("casual");
  const [vibe, setVibe] = useState<MobileOutfitVibe>("minimal");
  const [history, setHistory] = useState<MobileOutfitSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const activeSession = history.find((item) => item.id === activeSessionId) ?? history[0] ?? null;

  async function loadHistory() {
    try {
      setError(null);
      const next = await fetchReportOutfitHistory(params.id);
      setHistory(next);
      setActiveSessionId((current) => current ?? next[0]?.id ?? null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!params.id) return;
    void loadHistory();
  }, [params.id]);

  async function handleGenerate() {
    if (!params.id) return;
    try {
      setGenerating(true);
      setError(null);
      const response = await generateReportOutfits(params.id, { occasion, vibe });
      const nextHistory = response.history ?? (response.session ? [response.session, ...history] : history);
      setHistory(nextHistory);
      setActiveSessionId(response.session?.id ?? nextHistory[0]?.id ?? null);
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleFeedback(field: keyof MobileOutfitFeedback) {
    if (!params.id || !activeSession) return;
    try {
      const response = await toggleReportOutfitFeedback(params.id, activeSession.id, field);
      setHistory(response.history);
      setActiveSessionId(response.session.id);
    } catch (err) {
      setError(String(err));
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={t.color.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Outfit Studio</Text>
        <Text style={styles.subtitle}>Generate outfit ideas from your report palette, then keep the combinations you want to revisit.</Text>

        <Card title="Occasion">
          <View style={styles.chipRow}>
            {OCCASIONS.map((item) => (
              <ChoiceChip key={item} label={item} active={occasion === item} onPress={() => setOccasion(item)} />
            ))}
          </View>
        </Card>

        <Card title="Vibe">
          <View style={styles.chipRow}>
            {VIBES.map((item) => (
              <ChoiceChip key={item} label={item} active={vibe === item} onPress={() => setVibe(item)} />
            ))}
          </View>
        </Card>

        <Pressable onPress={() => void handleGenerate()} disabled={generating} style={[styles.primaryButton, generating ? styles.buttonDisabled : null]}>
          <Text style={styles.primaryButtonLabel}>{generating ? "Generating..." : "Generate outfit ideas"}</Text>
        </Pressable>

        {error ? (
          <Card title="Unable to load outfits">
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        <Card title="History">
          {!history.length ? (
            <Text style={styles.helperText}>Generate your first set of outfit ideas to build history.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionRow}>
              {history.map((session) => (
                <Pressable key={session.id} onPress={() => setActiveSessionId(session.id)} style={[styles.sessionCard, activeSessionId === session.id ? styles.sessionCardActive : null]}>
                  <Text style={styles.sessionCardTitle}>{session.occasion}</Text>
                  <Text style={styles.sessionCardMeta}>{session.vibe}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Card>

        {activeSession ? (
          <>
            <Card title="Session feedback">
              <View style={styles.feedbackRow}>
                {FEEDBACK_FIELDS.map((field) => {
                  const active = Boolean(activeSession.feedback?.[field]);
                  return (
                    <ChoiceChip
                      key={field}
                      label={field}
                      active={active}
                      onPress={() => void handleToggleFeedback(field)}
                    />
                  );
                })}
              </View>
            </Card>

            {activeSession.looks.map((look) => (
              <Card key={`${activeSession.id}-${look.title}`} title={look.title}>
                <Text style={styles.helperText}>Pieces: {look.pieces.join(" • ")}</Text>
                <Text style={styles.helperText}>Metal: {look.metal}</Text>
                <View style={styles.swatchRow}>
                  {look.accentColors.map((color) => (
                    <View key={`${look.title}-${color.hex}`} style={styles.swatchCard}>
                      <View style={[styles.swatchCircle, { backgroundColor: color.hex }]} />
                      <Text style={styles.swatchLabel}>{color.name}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.bodyText}>{look.whyItWorks}</Text>
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceChip, active ? styles.choiceChipActive : null]}>
      <Text style={[styles.choiceChipLabel, active ? styles.choiceChipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: t.color.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.color.bg },
  container: { padding: 20, gap: 14 },
  backButton: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: t.color.surfaceSubtle, paddingHorizontal: 12, paddingVertical: 8 },
  backButtonLabel: { color: t.color.text, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "700", color: t.color.text },
  subtitle: { color: t.color.textMuted, lineHeight: 21 },
  card: { borderRadius: 18, backgroundColor: t.color.surface, padding: 14, gap: 10 },
  cardTitle: { color: t.color.text, fontWeight: "700", fontSize: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  choiceChip: { borderRadius: 999, borderWidth: 1, borderColor: t.color.borderStrong, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: t.color.surfaceMuted },
  choiceChipActive: { backgroundColor: t.color.text, borderColor: t.color.text },
  choiceChipLabel: { color: t.color.textSoft, fontWeight: "600", textTransform: "capitalize" },
  choiceChipLabelActive: { color: t.color.textOnDark },
  primaryButton: { borderRadius: 16, backgroundColor: t.color.text, paddingHorizontal: 16, paddingVertical: 14, alignItems: "center" },
  primaryButtonLabel: { color: t.color.textOnDark, fontWeight: "700" },
  buttonDisabled: { opacity: 0.5 },
  helperText: { color: t.color.textMuted, lineHeight: 20 },
  errorText: { color: t.color.danger },
  sessionRow: { gap: 10 },
  sessionCard: { width: 120, borderRadius: 16, borderWidth: 1, borderColor: t.color.borderStrong, backgroundColor: t.color.surfaceMuted, padding: 12, gap: 4 },
  sessionCardActive: { backgroundColor: t.color.text, borderColor: t.color.text },
  sessionCardTitle: { color: t.color.text, fontWeight: "700", textTransform: "capitalize" },
  sessionCardMeta: { color: t.color.textMuted, textTransform: "capitalize" },
  feedbackRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatchCard: { width: 72, alignItems: "center", gap: 6 },
  swatchCircle: { width: 34, height: 34, borderRadius: 999, borderWidth: 1, borderColor: t.color.border },
  swatchLabel: { color: t.color.textMuted, fontSize: 11, textAlign: "center" },
  bodyText: { color: t.color.textSoft, lineHeight: 21 },
});
