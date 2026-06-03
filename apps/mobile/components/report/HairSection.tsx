import { View, Text, Pressable } from "react-native";
import { type MobileReport } from "@/lib/api";
import { Card, EmptyCard, LockedSection, VisualGallery, styles as primitiveStyles, type CheckoutFlow, type PreviewItem, type ReportIntent } from "./ReportPrimitives";

export function HairSection({
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
        title="Hairstyle guide"
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
      {report.hairstyle ? (
        <Card title="Hairstyle guide">
          {report.hairstyle.styles?.slice(0, 3).map((item) => (
            <View key={item.name} style={primitiveStyles.inlineSection}>
              <Text style={primitiveStyles.bodyText}>{item.name}</Text>
              <Text style={primitiveStyles.mutedText}>{item.description}</Text>
            </View>
          ))}
          {report.hairstyle.colors?.slice(0, 3).map((item) => (
            <Text key={`${item.name}-${item.description ?? item.hex ?? ""}`} style={primitiveStyles.mutedText}>{item.name}: {item.description ?? item.hex ?? ""}</Text>
          ))}
          {report.hairstyle.avoid?.length ? <Text style={primitiveStyles.mutedText}>Avoid: {report.hairstyle.avoid.join(", ")}</Text> : null}
        </Card>
      ) : (
        <EmptyCard text="Hairstyle guidance is not available yet for this report." />
      )}

      <VisualGallery
        title="Hairstyle previews"
        assets={report.visualAssets?.assets?.hairstylePreviews}
        emptyText="Hairstyle previews will appear here when the visual assets are ready."
        fallbackLabel="Hairstyle preview"
        beforeImageUrl={report.imageUrl}
        onPreview={onPreview}
      />

      <Card title="Hair actions">
        <Text style={primitiveStyles.mutedText}>Open the mobile hair color studio using your report photo.</Text>
        <Pressable onPress={onOpenStudio} style={primitiveStyles.chatLaunchButton}>
          <Text style={primitiveStyles.chatLaunchButtonLabel}>Open hair color studio</Text>
        </Pressable>
      </Card>
    </>
  );
}
