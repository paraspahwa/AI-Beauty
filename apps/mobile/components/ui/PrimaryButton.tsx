import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { atelier } from "@/lib/theme";
import { bodyFont } from "@/lib/theme-provider";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline";
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, loading, disabled, variant = "primary", style }: Props) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? atelier.color.btnFg : atelier.color.espresso} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelOutline]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: atelier.radius.full,
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primary: { backgroundColor: atelier.color.espresso },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: atelier.color.border,
  },
  disabled: { opacity: atelier.color.espresso ? 0.45 : 0.45 },
  pressed: { opacity: 0.9 },
  label: { ...bodyFont(), fontFamily: atelier.font.bodySemibold, fontSize: 15 },
  labelPrimary: { color: atelier.color.btnFg },
  labelOutline: { color: atelier.color.espresso },
});
