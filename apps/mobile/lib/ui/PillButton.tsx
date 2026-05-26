import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

type PillButtonVariant = "solid" | "outline" | "subtle";

type PillButtonProps = {
  label: string;
  onPress: () => void;
  variant?: PillButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PillButton({
  label,
  onPress,
  variant = "solid",
  disabled = false,
  style,
}: PillButtonProps) {
  const variantStyle = variant === "solid"
    ? styles.solid
    : variant === "outline"
      ? styles.outline
      : styles.subtle;

  const labelStyle = variant === "solid" ? styles.solidLabel : styles.subtleLabel;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, variantStyle, disabled ? styles.disabled : null, style]}
    >
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  solid: {
    backgroundColor: "#111827",
  },
  outline: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  subtle: {
    backgroundColor: "#f3f4f6",
  },
  solidLabel: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  subtleLabel: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 12,
  },
  disabled: {
    opacity: 0.45,
  },
});
