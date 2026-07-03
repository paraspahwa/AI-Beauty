import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { ensureInfographics, fetchReport } from "@/lib/api";
import { atelier } from "@/lib/theme";
import { bodyFont, displayFont } from "@/lib/theme-provider";
import { getReportJourneyHint } from "@web/lib/report/journey-hints";
import type { AnalysisInfographics, CompiledReport, ReportVisualAsset } from "@web/types/report";
import { NextStepHint } from "@/components/ui/NextStepHint";
import { FoilLabel } from "@/components/ui/FoilLabel";
import { FreePreviewTeaser } from "@/components/FreePreviewTeaser";
import { UnlockTeaserBanner } from "@/components/UnlockTeaserBanner";
import { AnalysisSectionCard } from "./AnalysisSectionCard";
import { FaceFeaturesSection } from "./FaceFeaturesSection";
import { PaywallSheet } from "./PaywallSheet";
import { PdfDownloadBar } from "./PdfDownloadBar";
import { StyleGuideSection } from "./StyleGuideSection";

type Props = {
  initialReport: CompiledReport;
  initialPaywallOpen?: boolean;
};

function infographicAssetMissing(asset?: ReportVisualAsset): boolean {
  return !asset || asset.status === "missing";
}

function infographicAssetPending(asset?: ReportVisualAsset): boolean {
  return !!asset && asset.status === "pending";
}

function pickFaceInfographic(isPaid: boolean, infographics?: AnalysisInfographics): ReportVisualAsset | undefined {
  const preview = infographics?.faceFeaturesPreview;
  const full = infographics?.faceFeatures;
  if (isPaid && full) {
    if (full.status === "ready" || full.status === "pending") return full;
    if (full.status === "failed" && preview) return preview;
  }
  return preview ?? full;
}

