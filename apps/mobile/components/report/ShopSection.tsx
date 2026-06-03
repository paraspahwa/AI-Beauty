import { Pressable, Text } from "react-native";
import { type MobileReport } from "@/lib/api";
import { Card, LockedSection, VisualGallery, styles as primitiveStyles, type CheckoutFlow, type PreviewItem, type ReportIntent } from "./ReportPrimitives";

export function ShopSection({
  report,
  lockedBody,
  preferredIntent,
  unlocking,
  awaitingBrowserCheckout,
  checkoutFlow,
  checkoutStatus,
  shareLoading,
  shareToken,
  onUnlock,
  onStudioPro,
  onRefresh,
  onOpenColorStudio,
  onOpenChat,
  onShare,
  onRevokeShare,
  onOpenPdf,
  onPreview,
}: {
  report: MobileReport;
  lockedBody: string;
  preferredIntent: ReportIntent | null;
  unlocking: boolean;
  awaitingBrowserCheckout: boolean;
  checkoutFlow: CheckoutFlow | null;
  checkoutStatus: string | null;
  shareLoading: boolean;
  shareToken: string | null;
  onUnlock: () => void;
  onStudioPro: () => void;
  onRefresh: () => void;
  onOpenColorStudio: () => void;
  onOpenChat: () => void;
  onShare: () => void;
  onRevokeShare: () => void;
  onOpenPdf: () => void;
  onPreview: (item: PreviewItem) => void;
}) {
  if (!report.isPaid) {
    return (
      <LockedSection
        title="Shop your look"
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
      <Card title="Style summary">
        <Text style={primitiveStyles.mutedText}>{report.summary ?? "Your premium summary will appear here once the report finishes compiling."}</Text>
      </Card>

      <VisualGallery
        title="Color swatches"
        assets={report.visualAssets?.assets?.colorSwatchPreviews}
        emptyText="Color swatches will appear here when the shopping visuals are ready."
        fallbackLabel="Color swatch"
        beforeImageUrl={report.imageUrl}
        onPreview={onPreview}
      />

      <Card title="Color swatch studio">
        <Text style={primitiveStyles.mutedText}>Generate or retry individual color swatch slots directly from your report palette.</Text>
        <Pressable onPress={onOpenColorStudio} style={primitiveStyles.chatLaunchButton}>
          <Text style={primitiveStyles.chatLaunchButtonLabel}>Open color swatch studio</Text>
        </Pressable>
      </Card>

      <Card title="Continue with chat">
        <Text style={primitiveStyles.mutedText}>Use the style consultant to ask follow-up questions about outfits, shopping choices, or how to use your palette.</Text>
        <Pressable onPress={onOpenChat} style={primitiveStyles.chatLaunchButton}>
          <Text style={primitiveStyles.chatLaunchButtonLabel}>Open style chat</Text>
        </Pressable>
      </Card>

      <Card title="Share and export">
        <Text style={primitiveStyles.mutedText}>Create a public report link to share with others, or open the web report to download the existing PDF export.</Text>
        <Pressable onPress={onShare} style={primitiveStyles.chatLaunchButton} disabled={shareLoading}>
          <Text style={primitiveStyles.chatLaunchButtonLabel}>{shareLoading ? "Preparing share..." : shareToken ? "Share public link" : "Create and share link"}</Text>
        </Pressable>
        {shareToken ? (
          <Pressable onPress={onRevokeShare} style={primitiveStyles.secondaryButton}>
            <Text style={primitiveStyles.secondaryButtonLabel}>Revoke public link</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onOpenPdf} style={primitiveStyles.secondaryButton}>
          <Text style={primitiveStyles.secondaryButtonLabel}>Open web report for PDF</Text>
        </Pressable>
      </Card>
    </>
  );
}
