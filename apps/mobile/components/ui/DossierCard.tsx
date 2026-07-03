import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { atelier } from "@/lib/theme";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
};

export function DossierCard({ children, style, onPress }: Props) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: atelier.color.surface,
    borderRadius: atelier.radius.lg,
    borderWidth: 1,
    borderColor: atelier.color.border,
    padding: atelier.space.md,
    ...atelier.shadow.card,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
});
