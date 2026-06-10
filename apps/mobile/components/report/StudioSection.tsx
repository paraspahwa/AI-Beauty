import { Pressable, Text } from "react-native";
import { PRODUCT_COPY } from "@/lib/product-copy";
import { type MobileReport } from "@/lib/api";
import { type SavedVisual } from "@/lib/studio-history";
import { Card, LockedSection, VisualGallery, styles as primitiveStyles, type CheckoutFlow, type PreviewItem, type ReportIntent } from "./ReportPrimitives";

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
  const isStudioPro = report.studioEntitlement?.tier === "studio_pro";
  const remaining = isStudioPro
    ? 999
    : (report.studioEntitlement?.remainingGens ??
      (report.isPaid ? PRODUCT_COPY.report.studioGensIncluded : PRODUCT_COPY.free.studioGensPerMonth));
  const canUseStudio = report.isPaid ? (isStudioPro || remaining > 0) : remaining > 0;

  if (!canUseStudio) {
    return (
      <LockedSection
        title="AI Studio"
        body={report.isPaid ? "Report try-ons used up. Upgrade to Studio Pro for more generations." : lockedBody}
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

  if (!report.isPaid) {
    return (
      <>
        <Card title="AI Studio">
          <Text style={primitiveStyles.mutedText}>
            {remaining} free try-on{remaining === 1 ? "" : "s"} left this month — makeup and hair previews.
          </Text>
          <Pressable onPress={onOpenMakeupStudio} style={primitiveStyles.chatLaunchButton}>
            <Text style={primitiveStyles.chatLaunchButtonLabel}>Try makeup</Text>
          </Pressable>
          <Pressable onPress={onOpenHairStudio} style={primitiveStyles.secondaryButton}>
            <Text style={primitiveStyles.secondaryButtonLabel}>Try hair color</Text>
          </Pressable>
        </Card>
        <VisualGallery
          title="Saved looks"
          emptyLabel="Try a look above — saves appear here after generation."
          visuals={savedVisuals}
          onRemove={onRemoveSavedVisual}
          onPreview={onPreview}
          formatTime={formatSavedVisualTime}
        />
      </>
    );
  }

  return (
    <>
      <Card title="AI Studio">
        {!isStudioPro && report.isPaid ? (
          <Text style={primitiveStyles.mutedText}>
            {remaining} of {report.studioEntitlement?.cap ?? PRODUCT_COPY.report.studioGensIncluded} report try-ons remaining.
          </Text>
        ) : (
          <Text style={primitiveStyles.mutedText}>Start with mobile-safe Studio actions using your report photo.</Text>
        )}
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
        title="Saved looks"
        emptyLabel="Generate a look in Studio to see it here."
        visuals={savedVisuals}
        onRemove={onRemoveSavedVisual}
        onPreview={onPreview}
        formatTime={formatSavedVisualTime}
      />
    </>
  );
}
