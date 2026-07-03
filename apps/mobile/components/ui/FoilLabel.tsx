import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { atelier } from "@/lib/theme";
import { bodyFont } from "@/lib/theme-provider";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function FoilLabel({ children, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: `${atelier.color.terracotta}55`,
    borderRadius: atelier.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: `${atelier.color.terracotta}08`,
  },
  label: {
    ...bodyFont(),
    ...atelier.type.foilLabel,
    color: atelier.color.terracotta,
    fontFamily: atelier.font.bodySemibold,
  },
});
