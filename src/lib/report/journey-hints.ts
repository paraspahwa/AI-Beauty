import { getBlueprintSection } from "@/lib/ai/infographic-sections";
import type { ManualPaidInfographicSection } from "@/lib/ai/infographic-sections";
import type { CompiledReport, ReportVisualAsset } from "@/types/report";

export type JourneyHintTone = "info" | "action" | "success" | "waiting";

export type JourneyHint = {
  id: string;
  step?: string;
  title: string;
  body: string;
  tone: JourneyHintTone;
  ctaLabel?: string;
  href?: string;
  scrollToId?: string;
  action?: "paywall";
};

function isReady(asset?: ReportVisualAsset): boolean {
  return asset?.status === "ready";
}

function isPending(asset?: ReportVisualAsset): boolean {
  return asset?.status === "pending";
}

export function sectionDomId(section: string): string {
  return `report-section-${section}`;
}

export function availableManualSections(report: CompiledReport): ManualPaidInfographicSection[] {
  const sections: ManualPaidInfographicSection[] = [];
  if (report.skinAnalysis) sections.push("skin");
  if (report.colorAnalysis) sections.push("color");
  if (report.hairstyle) sections.push("hairstyle");
  if (report.hairstyle && report.colorAnalysis) sections.push("hairColor");
  if (report.glasses) sections.push("spectacles");
  return sections;
}

function firstIncompleteManual(
  report: CompiledReport,
): { section: ManualPaidInfographicSection; index: number; total: number } | null {
  const sections = availableManualSections(report);
  const ig = report.visualAssets?.assets?.analysisInfographics;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const asset = ig?.[section];
    if (!isReady(asset) && !isPending(asset)) {
      return { section, index: i + 1, total: sections.length };
    }
  }
  return null;
}

export function getReportJourneyHint(report: CompiledReport): JourneyHint | null {
  const ig = report.visualAssets?.assets?.analysisInfographics;

  if (report.status === "processing" || report.status === "pending") {
    return {
      id: "analyzing",
      step: "Step 1 of 3",
      title: "Analysing your selfie",
      body: "We're reading your face shape, colour season, skin, and styling profile. This page refreshes automatically — usually under a minute.",
      tone: "waiting",
    };
  }

  if (report.status === "failed") {
    return {
      id: "failed",
      title: "Analysis didn't finish",
      body: "Try a new selfie with natural light, face centred, and eyes open.",
      tone: "action",
      ctaLabel: "Start a new analysis",
      href: "/upload",
    };
  }

  if (!report.isPaid) {
    const previewReady = isReady(ig?.faceFeaturesPreview);
    const previewPending = isPending(ig?.faceFeaturesPreview);

    if (previewPending || (!previewReady && !ig?.faceFeaturesPreview)) {
      return {
        id: "preview-wait",
        step: "Step 1 of 3",
        title: "Your free face-shape board is generating",
        body: "Once it appears below, review your shape — then unlock the full dossier for Skin, Colour, Hairstyle, and more.",
        tone: "waiting",
        scrollToId: sectionDomId("face"),
      };
    }

    return {
      id: "unlock",
      step: "Step 2 of 3",
      title: "Next: unlock your full beauty dossier",
      body: "You've seen your face shape. Unlock to generate illustrated boards for every chapter — one tap each, saved to your Vault.",
      tone: "action",
      ctaLabel: "Unlock full report",
      action: "paywall",
    };
  }

  const facePending = isPending(ig?.faceFeatures);
  const faceReady = isReady(ig?.faceFeatures);

  if (!faceReady && (facePending || !ig?.faceFeatures || ig?.faceFeatures?.status === "missing")) {
    return {
      id: "face-auto",
      step: "Step 1 of 3",
      title: "Creating your full face features board",
      body: "This generates automatically after unlock. The rest of your chapters are ready when you tap Generate on each one.",
      tone: "waiting",
      scrollToId: sectionDomId("face"),
    };
  }

  const nextManual = firstIncompleteManual(report);
  if (nextManual) {
    const label = getBlueprintSection(nextManual.section)?.label ?? nextManual.section;
    return {
      id: "generate-chapter",
      step: `Chapter ${nextManual.index} of ${nextManual.total}`,
      title: "Next: generate your illustrated board",
      body: `Tap Generate on ${label} below. Each board is saved to your Vault as soon as it's ready.`,
      tone: "action",
      ctaLabel: `Go to ${label}`,
      scrollToId: sectionDomId(nextManual.section),
    };
  }

  const anyManualPending = availableManualSections(report).some((s) => isPending(ig?.[s]));
  if (anyManualPending) {
    return {
      id: "boards-creating",
      title: "Your boards are being illustrated",
      body: "Sit tight — this page updates automatically. Download each chapter when it shows In Vault.",
      tone: "waiting",
    };
  }

  if (!report.isStyleGuidePaid) {
    return {
      id: "style-guide-offer",
      step: "Optional",
      title: "Add a Personal Style Board",
      body: "Upload a full-body photo, unlock the add-on, and we'll illustrate your wardrobe direction — separate from your face selfie.",
      tone: "info",
      scrollToId: sectionDomId("style-guide"),
    };
  }

  if (report.isStyleGuidePaid && report.bodyImageUploaded) {
    const sg = ig?.styleGuide;
    if (!sg || sg.status === "missing" || sg.status === "pending") {
      return {
        id: "style-guide-wait",
        title: "Style Board in progress",
        body: "We're analysing your full-body photo and illustrating your board.",
        tone: "waiting",
        scrollToId: sectionDomId("style-guide"),
      };
    }
  }

  return {
    id: "complete",
    title: "You're all caught up",
    body: "Download boards from each chapter or open your Vault for every image and PDF in one place.",
    tone: "success",
    ctaLabel: "Open Vault",
    href: "/vault",
  };
}

