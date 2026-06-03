import { type ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { type MobileVisualAsset } from "@/lib/api";
import { mobileTheme as t } from "@/lib/theme";

export type CheckoutFlow = "report" | "studio_pro";
export type ReportIntent = CheckoutFlow;

export type PreviewItem = {
  imageUrl: string;
  label: string;
  beforeImageUrl?: string;
};

export function getAssetUrl(asset: MobileVisualAsset | null | undefined): string | null {
  if (!asset) return null;
  if (typeof asset.signedUrl === "string" && asset.signedUrl.length > 0) return asset.signedUrl;
  return null;
}

function getAssetLabel(asset: MobileVisualAsset | null | undefined, fallback: string): string {
  if (!asset) return fallback;
  if (typeof asset.styleName === "string" && asset.styleName.trim().length > 0) return asset.styleName;
  if (typeof asset.label === "string" && asset.label.trim().length > 0) return asset.label;
  return fallback;
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyCardText}>{text}</Text>
    </View>
  );
}

export function VisualAssetCard({
  title,
  asset,
  emptyText,
  beforeImageUrl,
  onPreview,
}: {
  title: string;
  asset?: MobileVisualAsset | null;
  emptyText: string;
  beforeImageUrl?: string;
  onPreview: (item: PreviewItem) => void;
}) {
  const assetUrl = getAssetUrl(asset);

  if (!assetUrl) {
    return <EmptyCard text={emptyText} />;
  }

  return (
    <Card title={title}>
      <Pressable onPress={() => onPreview({ imageUrl: assetUrl, label: getAssetLabel(asset, title), beforeImageUrl })}>
        <Image source={{ uri: assetUrl }} style={styles.featuredVisual} />
      </Pressable>
      <Text style={styles.mutedText}>{getAssetLabel(asset, title)}</Text>
    </Card>
  );
}

