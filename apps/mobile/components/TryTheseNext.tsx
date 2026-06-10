import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { mobileTheme as t } from "@/lib/theme";

export type TryNextPreset = {
  id: string;
  label: string;
  mode: "makeup" | "hair";
  variant: string;
};

export function TryTheseNext({
  presets,
  onSelect,
  loading,
  disabled,
  activeId,
}: {
  presets: TryNextPreset[];
  onSelect: (preset: TryNextPreset) => void;
  loading?: boolean;
  disabled?: boolean;
  activeId?: string | null;
}) {
  if (!presets.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Try these next</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {presets.map((preset) => {
          const active = activeId === preset.id;
          return (
            <Pressable
              key={preset.id}
              disabled={loading || disabled}
              onPress={() => onSelect(preset)}
              style={[styles.chip, active ? styles.chipActive : null, (loading || disabled) ? styles.chipDisabled : null]}
            >
              {loading && active ? <ActivityIndicator size="small" color={active ? t.color.surface : t.color.text} /> : null}
              <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{preset.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  title: { fontSize: 12, fontWeight: "700", color: t.color.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  row: { gap: 8, paddingRight: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: { backgroundColor: t.color.text, borderColor: t.color.text },
  chipDisabled: { opacity: 0.5 },
  chipLabel: { color: t.color.textSoft, fontWeight: "600", fontSize: 13 },
  chipLabelActive: { color: t.color.surface },
});
