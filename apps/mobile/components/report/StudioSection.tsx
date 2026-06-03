import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { type MobileReport } from "@/lib/api";
import { type SavedVisual } from "@/lib/studio-history";
import { Card, EmptyCard, LockedSection, VisualGallery, styles as primitiveStyles, type CheckoutFlow, type PreviewItem, type ReportIntent } from "./ReportPrimitives";

export function StudioSection({
  report,
  savedVisuals,
  lockedBody,
  preferredIntent,
  unlocking,
  awaitingBrowserCheckout,
  checkoutFlow,
  checkoutStatus,
  onUnlock,
  onStudioPro,
  onRefresh,
  onOpenMakeupStudio,
  onOpenHairStudio,
  onOpenGlassesStudio,
  onOpenOutfitStudio,
  onRemoveSavedVisual,
  onPreview,
  formatSavedVisualTime,
}: {
  report: MobileReport;
  savedVisuals: SavedVisual[];
  lockedBody: string;
  preferredIntent: ReportIntent | null;
  unlocking: boolean;
  awaitingBrowserCheckout: boolean;
  checkoutFlow: CheckoutFlow | null;
  checkoutStatus: string | null;
  onUnlock: () => void;
  onStudioPro: () => void;
  onRefresh: () => void;
  onOpenMakeupStudio: () => void;
  onOpenHairStudio: () => void;
  onOpenGlassesStudio: () => void;
  onOpenOutfitStudio: () => void;
  onRemoveSavedVisual: (visual: SavedVisual) => void;
  onPreview: (item: PreviewItem) => void;
  formatSavedVisualTime: (value: string) => string | null;
}) {
  if (!report.isPaid) {
    return (
      <LockedSection
        title="AI Studio"
        body={lockedBody}
        preferredIntent={preferredIntent}
        unlocking={unlocking}
        awaitingBrowserCheckout={awaitingBrowserCheckout}
        checkoutFlow={checkoutFlow}
        checkoutStatus={checkoutStatus}
        onUnlock={onUnlock}
        onStudioPro={onStudioPro}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <>
      <Card title="AI Studio">
        <Text style={primitiveStyles.mutedText}>Start with mobile-safe Studio actions using your report photo.</Text>
        <Pressable onPress={onOpenMakeupStudio} style={primitiveStyles.chatLaunchButton}>
          <Text style={primitiveStyles.chatLaunchButtonLabel}>Open makeup studio</Text>
        </Pressable>
        <Pressable onPress={onOpenHairStudio} style={primitiveStyles.secondaryButton}>
          <Text style={primitiveStyles.secondaryButtonLabel}>Open hair color studio</Text>
        </Pressable>
        <Pressable onPress={onOpenGlassesStudio} style={primitiveStyles.secondaryButton}>
          <Text style={primitiveStyles.secondaryButtonLabel}>Open glasses studio</Text>
        </Pressable>
        <Pressable onPress={onOpenOutfitStudio} style={primitiveStyles.secondaryButton}>
          <Text style={primitiveStyles.secondaryButtonLabel}>Open outfit studio</Text>
        </Pressable>
      </Card>

      <VisualGallery
        title="Makeup previews"
        assets={report.visualAssets?.assets?.makeupPreviews}
        emptyText="Makeup previews will appear here when the visual assets are ready."
        fallbackLabel="Makeup preview"
        beforeImageUrl={report.imageUrl}
        onPreview={onPreview}
      />

      {savedVisuals.length ? (
        <Card title="Saved visuals">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={primitiveStyles.savedVisualsRow}>
            {savedVisuals.map((item) => (
              <View key={item.id} style={primitiveStyles.savedVisualCard}>
                <Pressable onPress={() => onPreview({ imageUrl: item.imageUrl, beforeImageUrl: report.imageUrl ?? undefined, label: `${item.kind === "makeup" ? "Makeup" : item.kind === "hair" ? "Hair" : "Glasses"}${item.label ? ` - ${item.label}` : ""}` })}>
                  <Image source={{ uri: item.imageUrl }} style={primitiveStyles.savedVisualImage} />
                </Pressable>
                <Text style={primitiveStyles.savedVisualLabel} numberOfLines={1}>
                  {item.kind === "makeup" ? "Makeup" : item.kind === "hair" ? "Hair" : "Glasses"}
                  {item.label ? ` - ${item.label}` : ""}
                </Text>
                {formatSavedVisualTime(item.createdAt) ? <Text style={primitiveStyles.savedVisualTime}>{formatSavedVisualTime(item.createdAt)}</Text> : null}
                <Pressable onPress={() => onRemoveSavedVisual(item)} style={primitiveStyles.savedVisualRemoveButton}>
                  <Text style={primitiveStyles.savedVisualRemoveButtonLabel}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </Card>
      ) : (
        <EmptyCard text="Saved makeup, hair, and glasses looks will appear here once you keep them from Studio." />
      )}
    </>
  );
}
