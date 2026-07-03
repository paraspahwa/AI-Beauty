import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { atelier } from "@/lib/theme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ReportSurfacePanel({ children, style }: Props) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: atelier.color.surface,
    borderRadius: atelier.radius.xl,
    borderWidth: 1,
    borderColor: `${atelier.color.terracotta}18`,
    padding: atelier.space.md,
    overflow: "hidden",
  },
});
