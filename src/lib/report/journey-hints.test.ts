import { describe, expect, it } from "vitest";
import { getReportJourneyHint, getNavJourneyHint, getLandingJourneyHint, shouldShowNavJourneyHint } from "./journey-hints";
import type { CompiledReport } from "@/types/report";

const baseReport: CompiledReport = {
  id: "r1",
  userId: "u1",
  imageUrl: "",
  status: "ready",
  isPaid: false,
  createdAt: "2026-01-15T00:00:00Z",
  faceShape: { shape: "Oval", traits: [], confidence: 0.9 },
  skinAnalysis: { type: "Normal", concerns: [], routine: { am: [], pm: [] }, description: "" },
  colorAnalysis: {
    season: "Soft Autumn",
    undertone: "Warm",
    description: "",
    palette: [],
    metals: [],
    avoidColors: [],
  },
  hairstyle: { styles: [], lengths: [], colors: [], avoid: [] },
  glasses: { recommended: [], avoid: [], fitTips: [] },
};

describe("getReportJourneyHint", () => {
  it("prompts unlock when preview is ready", () => {
    const hint = getReportJourneyHint({
      ...baseReport,
      visualAssets: {
        version: 1,
        bucket: "selfies",
        basePath: "u1/r1/",
        assets: {
          analysisInfographics: {
            faceFeaturesPreview: { path: "x", status: "ready", mime: "image/png" },
          },
        },
      },
    });
    expect(hint?.id).toBe("unlock");
    expect(hint?.action).toBe("paywall");
  });

  it("points to next manual chapter when paid", () => {
    const hint = getReportJourneyHint({
      ...baseReport,
      isPaid: true,
      visualAssets: {
        version: 1,
        bucket: "selfies",
        basePath: "u1/r1/",
        assets: {
          analysisInfographics: {
            faceFeatures: { path: "x", status: "ready", mime: "image/png" },
          },
        },
      },
    });
    expect(hint?.id).toBe("generate-chapter");
    expect(hint?.scrollToId).toBe("report-section-skin");
  });
});

describe("getNavJourneyHint", () => {
  it("guides guests to upload", () => {
    const hint = getNavJourneyHint({ authenticated: false });
    expect(hint?.href).toBe("/upload");
  });

  it("points paid users to their report", () => {
    const hint = getNavJourneyHint({
      authenticated: true,
      latestReport: { id: "r1", status: "ready", is_paid: true },
    });
    expect(hint?.href).toBe("/report/r1");
    expect(hint?.id).toBe("nav-continue");
  });
});

describe("getLandingJourneyHint", () => {
  it("returns null for guests", () => {
    expect(getLandingJourneyHint({ authenticated: false })).toBeNull();
  });

  it("welcomes back users without reports", () => {
    const hint = getLandingJourneyHint({ authenticated: true, latestReport: null });
    expect(hint?.id).toBe("landing-welcome-back");
    expect(hint?.href).toBe("/upload");
  });
});

describe("shouldShowNavJourneyHint", () => {
  it("hides guest hint on home", () => {
    const hint = getNavJourneyHint({ authenticated: false });
    expect(shouldShowNavJourneyHint("/", hint, false)).toBe(false);
  });

  it("hides report hint when already on report", () => {
    const hint = getNavJourneyHint({
      authenticated: true,
      latestReport: { id: "r1", status: "ready", is_paid: false },
    });
    expect(shouldShowNavJourneyHint("/report/r1", hint, true)).toBe(false);
  });
});
