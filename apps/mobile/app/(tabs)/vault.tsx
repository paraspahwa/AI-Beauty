import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Linking } from "react-native";
import { deleteVaultItem, fetchVault } from "@/lib/api";
import { downloadReportPdf } from "@/lib/pdf-download";
import type { VaultItem } from "@web/types/vault";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { getVaultJourneyHint } from "@web/lib/report/journey-hints";
import { PageHeader } from "@/components/ui/PageHeader";
import { NextStepHint } from "@/components/ui/NextStepHint";
import { DossierCard } from "@/components/ui/DossierCard";
import { FoilLabel } from "@/components/ui/FoilLabel";

type Filter = "all" | "uploads" | "analysis";

export default function VaultTabScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, uploads: 0, analysis: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const vault = await fetchVault();
      setItems(vault.items);
      setCounts(vault.counts);
    } catch (e) {
      Alert.alert("Vault error", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = items.filter((item) => {
    if (filter === "uploads") return item.kind === "upload";
    if (filter === "analysis") return item.kind === "analysis";
    return true;
  });

  const hint = getVaultJourneyHint(counts);

  async function handleOpen(item: VaultItem) {
    if (item.pdfDownloadUrl) {
      try {
        await downloadReportPdf(item.reportId, item.pdfVariant ?? "report");
      } catch (e) {
        Alert.alert("Download failed", (e as Error).message);
      }
      return;
    }
    if (item.signedUrl) await Linking.openURL(item.signedUrl);
  }

  async function handleDelete(item: VaultItem) {
    Alert.alert("Delete item", `Remove ${item.label}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteVaultItem(item.id);
          void load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <PageHeader foil="Archive" title="Your Vault" subtitle="Uploads, illustrated boards, and PDFs." />
        {hint ? <NextStepHint hint={hint} style={{ marginBottom: 16 }} /> : null}

        <View style={styles.filters}>
          {(["all", "uploads", "analysis"] as Filter[]).map((f) => (
            <Pressable key={f} style={[styles.filter, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterLabel, filter === f && styles.filterLabelActive]}>{f}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={atelier.color.terracotta} />
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>No items yet. Complete an analysis to populate your vault.</Text>
        ) : (
          filtered.map((item) => (
            <DossierCard key={item.id} style={styles.card}>
              {item.signedUrl && item.kind !== "pdf" ? (
                <Image source={{ uri: item.signedUrl }} style={styles.thumb} resizeMode="cover" />
              ) : null}
              <FoilLabel>{item.kind}</FoilLabel>
              <Text style={styles.cardTitle}>{item.label}</Text>
              <View style={styles.actions}>
                <Pressable onPress={() => void handleOpen(item)}>
                  <Text style={styles.link}>Open</Text>
                </Pressable>
                <Pressable onPress={() => void handleDelete(item)}>
                  <Text style={styles.delete}>Delete</Text>
                </Pressable>
              </View>
            </DossierCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.color.parchment },
  container: { padding: atelier.space.md },
  filters: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filter: {
    borderWidth: 1,
    borderColor: atelier.color.border,
    borderRadius: atelier.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterActive: { backgroundColor: atelier.color.espresso, borderColor: atelier.color.espresso },
  filterLabel: { ...bodyFont(), fontSize: 12, textTransform: "capitalize" },
  filterLabelActive: { color: atelier.color.btnFg },
  empty: { ...bodyFont(), textAlign: "center", paddingVertical: 32 },
  card: { marginBottom: 12, gap: 8 },
  thumb: { width: "100%", height: 140, borderRadius: atelier.radius.md },
  cardTitle: { ...displayFont(), fontSize: 16 },
  actions: { flexDirection: "row", gap: 16 },
  link: { ...bodyFont(), color: atelier.color.terracotta, fontFamily: atelier.font.bodySemibold },
  delete: { ...bodyFont(), color: atelier.color.danger },
});
