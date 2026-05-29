import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { createStudioCanvasShareLink, fetchStudioVault, generateStudioCanvas, revokeStudioCanvasShareLink, scanStudioCanvasColor, type MobileCanvasColorScan, type MobileCanvasGenerateResponse, type MobileCanvasGenerateMode, type MobileVaultAsset } from "@/lib/api";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { mobileTheme as t } from "@/lib/theme";

const MAKEUP_STYLES = ["natural", "professional", "glamorous", "bridal"] as const;
const MAKEUP_INTENSITIES = ["light", "medium", "heavy"] as const;
const HAIR_COLORS = ["natural", "black", "dark_brown", "chestnut", "auburn", "blonde", "burgundy"] as const;
const OUTFIT_OCCASIONS = ["casual", "work", "date", "wedding", "travel"] as const;
const OUTFIT_VIBES = ["minimal", "classic", "bold", "romantic", "street"] as const;

export default function CanvasStudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; photoUrl?: string; tier?: string; remaining?: string }>();
  const [loading, setLoading] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<MobileCanvasColorScan | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sourceAssetId, setSourceAssetId] = useState<string | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<MobileCanvasGenerateResponse | null>(null);
  const [canvasAssets, setCanvasAssets] = useState<MobileVaultAsset[]>([]);
  const [makeupStyle, setMakeupStyle] = useState<(typeof MAKEUP_STYLES)[number]>("natural");
  const [makeupIntensity, setMakeupIntensity] = useState<(typeof MAKEUP_INTENSITIES)[number]>("medium");
  const [hairColor, setHairColor] = useState<(typeof HAIR_COLORS)[number]>("natural");
  const [occasion, setOccasion] = useState<(typeof OUTFIT_OCCASIONS)[number]>("casual");
  const [vibe, setVibe] = useState<(typeof OUTFIT_VIBES)[number]>("minimal");

  const canvasId = Array.isArray(params.id) ? params.id[0] : params.id;
  const photoUrl = Array.isArray(params.photoUrl) ? params.photoUrl[0] : params.photoUrl;
  const quotaLabel = useMemo(() => {
    const tier = Array.isArray(params.tier) ? params.tier[0] : params.tier;
    const remaining = Array.isArray(params.remaining) ? params.remaining[0] : params.remaining;
    if (tier === "studio_pro") return "Studio Pro · unlimited canvas generations";
    return remaining ? `${remaining} canvas generations left this month` : "Canvas quota depends on your current plan";
  }, [params.remaining, params.tier]);

  async function loadCanvasAssets() {
    if (!canvasId) return;
    try {
      setVaultLoading(true);
      const response = await fetchStudioVault({ limit: 50, offset: 0, filter: "canvas" });
      const next = response.assets.filter((item) => item.sourceId === canvasId);
      setCanvasAssets(next);
      if (!sourcePreviewUrl && photoUrl) {
        setSourcePreviewUrl(photoUrl);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setVaultLoading(false);
    }
  }

  useEffect(() => {
    void loadCanvasAssets();
  }, [canvasId]);

  async function handleScan() {
    if (!canvasId) return;
    try {
      setLoading(true);
      setError(null);
      const analysis = await scanStudioCanvasColor(canvasId);
      setScan(analysis);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(mode: MobileCanvasGenerateMode) {
    if (!canvasId) return;
    try {
      setLoading(true);
      setError(null);
      const options: Record<string, unknown> = {
        sourceAssetId,
      };
      if (scan) options.colorScan = scan;
      if (mode === "makeup") {
        options.makeupStyle = makeupStyle;
        options.makeupIntensity = makeupIntensity;
      }
      if (mode === "hair") {
        options.hairStyle = "No change";
        options.hairColor = hairColor;
      }
      if (mode === "outfit") {
        options.occasion = occasion;
        options.vibe = vibe;
        if (scan?.palette?.length) {
          options.colorPalette = scan.palette;
        }
      }

      const generated = await generateStudioCanvas(canvasId, mode, options);
      setResult(generated);
      if (generated.asset?.id) {
        setSourceAssetId(generated.asset.id);
        setSourcePreviewUrl(generated.hdUrl ?? generated.lowResUrl);
      }
      await loadCanvasAssets();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleShareCanvas() {
    if (!canvasId) return;
    try {
      let nextToken = shareToken;
      let shareUrl = "";
      if (!nextToken) {
        const response = await createStudioCanvasShareLink(canvasId);
        nextToken = response.shareToken;
        shareUrl = response.shareUrl;
        setShareToken(response.shareToken);
      } else {
        shareUrl = `${getValidatedMobileApiBaseUrl()}/c/${nextToken}`;
      }
      await Share.share({ message: `View my Renovaara Studio Canvas: ${shareUrl}`, url: shareUrl });
    } catch (err) {
      Alert.alert("Share canvas", String(err));
    }
  }

  async function handleRevokeShare() {
    if (!canvasId) return;
    try {
      await revokeStudioCanvasShareLink(canvasId);
      setShareToken(null);
    } catch (err) {
      Alert.alert("Share canvas", String(err));
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Studio Canvas</Text>
        <Text style={styles.subtitle}>Standalone Studio flow for quick scan, makeup, hair, and outfit generation.</Text>

        <Card title="Canvas quota">
          <Text style={styles.helperText}>{quotaLabel}</Text>
        </Card>

        <Card title="Source image">
          {sourcePreviewUrl ? <Image source={{ uri: sourcePreviewUrl }} style={styles.previewImage} /> : <Text style={styles.helperText}>Canvas source photo is only available for new sessions in this mobile flow.</Text>}
          <View style={styles.inlineRow}>
            <Pressable onPress={() => { setSourceAssetId(null); setSourcePreviewUrl(photoUrl ?? null); }} style={styles.secondaryButtonCompact}>
              <Text style={styles.secondaryButtonCompactLabel}>Use original</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/studio/canvas/create")} style={styles.secondaryButtonCompact}>
              <Text style={styles.secondaryButtonCompactLabel}>New canvas</Text>
            </Pressable>
          </View>
        </Card>

        <Card title="Quick scan">
          <Text style={styles.helperText}>Scan your canvas photo for season and palette guidance before generating looks.</Text>
          <Pressable onPress={() => void handleScan()} disabled={loading} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>{loading ? "Scanning..." : "Run quick scan"}</Text>
          </Pressable>
          {scan?.palette?.length ? (
            <View style={styles.swatchRow}>
              {scan.palette.slice(0, 6).map((item) => (
                <View key={`${item.name}-${item.hex}`} style={styles.swatchCard}>
                  <View style={[styles.swatchCircle, { backgroundColor: item.hex }]} />
                  <Text style={styles.swatchLabel}>{item.name}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        <Card title="Makeup">
          <View style={styles.chipRow}>
            {MAKEUP_STYLES.map((item) => (
              <ChoiceChip key={item} label={item} active={makeupStyle === item} onPress={() => setMakeupStyle(item)} />
            ))}
          </View>
          <View style={styles.chipRow}>
            {MAKEUP_INTENSITIES.map((item) => (
              <ChoiceChip key={item} label={item} active={makeupIntensity === item} onPress={() => setMakeupIntensity(item)} />
            ))}
          </View>
          <Pressable onPress={() => void handleGenerate("makeup")} disabled={loading} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>{loading ? "Generating..." : "Generate makeup look"}</Text>
          </Pressable>
        </Card>

        <Card title="Hair">
          <View style={styles.chipRow}>
            {HAIR_COLORS.map((item) => (
              <ChoiceChip key={item} label={item.replace(/_/g, " ")} active={hairColor === item} onPress={() => setHairColor(item)} />
            ))}
          </View>
          <Pressable onPress={() => void handleGenerate("hair")} disabled={loading} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>{loading ? "Generating..." : "Generate hair look"}</Text>
          </Pressable>
        </Card>

        <Card title="Outfit">
          <View style={styles.chipRow}>
            {OUTFIT_OCCASIONS.map((item) => (
              <ChoiceChip key={item} label={item} active={occasion === item} onPress={() => setOccasion(item)} />
            ))}
          </View>
          <View style={styles.chipRow}>
            {OUTFIT_VIBES.map((item) => (
              <ChoiceChip key={item} label={item} active={vibe === item} onPress={() => setVibe(item)} />
            ))}
          </View>
          <Pressable onPress={() => void handleGenerate("outfit")} disabled={loading} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>{loading ? "Generating..." : "Generate outfit board"}</Text>
          </Pressable>
        </Card>

        <Card title="Share canvas">
          <View style={styles.inlineRow}>
            <Pressable onPress={() => void handleShareCanvas()} style={styles.primaryButtonCompact}>
              <Text style={styles.primaryButtonLabel}>{shareToken ? "Share existing link" : "Create and share"}</Text>
            </Pressable>
            {shareToken ? (
              <Pressable onPress={() => void handleRevokeShare()} style={styles.secondaryButtonCompact}>
                <Text style={styles.secondaryButtonCompactLabel}>Revoke link</Text>
              </Pressable>
            ) : null}
          </View>
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? <ActivityIndicator size="small" color={t.color.text} /> : null}

        {result?.hdUrl || result?.lowResUrl ? (
          <Card title="Latest result">
            <Image source={{ uri: result.hdUrl ?? result.lowResUrl }} style={styles.previewImage} />
            {result.outfit?.summary ? <Text style={styles.helperText}>{result.outfit.summary}</Text> : null}
            {result.outfit?.looks?.length ? (
              <View style={styles.lookList}>
                {result.outfit.looks.map((look) => (
                  <View key={look.title} style={styles.lookCard}>
                    <Text style={styles.lookTitle}>{look.title}</Text>
                    <Text style={styles.helperText}>{look.pieces.join(" • ")}</Text>
                    <Text style={styles.helperText}>{look.notes}</Text>
                    {look.palette?.length ? (
                      <View style={styles.swatchRow}>
                        {look.palette.slice(0, 4).map((item) => (
                          <View key={`${look.title}-${item.hex}`} style={styles.swatchCard}>
                            <View style={[styles.swatchCircle, { backgroundColor: item.hex }]} />
                            <Text style={styles.swatchLabel}>{item.name}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        ) : null}

        <Card title="Canvas history">
          {vaultLoading ? (
            <ActivityIndicator size="small" color={t.color.text} />
          ) : !canvasAssets.length ? (
            <Text style={styles.helperText}>Your canvas generations will appear here after the first result is created.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyRow}>
              {canvasAssets.map((asset) => (
                <Pressable
                  key={asset.id}
                  onPress={() => {
                    setSourceAssetId(asset.id);
                    setSourcePreviewUrl(asset.hdUrl || asset.lowResUrl);
                  }}
                  style={styles.historyCard}
                >
                  <Image source={{ uri: asset.lowResUrl || asset.hdUrl }} style={styles.historyImage} />
                  <Text style={styles.historyLabel} numberOfLines={1}>{asset.tool}{asset.variant ? ` · ${asset.variant}` : ""}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Card>
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
  container: { padding: 20, gap: 14 },
  backButton: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: t.color.surfaceSubtle, paddingHorizontal: 12, paddingVertical: 8 },
  backButtonLabel: { color: t.color.text, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "700", color: t.color.text },
  subtitle: { color: t.color.textMuted, lineHeight: 21 },
  card: { borderRadius: 18, backgroundColor: t.color.surface, padding: 14, gap: 10 },
  cardTitle: { color: t.color.text, fontWeight: "700", fontSize: 16 },
  helperText: { color: t.color.textMuted, lineHeight: 20 },
  previewImage: { width: "100%", aspectRatio: 3 / 4, borderRadius: 18, backgroundColor: t.color.surfaceSubtle },
  inlineRow: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  choiceChip: { borderRadius: 999, borderWidth: 1, borderColor: t.color.borderStrong, backgroundColor: t.color.surfaceMuted, paddingHorizontal: 12, paddingVertical: 8 },
  choiceChipActive: { backgroundColor: t.color.text, borderColor: t.color.text },
  choiceChipLabel: { color: t.color.textSoft, fontWeight: "600" },
  choiceChipLabelActive: { color: t.color.textOnDark },
  primaryButton: { borderRadius: 16, backgroundColor: t.color.text, paddingVertical: 14, alignItems: "center" },
  primaryButtonCompact: { flex: 1, borderRadius: 16, backgroundColor: t.color.text, paddingVertical: 12, alignItems: "center" },
  primaryButtonLabel: { color: t.color.textOnDark, fontWeight: "700" },
  secondaryButtonCompact: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: t.color.borderStrong, backgroundColor: t.color.surface, paddingVertical: 12, alignItems: "center" },
  secondaryButtonCompactLabel: { color: t.color.text, fontWeight: "700" },
  errorText: { color: t.color.danger },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatchCard: { width: 72, alignItems: "center", gap: 6 },
  swatchCircle: { width: 34, height: 34, borderRadius: 999, borderWidth: 1, borderColor: t.color.border },
  swatchLabel: { color: t.color.textMuted, fontSize: 11, textAlign: "center" },
  lookList: { gap: 10 },
  lookCard: { borderRadius: 14, backgroundColor: t.color.surfaceMuted, padding: 12, gap: 6 },
  lookTitle: { color: t.color.text, fontWeight: "700" },
  historyRow: { gap: 12 },
  historyCard: { width: 148, gap: 8 },
  historyImage: { width: 148, height: 198, borderRadius: 18, backgroundColor: t.color.surfaceSubtle },
  historyLabel: { color: t.color.text, fontWeight: "600" },
});