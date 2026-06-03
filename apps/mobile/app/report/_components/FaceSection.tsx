import { View, Text } from "react-native";
import { type MobileReport } from "@/lib/api";
import { Card, EmptyCard, VisualAssetCard, styles as primitiveStyles, type PreviewItem } from "./ReportPrimitives";

export function FaceSection({
  report,
  faceLandmarkLabels,
  onPreview,
}: {
  report: MobileReport;
  faceLandmarkLabels: string[];
  onPreview: (item: PreviewItem) => void;
}) {
  return (
    <>
      {report.faceShape ? (
        <Card title="Face shape">
          <Text style={primitiveStyles.bodyText}>{report.faceShape.shape}</Text>
          <Text style={primitiveStyles.mutedText}>{report.faceShape.traits.join(", ")}</Text>
        </Card>
      ) : null}

      {report.colorAnalysis ? (
        <Card title="Color analysis">
          <Text style={primitiveStyles.bodyText}>{report.colorAnalysis.season}</Text>
          <Text style={primitiveStyles.mutedText}>Undertone: {report.colorAnalysis.undertone}</Text>
          <Text style={primitiveStyles.mutedText}>{report.colorAnalysis.description}</Text>
          {report.colorAnalysis.metals?.length ? (
            <Text style={primitiveStyles.mutedText}>Best metals: {report.colorAnalysis.metals.join(", ")}</Text>
          ) : null}
          {report.colorAnalysis.palette?.length ? (
            <View style={primitiveStyles.swatchRow}>
              {report.colorAnalysis.palette.slice(0, 6).map((item) => (
                <View key={`${item.name}-${item.hex}`} style={primitiveStyles.swatchCard}>
                  <View style={[primitiveStyles.swatchCircle, { backgroundColor: item.hex }]} />
                  <Text style={primitiveStyles.swatchLabel}>{item.name}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {report.features ? (
        <Card title="Feature breakdown">
          {Object.entries(report.features).map(([key, value]) => {
            if (!value || typeof value !== "object") return null;
            const feature = value as { shape?: string; notes?: string };
            return (
              <View key={key} style={primitiveStyles.inlineSection}>
                <Text style={primitiveStyles.bodyText}>{key.replace(/^./, (char) => char.toUpperCase())}: {feature.shape ?? ""}</Text>
                {feature.notes ? <Text style={primitiveStyles.mutedText}>{feature.notes}</Text> : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      {faceLandmarkLabels.length ? (
        <Card title="Landmarks detected">
          <View style={primitiveStyles.tagRow}>
            {faceLandmarkLabels.map((label) => (
              <View key={label} style={primitiveStyles.tag}>
                <Text style={primitiveStyles.tagLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <VisualAssetCard
        title="Face overlay"
        asset={report.visualAssets?.assets?.landmarkOverlay}
        emptyText="Landmark overlay will appear here when the visual asset is ready."
        beforeImageUrl={report.imageUrl}
        onPreview={onPreview}
      />

      <VisualAssetCard
        title="Palette board"
        asset={report.visualAssets?.assets?.paletteBoard}
        emptyText="Palette board will appear here when your color visual is ready."
        beforeImageUrl={report.imageUrl}
        onPreview={onPreview}
      />

      {!report.visualAssets?.assets?.landmarkOverlay && !report.visualAssets?.assets?.paletteBoard ? (
        <EmptyCard text="Additional report visuals are still processing or were not generated for this report." />
      ) : null}
    </>
  );
}
