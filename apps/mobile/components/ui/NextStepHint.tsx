import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import type { JourneyHint } from "@web/lib/report/journey-hints";
import { FoilLabel } from "./FoilLabel";

type Props = {
  hint: JourneyHint;
  onAction?: () => void;
  onScrollTo?: (sectionId: string) => void;
  style?: ViewStyle;
};

const toneStyles: Record<JourneyHint["tone"], ViewStyle> = {
  info: { backgroundColor: `${atelier.color.reportPhotoBg}88`, borderColor: `${atelier.color.terracotta}25` },
  action: { backgroundColor: `${atelier.color.reportAccentPanel}`, borderColor: `${atelier.color.terracotta}55` },
  success: { backgroundColor: atelier.color.successSurface, borderColor: atelier.color.successBorder },
  waiting: { backgroundColor: atelier.color.infographicFrame, borderColor: `${atelier.color.terracotta}35`, borderStyle: "dashed" },
};

export function NextStepHint({ hint, onAction, onScrollTo, style }: Props) {
  function handleCta() {
    if (hint.action === "paywall") {
      onAction?.();
      return;
    }
    if (hint.scrollToId) {
      onScrollTo?.(hint.scrollToId);
    }
  }

  return (
    <View style={[styles.wrap, toneStyles[hint.tone], style]}>
      <View style={styles.content}>
        {hint.step ? <FoilLabel>{hint.step}</FoilLabel> : null}
        <Text style={styles.title}>{hint.title}</Text>
        <Text style={styles.body}>{hint.body}</Text>
      </View>
      {hint.ctaLabel ? (
        <Pressable style={styles.cta} onPress={handleCta}>
          <Text style={styles.ctaLabel}>{hint.ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: atelier.radius.lg,
    borderWidth: 1,
    padding: atelier.space.md,
    gap: atelier.space.md,
  },
  content: { gap: atelier.space.sm, flex: 1 },
  title: { ...displayFont(), ...atelier.type.h3 },
  body: { ...bodyFont(), ...atelier.type.body },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: atelier.color.espresso,
    borderRadius: atelier.radius.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  ctaLabel: {
    ...bodyFont(),
    color: atelier.color.btnFg,
    fontFamily: atelier.font.bodySemibold,
    fontSize: 14,
  },
});