export type DashboardReportHint = {
  label: string;
  detail?: string;
};

export function getDashboardReportHint(row: {
  status: string;
  is_paid: boolean;
  hasPremium: boolean;
}): DashboardReportHint {
  if (row.status === "processing" || row.status === "pending") {
    return { label: "Analysis running", detail: "Open report to watch progress" };
  }
  if (row.status === "failed" || row.status === "error") {
    return { label: "Analysis failed", detail: "Upload a new selfie" };
  }
  if (!row.hasPremium) {
    return { label: "Preview ready", detail: "Next: unlock full report" };
  }
  return { label: "Unlocked", detail: "Next: generate chapter boards" };
}

export function getVaultJourneyHint(counts: {
  all: number;
  uploads: number;
  analysis: number;
}): JourneyHint | null {
  if (counts.all === 0) return null;
  if (counts.uploads > 0 && counts.analysis === 0) {
    return {
      id: "vault-no-boards",
      title: "No illustrated boards yet",
      body: "Open your report, unlock if needed, then tap Generate on each chapter. Finished boards appear here automatically.",
      tone: "action",
      ctaLabel: "Open latest report",
      href: "/report/latest",
    };
  }
  if (counts.analysis > 0) {
    return {
      id: "vault-tip",
      title: "Keep permanent copies",
      body: "Signed links expire — use Download on each item or from your report chapters.",
      tone: "info",
    };
  }
  return null;
}

export type JourneyReportSnapshot = {
  id: string;
  status: string;
  is_paid: boolean;
};

export type JourneyUserSnapshot = {
  authenticated: boolean;
  latestReport?: JourneyReportSnapshot | null;
};

export function getNavJourneyHint(snapshot: JourneyUserSnapshot): JourneyHint | null {
  if (!snapshot.authenticated) {
    return {
      id: "nav-guest",
      title: "Free face-shape preview",
      body: "",
      tone: "action",
      ctaLabel: "Upload selfie",
      href: "/upload",
    };
  }

  const report = snapshot.latestReport;
  if (!report) {
    return {
      id: "nav-first-upload",
      title: "Upload your first selfie",
      body: "",
      tone: "action",
      ctaLabel: "Start analysis",
      href: "/upload",
    };
  }

  if (report.status === "processing" || report.status === "pending") {
    return {
      id: "nav-processing",
      title: "Analysis in progress",
      body: "",
      tone: "waiting",
      ctaLabel: "View report",
      href: `/report/${report.id}`,
    };
  }

  if (report.status === "failed" || report.status === "error") {
    return {
      id: "nav-failed",
      title: "Try a new selfie",
      body: "",
      tone: "action",
      ctaLabel: "Upload again",
      href: "/upload",
    };
  }

  if (!report.is_paid) {
    return {
      id: "nav-unlock",
      title: "Unlock your full dossier",
      body: "",
      tone: "action",
      ctaLabel: "Open report",
      href: `/report/${report.id}`,
    };
  }

  return {
    id: "nav-continue",
    title: "Generate your chapter boards",
    body: "",
    tone: "action",
    ctaLabel: "Continue report",
    href: `/report/${report.id}`,
  };
}

export function getLandingJourneyHint(snapshot: JourneyUserSnapshot): JourneyHint | null {
  if (!snapshot.authenticated) return null;

  const report = snapshot.latestReport;
  if (!report) {
    return {
      id: "landing-welcome-back",
      step: "Welcome back",
      title: "Ready for your first analysis?",
      body: "Upload one selfie in natural light — your free face-shape board generates automatically, no card required.",
      tone: "action",
      ctaLabel: "Upload selfie",
      href: "/upload",
    };
  }

  if (report.status === "processing" || report.status === "pending") {
    return {
      id: "landing-processing",
      step: "In progress",
      title: "Your analysis is running",
      body: "Open your report to watch your face-shape preview appear — usually under a minute.",
      tone: "waiting",
      ctaLabel: "Open report",
      href: `/report/${report.id}`,
    };
  }

  if (report.status === "failed" || report.status === "error") {
    return {
      id: "landing-failed",
      title: "Last analysis didn't finish",
      body: "Try a clearer selfie with natural light, then we'll rebuild your preview board.",
      tone: "action",
      ctaLabel: "Upload new selfie",
      href: "/upload",
    };
  }

  if (!report.is_paid) {
    return {
      id: "landing-unlock",
      step: "Step 2 of 3",
      title: "Your preview is ready — unlock the full dossier",
      body: "Six illustrated chapters await: skin, colour, hairstyle, hair colour, spectacles, and more.",
      tone: "action",
      ctaLabel: "Open report & unlock",
      href: `/report/${report.id}`,
    };
  }

  return {
    id: "landing-continue",
    step: "Pick up where you left off",
    title: "Generate your illustrated chapters",
    body: "Tap Generate on each section — boards save to your Vault as they finish. Optional Style Board add-on when you're ready.",
    tone: "action",
    ctaLabel: "Continue report",
    href: `/report/${report.id}`,
  };
}

export function shouldShowNavJourneyHint(pathname: string, hint: JourneyHint | null, authenticated: boolean): boolean {
  if (!hint) return false;
  if (pathname === "/auth") return false;
  if (!authenticated && pathname === "/") return false;
  if (hint.id === "nav-first-upload" && pathname === "/upload") return false;
  if (
    (hint.id === "nav-processing" || hint.id === "nav-unlock" || hint.id === "nav-continue") &&
    pathname.startsWith("/report/")
  ) {
    return false;
  }
  return true;
}