export function VisualGallery({
  title,
  assets,
  emptyText,
  fallbackLabel,
  beforeImageUrl,
  onPreview,
}: {
  title: string;
  assets?: MobileVisualAsset[];
  emptyText: string;
  fallbackLabel: string;
  beforeImageUrl?: string;
  onPreview: (item: PreviewItem) => void;
}) {
  const readyAssets = (assets ?? []).filter((asset) => Boolean(getAssetUrl(asset)));

  if (readyAssets.length === 0) {
    return <EmptyCard text={emptyText} />;
  }

  return (
    <Card title={title}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
        {readyAssets.map((asset, index) => {
          const assetUrl = getAssetUrl(asset);
          if (!assetUrl) return null;
          const label = getAssetLabel(asset, `${fallbackLabel} ${index + 1}`);
          return (
            <Pressable key={`${label}-${index}`} onPress={() => onPreview({ imageUrl: assetUrl, label, beforeImageUrl })} style={styles.galleryCard}>
              <Image source={{ uri: assetUrl }} style={styles.galleryImage} />
              <Text style={styles.galleryLabel} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Card>
  );
}

export function LockedSection({
  title,
  body,
  preferredIntent,
  unlocking,
  awaitingBrowserCheckout,
  checkoutFlow,
  checkoutStatus,
  onUnlock,
  onStudioPro,
  onRefresh,
}: {
  title: string;
  body: string;
  preferredIntent: ReportIntent | null;
  unlocking: boolean;
  awaitingBrowserCheckout: boolean;
  checkoutFlow: CheckoutFlow | null;
  checkoutStatus: string | null;
  onUnlock: () => void;
  onStudioPro: () => void;
  onRefresh: () => void;
}) {
  const studioFirst = preferredIntent === "studio_pro";

  return (
    <Card title={title}>
      <Text style={styles.mutedText}>{body}</Text>
      <Pressable
        onPress={studioFirst ? onStudioPro : onUnlock}
        disabled={unlocking}
        style={[styles.unlockButton, unlocking ? styles.unlockButtonDisabled : null]}
      >
        <Text style={styles.unlockButtonLabel}>
          {studioFirst ? "Continue with Studio Pro" : unlocking ? "Processing..." : "Unlock full report"}
        </Text>
      </Pressable>
      <Pressable onPress={studioFirst ? onUnlock : onStudioPro} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonLabel}>{studioFirst ? "Unlock only this report" : "Go Studio Pro instead"}</Text>
      </Pressable>
      {checkoutStatus ? <Text style={styles.helperText}>{checkoutStatus}</Text> : null}
      {awaitingBrowserCheckout || checkoutStatus ? (
        <Pressable onPress={onRefresh} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonLabel}>
            {checkoutFlow === "studio_pro" ? "Check Studio Pro status again" : "Check unlock again"}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: t.color.surface,
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: t.color.text,
  },
  metricPill: {
    borderRadius: 999,
    backgroundColor: t.color.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: t.color.brandRoseBorderSoft,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    color: t.color.textFaint,
  },
  metricValue: {
    color: t.color.text,
    fontWeight: "700",
  },
  bodyText: {
    fontSize: 16,
    color: t.color.text,
  },
  mutedText: {
    fontSize: 15,
    color: t.color.textMuted,
    lineHeight: 22,
  },
  inlineSection: {
    gap: 2,
  },
  emptyCard: {
    borderRadius: 20,
    backgroundColor: t.color.surface,
    borderWidth: 1,
    borderColor: t.color.divider,
    padding: 18,
  },
  emptyCardText: {
    color: t.color.textMuted,
    lineHeight: 21,
  },
  featuredVisual: {
    width: "100%",
    height: 320,
    borderRadius: 18,
    backgroundColor: t.color.surfaceSubtle,
  },
  galleryRow: {
    gap: 10,
    paddingRight: 8,
  },
  galleryCard: {
    width: 170,
    gap: 6,
  },
  galleryImage: {
    width: 170,
    height: 220,
    borderRadius: 16,
    backgroundColor: t.color.surfaceSubtle,
  },
  galleryLabel: {
    color: t.color.text,
    fontSize: 12,
    fontWeight: "700",
  },
  unlockButton: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: t.color.text,
    paddingVertical: 12,
    alignItems: "center",
  },
  unlockButtonDisabled: {
    opacity: 0.5,
  },
  unlockButtonLabel: {
    color: t.color.surface,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    color: t.color.textFaint,
    lineHeight: 18,
  },
  secondaryButton: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.color.borderStrong,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonLabel: {
    color: t.color.textSoft,
    fontWeight: "600",
  },
  chatLaunchButton: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: t.color.text,
    paddingVertical: 12,
    alignItems: "center",
  },
  chatLaunchButtonLabel: {
    color: t.color.surface,
    fontWeight: "700",
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  swatchCard: {
    alignItems: "center",
    gap: 6,
    width: 72,
  },
  swatchCircle: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.color.overlayDark08,
  },
  swatchLabel: {
    color: t.color.textMuted,
    fontSize: 11,
    textAlign: "center",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    backgroundColor: t.color.brandRoseSurface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagLabel: {
    color: t.color.brandRose,
    fontWeight: "700",
    fontSize: 12,
  },
  savedVisualsRow: {
    gap: 10,
    paddingRight: 8,
  },
  savedVisualCard: {
    width: 148,
    gap: 4,
  },
  savedVisualImage: {
    width: 148,
    height: 188,
    borderRadius: 14,
    backgroundColor: t.color.surfaceSubtle,
  },
  savedVisualLabel: {
    color: t.color.text,
    fontSize: 12,
    fontWeight: "700",
  },
  savedVisualTime: {
    color: t.color.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  savedVisualRemoveButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.color.border,
    paddingVertical: 6,
    alignItems: "center",
  },
  savedVisualRemoveButtonLabel: {
    color: t.color.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
});
