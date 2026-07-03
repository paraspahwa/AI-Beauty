import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { FoilLabel } from "@/components/ui/FoilLabel";

const FAQ = [
  { q: "What do I get for free?", a: "A face-shape preview infographic after you upload a selfie." },
  { q: "What does the full report include?", a: "Six illustrated chapters plus a downloadable analysis PDF." },
  { q: "Is the Style Guide included?", a: "It is a separate ₹99 add-on after you upload a full-body photo." },
  { q: "How do payments work?", a: "Secure checkout opens in your browser; your report unlocks automatically." },
];

export function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <View style={styles.wrap}>
      <FoilLabel>FAQ</FoilLabel>
      <Text style={styles.title}>Common questions</Text>
      {FAQ.map((item, i) => (
        <Pressable key={item.q} style={styles.item} onPress={() => setOpen(open === i ? null : i)}>
          <Text style={styles.q}>{item.q}</Text>
          {open === i ? <Text style={styles.a}>{item.a}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: atelier.space.sm, marginBottom: atelier.space.lg },
  title: { ...displayFont(), ...atelier.type.h2 },
  item: {
    borderWidth: 1,
    borderColor: atelier.color.border,
    borderRadius: atelier.radius.md,
    padding: atelier.space.md,
    gap: 8,
    backgroundColor: atelier.color.surface,
  },
  q: { ...bodyFont(), fontFamily: atelier.font.bodySemibold, color: atelier.color.espresso },
  a: { ...bodyFont(), fontSize: 13 },
});