export function ReportLayout({ initialReport, initialPaywallOpen = false }: Props) {
  const [report, setReport] = useState(initialReport);
  const [paywallOpen, setPaywallOpen] = useState(initialPaywallOpen);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  const isPaid = report.isPaid;
  const isProcessing = report.status === "processing" || report.status === "pending";
  const infographics = report.visualAssets?.assets?.analysisInfographics;
  const faceInfographic = pickFaceInfographic(isPaid, infographics);
  const styleGuideInfographic = infographics?.styleGuide;

  const infographicPending =
    infographicAssetPending(faceInfographic) ||
    (isPaid && infographicAssetPending(infographics?.skin)) ||
    (isPaid && infographicAssetPending(infographics?.color)) ||
    (isPaid && infographicAssetPending(infographics?.hairstyle)) ||
    (isPaid && infographicAssetPending(infographics?.spectacles)) ||
    (isPaid && infographicAssetPending(infographics?.hairColor));

  const infographicMissing =
    infographicAssetMissing(infographics?.faceFeaturesPreview) ||
    (isPaid && infographicAssetMissing(infographics?.faceFeatures));

  const styleGuidePending = report.isStyleGuidePaid && infographicAssetPending(styleGuideInfographic);

  const journeyHint = useMemo(() => getReportJourneyHint(report), [report]);
  const highlightSection = journeyHint?.scrollToId?.replace("report-section-", "");

  const refresh = useCallback(async () => {
    const data = await fetchReport(report.id);
    setReport(data);
  }, [report.id]);

  useEffect(() => {
    if (!isProcessing && !infographicPending && !styleGuidePending) return;
    const interval = setInterval(() => void refresh(), 4000);
    return () => clearInterval(interval);
  }, [isProcessing, infographicPending, styleGuidePending, refresh]);

  const ensureKickoffRef = useRef(false);
  useEffect(() => {
    if (isProcessing || !infographicMissing || ensureKickoffRef.current) return;
    ensureKickoffRef.current = true;
    void ensureInfographics(report.id).catch(() => {
      ensureKickoffRef.current = false;
    });
  }, [isProcessing, infographicMissing, report.id]);

  const headerTitle = report.colorAnalysis?.season
    ? `Your ${report.colorAnalysis.season} Beauty Profile`
    : "Personal Beauty Profile";

  function scrollToSection(sectionId: string) {
    const y = sectionOffsets.current[sectionId];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }

  function onSectionLayout(id: string, y: number) {
    sectionOffsets.current[id] = y;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          // offsets captured via onLayout on children
        }}
        scrollEventThrottle={16}
      >
        <FoilLabel>Your Renovaara Report</FoilLabel>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        {report.summary ? <Text style={styles.summary}>{report.summary}</Text> : null}

        {isPaid ? (
          <PdfDownloadBar reportId={report.id} disabled={infographicPending} />
        ) : (
          <Pressable style={styles.unlockInline} onPress={() => setPaywallOpen(true)}>
            <Text style={styles.unlockInlineLabel}>Unlock full report →</Text>
          </Pressable>
        )}

        {paymentInitiated && !isPaid ? (
          <View style={styles.paymentWait}>
            <ActivityIndicator color={atelier.color.terracotta} />
            <Text style={styles.paymentWaitText}>Payment received — unlocking your report…</Text>
          </View>
        ) : null}

        {journeyHint && !paymentInitiated ? (
          <NextStepHint
            hint={journeyHint}
            onAction={() => setPaywallOpen(true)}
            onScrollTo={scrollToSection}
            style={styles.hint}
          />
        ) : null}

        <View onLayout={(e) => onSectionLayout("report-section-face", e.nativeEvent.layout.y)}>
          {report.faceShape ? (
            <FaceFeaturesSection
              asset={faceInfographic}
              isPaid={isPaid}
              highlighted={highlightSection === "face"}
            />
          ) : (
            <View style={styles.processing}>
              <ActivityIndicator color={atelier.color.terracotta} />
              <Text style={styles.body}>Analysis in progress…</Text>
            </View>
          )}
        </View>

        {!isPaid ? (
          <>
            <UnlockTeaserBanner
              hints={{
                season: report.colorAnalysis?.season,
                faceShape: report.faceShape?.shape,
              }}
            />
            <FreePreviewTeaser colorAnalysis={report.colorAnalysis} summary={report.summary} teaserOnly />
          </>
        ) : (
          <>
            {report.skinAnalysis ? (
              <View onLayout={(e) => onSectionLayout("report-section-skin", e.nativeEvent.layout.y)}>
                <AnalysisSectionCard
                  reportId={report.id}
                  section="skin"
                  chapterLabel="Chapter II"
                  title="Skin Analysis"
                  description="Your skin type, zones, and AM/PM routine — illustrated as a consultant-style board."
                  asset={infographics?.skin}
                  highlighted={highlightSection === "skin"}
                  onRefresh={refresh}
                />
              </View>
            ) : null}
            {report.colorAnalysis ? (
              <View onLayout={(e) => onSectionLayout("report-section-color", e.nativeEvent.layout.y)}>
                <AnalysisSectionCard
                  reportId={report.id}
                  section="color"
                  chapterLabel="Chapter III"
                  title="Colour Analysis"
                  description="Your seasonal palette and metal tones in one illustrated board."
                  asset={infographics?.color}
                  highlighted={highlightSection === "color"}
                  onRefresh={refresh}
                />
              </View>
            ) : null}
            {report.hairstyle ? (
              <View onLayout={(e) => onSectionLayout("report-section-hairstyle", e.nativeEvent.layout.y)}>
                <AnalysisSectionCard
                  reportId={report.id}
                  section="hairstyle"
                  chapterLabel="Chapter IV"
                  title="Hairstyle Guide"
                  description="Cuts and lengths matched to your face shape."
                  asset={infographics?.hairstyle}
                  highlighted={highlightSection === "hairstyle"}
                  onRefresh={refresh}
                />
              </View>
            ) : null}
            {report.hairstyle && report.colorAnalysis ? (
              <View onLayout={(e) => onSectionLayout("report-section-hairColor", e.nativeEvent.layout.y)}>
                <AnalysisSectionCard
                  reportId={report.id}
                  section="hairColor"
                  chapterLabel="Chapter V"
                  title="Hair Colour"
                  description="Flattering shade directions for your complexion."
                  asset={infographics?.hairColor}
                  highlighted={highlightSection === "hairColor"}
                  onRefresh={refresh}
                />
              </View>
            ) : null}
            {report.glasses ? (
              <View onLayout={(e) => onSectionLayout("report-section-spectacles", e.nativeEvent.layout.y)}>
                <AnalysisSectionCard
                  reportId={report.id}
                  section="spectacles"
                  chapterLabel="Chapter VI"
                  title="Spectacles Guide"
                  description="Frame shape and colour recommendations tailored to your features."
                  asset={infographics?.spectacles}
                  highlighted={highlightSection === "spectacles"}
                  onRefresh={refresh}
                />
              </View>
            ) : null}
            <View onLayout={(e) => onSectionLayout("report-section-style-guide", e.nativeEvent.layout.y)}>
              <StyleGuideSection report={report} onRefresh={refresh} />
            </View>
          </>
        )}
      </ScrollView>

      {!isPaid ? (
        <View style={styles.stickyBar}>
          <Pressable style={styles.stickyButton} onPress={() => setPaywallOpen(true)}>
            <Text style={styles.stickyLabel}>Unlock now — ₹299</Text>
          </Pressable>
        </View>
      ) : null}

      <PaywallSheet
        reportId={report.id}
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onUnlocked={() => {
          setPaymentInitiated(true);
          setPaywallOpen(false);
          void refresh();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: atelier.color.parchment },
  scroll: { padding: atelier.space.md, paddingBottom: 120, gap: atelier.space.sm },
  headerTitle: { ...displayFont(), ...atelier.type.h1, marginTop: atelier.space.sm },
  summary: { ...bodyFont(), marginTop: atelier.space.sm },
  hint: { marginVertical: atelier.space.md },
  processing: { alignItems: "center", padding: atelier.space.xl, gap: atelier.space.sm },
  body: { ...bodyFont() },
  paymentWait: { alignItems: "center", gap: atelier.space.sm, padding: atelier.space.lg },
  paymentWaitText: { ...bodyFont(), fontFamily: atelier.font.bodySemibold },
  unlockInline: { marginVertical: atelier.space.sm },
  unlockInlineLabel: { ...bodyFont(), color: atelier.color.terracotta, fontFamily: atelier.font.bodySemibold },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: atelier.space.md,
    backgroundColor: `${atelier.color.parchment}ee`,
    borderTopWidth: 1,
    borderTopColor: atelier.color.border,
  },
  stickyButton: {
    backgroundColor: atelier.color.espresso,
    borderRadius: atelier.radius.full,
    paddingVertical: 16,
    alignItems: "center",
  },
  stickyLabel: { ...bodyFont(), color: atelier.color.btnFg, fontFamily: atelier.font.bodySemibold, fontSize: 16 },
});
