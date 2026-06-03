import { View, Text, Pressable } from "react-native";
import { type MobileReport } from "@/lib/api";
import { Card, EmptyCard, LockedSection, VisualGallery, styles as primitiveStyles, type CheckoutFlow, type PreviewItem, type ReportIntent } from "./ReportPrimitives";

export function GlassesSection({
  report,
  lockedBody,
  preferredIntent,
  unlocking,
  awaitingBrowserCheckout,
  checkoutFlow,
  checkoutStatus,
  onUnlock,
  onStudioPro,
  onRefresh,
  onOpenStudio,
  onPreview,
}: {
  report: MobileReport;
  lockedBody: string;
  preferredIntent: ReportIntent | null;
  unlocking: boolean;
  awaitingBrowserCheckout: boolean;
  checkoutFlow: CheckoutFlow | null;
  checkoutStatus: string | null;
  onUnlock: () => void;
  onStudioPro: () => void;
  onRefresh: () => void;
  onOpenStudio: () => void;
  onPreview: (item: PreviewItem) => void;
}) {
  if (!report.isPaid) {
    return (
      <LockedSection
        title="Glasses guide"
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
      {report.glasses ? (
        <Card title="Glasses guide">
          {report.glasses.goals?.length ? <Text style={primitiveStyles.mutedText}>Goals: {report.glasses.goals.join(", ")}</Text> : null}
          {report.glasses.recommended?.slice(0, 4).map((item) => (
            <View key={item.style} style={primitiveStyles.inlineSection}>
              <Text style={primitiveStyles.bodyText}>{item.style}</Text>
              <Text style={primitiveStyles.mutedText}>{item.reason}</Text>
            </View>
          ))}
          {report.glasses.fitTips?.length ? <Text style={primitiveStyles.mutedText}>Fit tips: {report.glasses.fitTips.join(" • ")}</Text> : null}
        </Card>
      ) : (
        <EmptyCard text="Glasses guidance is not available yet for this report." />
      )}

      <Card title="Glasses actions">
        <Text style={primitiveStyles.mutedText}>Upload a glasses reference image and generate a try-on preview using your report photo.</Text>
        <Pressable onPress={onOpenStudio} style={primitiveStyles.chatLaunchButton}>
          <Text style={primitiveStyles.chatLaunchButtonLabel}>Open glasses studio</Text>
        </Pressable>
      </Card>

      <VisualGallery
        title="Glasses previews"
        assets={report.visualAssets?.assets?.glassesPreviews}
        emptyText="Glasses previews will appear here when the visual assets are ready."
        fallbackLabel="Glasses preview"
        beforeImageUrl={report.imageUrl}
        onPreview={onPreview}
      />
    </>
  );
}
