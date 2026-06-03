import { Text } from "react-native";
import { type MobileReport } from "@/lib/api";
import { Card, EmptyCard, LockedSection, styles as primitiveStyles, type CheckoutFlow, type ReportIntent } from "./ReportPrimitives";

export function SkinSection({
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
}) {
  if (!report.isPaid) {
    return (
      <LockedSection
        title="Skin analysis"
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

  if (!report.skinAnalysis) {
    return <EmptyCard text="Skin analysis is not available yet for this report." />;
  }

  return (
    <Card title="Skin analysis">
      <Text style={primitiveStyles.bodyText}>Skin type: {report.skinAnalysis.type}</Text>
      {report.skinAnalysis.concerns?.length ? (
        <Text style={primitiveStyles.mutedText}>Concerns: {report.skinAnalysis.concerns.map((item) => item.label).join(", ")}</Text>
      ) : null}
      {report.skinAnalysis.zones?.length ? (
        <Text style={primitiveStyles.mutedText}>Zones: {report.skinAnalysis.zones.map((item) => `${item.zone} (${item.observation})`).join(" • ")}</Text>
      ) : null}
    </Card>
  );
}
