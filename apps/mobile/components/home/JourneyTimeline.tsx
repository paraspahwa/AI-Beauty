import { StyleSheet, Text, View } from "react-native";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { FoilLabel } from "@/components/ui/FoilLabel";

const STEPS = [
  { n: "01", title: "Upload a selfie", body: "Free face-shape preview infographic." },
  { n: "02", title: "Unlock once", body: "Six illustrated analysis chapters + PDF." },
  { n: "03", title: "Generate chapters", body: "Tap Generate per board at your pace." },
  { n: "04", title: "Style Guide add-on", body: "Optional full-body wardrobe board." },
  { n: "05", title: "Vault", body: "Download and revisit every asset." },
];

export function JourneyTimeline() {
  return (
    <View style={styles.wrap}>
      <FoilLabel>How it works</FoilLabel>
      <Text style={styles.title}>Your dossier journey</Text>
      {STEPS.map((step) => (
        <View key={step.n} style={styles.step}>
          <Text style={styles.num}>{step.n}</Text>
          <View style={styles.copy}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepBody}>{step.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: atelier.space.sm, marginBottom: atelier.space.lg },
  title: { ...displayFont(), ...atelier.type.h2 },
  step: { flexDirection: "row", gap: atelier.space.md, paddingVertical: atelier.space.sm },
  num: { ...displayFont(), color: atelier.color.terracotta, width: 36 },
  copy: { flex: 1, gap: 4 },
  stepTitle: { ...bodyFont(), fontFamily: atelier.font.bodySemibold, color: atelier.color.espresso },
  stepBody: { ...bodyFont(), fontSize: 13 },
});
