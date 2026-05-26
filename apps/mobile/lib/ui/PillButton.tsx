import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { mobileTheme as t } from "@/lib/theme";

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
    backgroundColor: t.color.text,
  },
  outline: {
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    backgroundColor: t.color.surface,
  },
  subtle: {
    backgroundColor: t.color.surfaceSubtle,
  },
  solidLabel: {
    color: t.color.textOnDark,
    fontWeight: "700",
    fontSize: 12,
  },
  subtleLabel: {
    color: t.color.textSoft,
    fontWeight: "700",
    fontSize: 12,
  },
  disabled: {
    opacity: t.opacity.disabled,
  },
});
