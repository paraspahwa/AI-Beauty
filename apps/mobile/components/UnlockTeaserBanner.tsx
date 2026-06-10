import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { getValidatedMobileApiBaseUrl } from "@/lib/env";
import { getStudioProgress, postStudioProgress } from "@/lib/api";
import { guestDismissTeaser, getUnlockTeaser, readGuestProgress, type UnlockTeaser } from "@/lib/progressive-unlock";
import { mobileTheme as t } from "@/lib/theme";

export function UnlockTeaserBanner({
  guest = false,
  teaser: teaserProp,
}: {
  guest?: boolean;
  teaser?: UnlockTeaser | null;
}) {
  const [teaser, setTeaser] = useState<UnlockTeaser>({ type: "none" });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    void (async () => {
      if (teaserProp && teaserProp.type !== "none") {
        setTeaser(teaserProp);
        setVisible(true);
        return;
      }

      if (guest) {
        const progress = await readGuestProgress();
        const next = getUnlockTeaser(progress);
        setTeaser(next);
        setVisible(next.type !== "none");
        return;
      }

      try {
        const json = await getStudioProgress();
        if (json.teaser && json.teaser.type !== "none") {
          setTeaser({
            type: json.teaser.type as UnlockTeaser["type"],
            message: json.teaser.message ?? "",
            ctaLabel: json.teaser.ctaLabel ?? "Continue",
            ctaHref: json.teaser.ctaHref ?? "/upload",
          });
          setVisible(true);
        }
      } catch {
        // ignore for guests / offline
      }
    })();
  }, [guest, teaserProp]);

  if (!visible || teaser.type === "none") return null;

  async function handleDismiss() {
    if (guest) {
      await guestDismissTeaser();
    } else {
      try {
        await postStudioProgress("dismiss");
      } catch {
        // ignore
      }
    }
    setVisible(false);
  }

  return (
    <View style={styles.card}>
      <Pressable onPress={() => void handleDismiss()} style={styles.dismiss}>
        <Text style={styles.dismissText}>×</Text>
      </Pressable>
      <Text style={styles.message}>{teaser.message}</Text>
      <Pressable
        onPress={() => {
          const base = getValidatedMobileApiBaseUrl();
          void Linking.openURL(`${base}${teaser.ctaHref}`);
        }}
      >
        <Text style={styles.cta}>{teaser.ctaLabel} →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.color.border,
    backgroundColor: t.color.surface,
    padding: 16,
    marginTop: 12,
  },
  dismiss: { position: "absolute", right: 12, top: 8, zIndex: 1 },
  dismissText: { fontSize: 20, color: t.color.textMuted },
  message: { color: t.color.text, fontSize: 14, lineHeight: 20, paddingRight: 24 },
  cta: { marginTop: 8, color: t.color.text, fontWeight: "700", fontSize: 14 },
});
