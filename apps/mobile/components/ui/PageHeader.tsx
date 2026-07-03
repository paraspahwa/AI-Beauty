import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { FoilLabel } from "./FoilLabel";

type Props = {
  foil?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export function PageHeader({ foil, title, subtitle, right, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.left}>
        {foil ? <FoilLabel>{foil}</FoilLabel> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: atelier.space.md,
    marginBottom: atelier.space.lg,
  },
  left: { flex: 1, gap: atelier.space.sm },
  right: { flexShrink: 0 },
  title: { ...displayFont(), ...atelier.type.h1, fontSize: 24 },
  subtitle: { ...bodyFont(), ...atelier.type.body },
});
