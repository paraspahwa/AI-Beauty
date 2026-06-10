import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BeforeAfterCompare } from "@/components/BeforeAfterCompare";
import { TryTheseNext, type TryNextPreset } from "@/components/TryTheseNext";
import { UnlockTeaserBanner } from "@/components/UnlockTeaserBanner";
import { guestGenerate, guestUpload, createGuestMomentShare } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { PRODUCT_COPY } from "@/lib/product-copy";
import { guestShare } from "@/lib/progressive-unlock";
import type { UnlockTeaser } from "@/lib/progressive-unlock";
import { mobileTheme as t } from "@/lib/theme";

const PRESETS: TryNextPreset[] = [
  { id: "natural", label: "Natural glow", mode: "makeup", variant: "natural" },
  { id: "glam", label: "Evening glam", mode: "makeup", variant: "glamorous" },
  { id: "hair", label: "New hair color", mode: "hair", variant: "hair" },
  { id: "blonde", label: "Soft blonde", mode: "hair", variant: "blonde" },
];

const FREE_TRYONS = PRODUCT_COPY.free.studioGensPerMonth;

export default function HomeTabScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(FREE_TRYONS);
  const [error, setError] = useState<string | null>(null);
  const [pendingPreset, setPendingPreset] = useState<TryNextPreset | null>(null);
  const [teaser, setTeaser] = useState<UnlockTeaser | null>(null);

  async function pickImage(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to upload a selfie.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.9 });

    if (result.canceled || !result.assets.length) return;
    await uploadPhoto(result.assets[0].uri, pendingPreset);
  }

  function startWithPreset(preset: TryNextPreset) {
    setPendingPreset(preset);
    void pickImage(false);
  }

  async function uploadPhoto(uri: string, presetAfter?: TryNextPreset | null) {
    try {
      setLoading(true);
      setError(null);
      const json = await guestUpload(uri);
      setPhotoUrl(json.photoUrl);
      setResultUrl(null);
      setRemaining(json.remaining);
      const nextPreset = presetAfter ?? pendingPreset;
      setPendingPreset(null);
      if (nextPreset) await generate(nextPreset);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function generate(preset: TryNextPreset) {
    if (!photoUrl || remaining <= 0) return;
    try {
      setLoading(true);
      setActivePreset(preset.id);
      setError(null);
      const json = await guestGenerate({
        mode: preset.mode,
        makeupStyle: preset.mode === "makeup" ? preset.variant : undefined,
        hairVariant: preset.mode === "hair" ? preset.variant : undefined,
      });
      setResultUrl(json.lowResUrl);
      setRemaining(json.remaining);
      if (json.teaser && json.teaser.type !== "none") {
        setTeaser({
          type: json.teaser.type as UnlockTeaser["type"],
          message: json.teaser.message ?? "",
          ctaLabel: json.teaser.ctaLabel ?? "Continue",
          ctaHref: json.teaser.ctaHref ?? "/studio",
        });
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setActivePreset(null);
    }
  }

  function surpriseMe() {
    const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    void generate(preset);
  }

  async function shareLook() {
    if (!resultUrl || !photoUrl) return;
    const { teaser: nextTeaser } = await guestShare();
    if (nextTeaser.type !== "none") setTeaser(nextTeaser);
    try {
      const { shareUrl } = await createGuestMomentShare({
        beforeUrl: photoUrl,
        afterUrl: resultUrl,
        caption: "Made with Renovaara",
      });
      await Share.share({
        title: "My Renovaara look",
        message: `Made with Renovaara — try your next look free`,
        url: shareUrl,
      });
    } catch {
      const base = getValidatedMobileApiBaseUrl();
      await Share.share({
        title: "My Renovaara look",
        message: `Made with Renovaara — try your next look free: ${base}/studio`,
        url: resultUrl,
      });
    }
  }

  async function openFullAnalysis() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      router.push("/account");
      return;
    }
    router.push("/upload");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Try a look free</Text>
        <Text style={styles.title}>See a new look on your face in seconds</Text>
        <Text style={styles.subtitle}>
          Upload a selfie, pick a preset or tap Surprise Me. No account needed for your first {FREE_TRYONS} try-ons.
        </Text>

        {!photoUrl ? (
          <>
            <View style={styles.presetGrid}>
              {PRESETS.map((preset) => (
                <Pressable key={preset.id} style={styles.presetCard} onPress={() => startWithPreset(preset)}>
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.uploadCard} onPress={() => void pickImage(false)} disabled={loading}>
              <Text style={styles.uploadTitle}>Upload a selfie</Text>
              <Text style={styles.uploadHint}>{FREE_TRYONS} free try-ons · no card required</Text>
              {loading ? <ActivityIndicator color={t.color.text} style={{ marginTop: 12 }} /> : null}
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => void pickImage(true)}>
              <Text style={styles.secondaryButtonLabel}>Take photo</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.toolbar}>
              <Text style={styles.quota}>{remaining <= 0 ? "No free try-ons left" : `${remaining} free try-ons left`}</Text>
              <Pressable onPress={() => { setPhotoUrl(null); setResultUrl(null); }}>
                <Text style={styles.link}>Change photo</Text>
              </Pressable>
            </View>

            {resultUrl ? (
              <BeforeAfterCompare beforeUri={photoUrl} afterUri={resultUrl} />
            ) : (
              <Image source={{ uri: photoUrl }} style={styles.preview} />
            )}

            <Pressable
              style={[styles.primaryButton, (loading || remaining <= 0) ? styles.primaryButtonDisabled : null]}
              onPress={() => void surpriseMe()}
              disabled={loading || remaining <= 0}
            >
              <Text style={styles.primaryButtonLabel}>{loading ? "Creating…" : "Surprise Me"}</Text>
            </Pressable>

            <TryTheseNext
              presets={PRESETS}
              onSelect={(p) => void generate(p)}
              loading={loading}
              disabled={remaining <= 0}
              activeId={activePreset}
            />

            {resultUrl ? (
              <>
                <Pressable style={styles.secondaryButton} onPress={() => void shareLook()}>
                  <Text style={styles.secondaryButtonLabel}>Share your look</Text>
                </Pressable>
                <UnlockTeaserBanner guest teaser={teaser} />
              </>
            ) : null}

            {remaining <= 0 ? (
              <View style={styles.signInCard}>
                <Text style={styles.signInTitle}>Love your look? Save it to My Looks</Text>
                <Pressable style={styles.primaryButton} onPress={() => router.push("/account")}>
                  <Text style={styles.primaryButtonLabel}>Sign in free</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}

        <Pressable style={styles.linkRow} onPress={() => void openFullAnalysis()}>
          <Text style={styles.link}>Unlock full analysis →</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.color.bg },
  container: { padding: 20, gap: 12, paddingBottom: 40 },
  eyebrow: { fontSize: 12, fontWeight: "700", color: t.color.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: "800", color: t.color.text, lineHeight: 34 },
  subtitle: { fontSize: 15, color: t.color.textSoft, lineHeight: 22, marginBottom: 8 },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: t.color.border,
    backgroundColor: t.color.surfaceSubtle,
    padding: 14,
  },
  presetLabel: { fontSize: 13, fontWeight: "600", color: t.color.text },
  uploadCard: {
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 28,
    alignItems: "center",
  },
  uploadTitle: { fontSize: 16, fontWeight: "700", color: t.color.text },
  uploadHint: { marginTop: 6, fontSize: 12, color: t.color.textMuted },
  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quota: { fontSize: 13, color: t.color.textSoft },
  preview: { width: "100%", aspectRatio: 3 / 4, borderRadius: 24 },
  primaryButton: {
    marginTop: 8,
    backgroundColor: t.color.text,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonLabel: { color: t.color.surface, fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonLabel: { color: t.color.text, fontWeight: "600" },
  signInCard: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 16,
    gap: 10,
  },
  signInTitle: { fontSize: 14, fontWeight: "700", color: t.color.text, textAlign: "center" },
  linkRow: { marginTop: 8, alignItems: "center" },
  link: { color: t.color.text, fontWeight: "600", textDecorationLine: "underline" },
  error: { color: "#C06B3E", fontSize: 13 },
});
