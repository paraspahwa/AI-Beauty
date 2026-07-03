import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { startAnalysisFromSelfie } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DossierCard } from "@/components/ui/DossierCard";

const STEPS = [
  "Upload a clear front-facing selfie in natural light.",
  "Get your free face-shape preview board automatically.",
  "Unlock once for six illustrated chapters + PDF.",
];

export default function UploadScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function pickAndAnalyze(useCamera: boolean) {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      router.replace("/account");
      return;
    }

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to upload a selfie.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.9 });

    if (result.canceled || !result.assets.length) return;

    try {
      setLoading(true);
      const { reportId } = await startAnalysisFromSelfie(result.assets[0].uri);
      router.replace({
        pathname: "/analysis/[id]",
        params: { id: reportId, imageUri: result.assets[0].uri },
      });
    } catch (err) {
      Alert.alert("Upload failed", String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <FoilLabel>Step 1 of 3</FoilLabel>
        <Text style={styles.title}>Upload your selfie</Text>
        <Text style={styles.subtitle}>
          We analyze face shape, colour season, skin, hairstyle, and spectacles — then craft your illustrated dossier.
        </Text>

        <DossierCard style={styles.stepsCard}>
          {STEPS.map((step, i) => (
            <Text key={step} style={styles.step}>
              {i + 1}. {step}
            </Text>
          ))}
        </DossierCard>

        {loading ? (
          <ActivityIndicator color={atelier.color.terracotta} />
        ) : (
          <>
            <PrimaryButton label="Choose from library" onPress={() => void pickAndAnalyze(false)} />
            <PrimaryButton label="Take photo" onPress={() => void pickAndAnalyze(true)} variant="outline" style={{ marginTop: 8 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: atelier.color.parchment },
  container: { padding: atelier.space.lg, gap: 12 },
  title: { ...displayFont(), ...atelier.type.h1 },
  subtitle: { ...bodyFont(), ...atelier.type.body },
  stepsCard: { gap: 8, marginVertical: 8 },
  step: { ...bodyFont(), fontSize: 13 },
});
