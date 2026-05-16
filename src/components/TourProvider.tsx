"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOUR_KEY = "renovaara_tour_v1";
const TOOLTIP_WIDTH = 320;
const SCROLL_SETTLE_MS = 420;

// ─── Tour step definitions ─────────────────────────────────────────────────────

interface TourStep {
  target: string; // matches data-tour="<target>" on the element
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    target: "upload-cta",
    title: "Start with a selfie",
    body: "One photo unlocks your complete beauty report: face shape, colour season, skin routine, hairstyles, and spectacles guide.",
  },
  {
    target: "reports-list",
    title: "Your reports live here",
    body: "After each analysis, your full report is saved here. Access, share, or download your PDF anytime.",
  },
  {
    target: "style-chat",
    title: "Ask your AI stylist",
    body: "Have style questions? Chat with your AI consultant about colours, outfits, and more.",
  },
];

// ─── Geometry helpers ──────────────────────────────────────────────────────────

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPos {
  top?: number;
  bottom?: number;
  left: number;
  arrowLeft: number;
  arrowSide: "top" | "bottom";
}

function computePositions(el: HTMLElement, tooltipHeight: number): { spot: SpotRect; tooltip: TooltipPos } {
  const GAP = 14;
  const MARGIN = 12;
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spot: SpotRect = {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
  };

  // Horizontally center tooltip on the target, clamped to viewport
  let tooltipLeft = r.left + r.width / 2 - TOOLTIP_WIDTH / 2;
  tooltipLeft = Math.max(MARGIN, Math.min(tooltipLeft, vw - TOOLTIP_WIDTH - MARGIN));

  // Arrow horizontal position relative to tooltip box
  const arrowLeft = Math.max(20, Math.min(r.left + r.width / 2 - tooltipLeft, TOOLTIP_WIDTH - 20));

  const spaceBelow = vh - r.bottom;
  const spaceAbove = r.top;
  const placeBelow = spaceBelow >= tooltipHeight + GAP || spaceBelow >= spaceAbove;

  const tooltip: TooltipPos = placeBelow
    ? { top: r.bottom + GAP, left: tooltipLeft, arrowLeft, arrowSide: "top" }
    : { bottom: vh - r.top + GAP, left: tooltipLeft, arrowLeft, arrowSide: "bottom" };

  return { spot, tooltip };
}

// ─── Spotlight styles ──────────────────────────────────────────────────────────

const SPOTLIGHT_BOX_SHADOW =
  "0 0 0 9999px rgba(0,0,0,0.45), 0 0 0 4px #EC4899";

function applySpotlight(el: HTMLElement): () => void {
  const saved = {
    boxShadow: el.style.boxShadow,
    position: el.style.position,
    zIndex: el.style.zIndex,
    borderRadius: el.style.borderRadius,
  };
  el.style.boxShadow = SPOTLIGHT_BOX_SHADOW;
  el.style.position = "relative";
  el.style.zIndex = "9999";

  return () => {
    el.style.boxShadow = saved.boxShadow;
    el.style.position = saved.position;
    el.style.zIndex = saved.zIndex;
    el.style.borderRadius = saved.borderRadius;
  };
}

// ─── DashboardTour component ───────────────────────────────────────────────────

/**
 * Self-contained contextual tour for the dashboard.
 * Reads data-tour="<target>" attributes on DOM elements and highlights them
 * sequentially with a box-shadow spotlight and a floating tooltip card.
 *
 * Trigger: 800 ms after mount, only if localStorage key "renovaara_tour_v1"
 * is not already set.
 */
export function DashboardTour() {
  const [stepIndex, setStepIndex] = React.useState(-1); // -1 = inactive
  const [spot, setSpot] = React.useState<SpotRect | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<TooltipPos | null>(null);

  const cleanupSpotlight = React.useRef<(() => void) | null>(null);
  const scrollTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipEl = React.useRef<HTMLDivElement>(null);

  const isActive = stepIndex >= 0;

  // ── Core: focus a step ──────────────────────────────────────────────────────

  const applyStep = React.useCallback((index: number) => {
    const step = STEPS[index];
    if (!step) return;

    // Clear any in-flight scroll timer
    if (scrollTimer.current) clearTimeout(scrollTimer.current);

    // Remove previous spotlight immediately
    cleanupSpotlight.current?.();
    cleanupSpotlight.current = null;

    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      // Element not in DOM — hide tooltip for this step
      setSpot(null);
      setTooltipPos(null);
      return;
    }

    // Scroll into view, then apply spotlight after scroll settles
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    scrollTimer.current = setTimeout(() => {
      cleanupSpotlight.current = applySpotlight(el);

      const tooltipHeight = tooltipEl.current?.offsetHeight ?? 200;
      const { spot: s, tooltip } = computePositions(el, tooltipHeight);
      setSpot(s);
      setTooltipPos(tooltip);
    }, SCROLL_SETTLE_MS);
  }, []); // stable — only uses refs and state setters

  // ── Dismiss ─────────────────────────────────────────────────────────────────

  const dismiss = React.useCallback(() => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    cleanupSpotlight.current?.();
    cleanupSpotlight.current = null;
    setStepIndex(-1);
    setSpot(null);
    setTooltipPos(null);
    try {
      localStorage.setItem(TOUR_KEY, "done");
    } catch {
      // localStorage may be unavailable in some contexts
    }
  }, []);

  // ── Next step ───────────────────────────────────────────────────────────────

  const handleNext = React.useCallback(() => {
    const next = stepIndex + 1;
    if (next < STEPS.length) {
      setStepIndex(next);
      applyStep(next);
    } else {
      dismiss();
    }
  }, [stepIndex, applyStep, dismiss]);

  // ── Initial trigger: 800 ms after mount ─────────────────────────────────────

  React.useEffect(() => {
    try {
      if (localStorage.getItem(TOUR_KEY)) return;
    } catch {
      return; // no localStorage → skip tour
    }

    const t = setTimeout(() => {
      setStepIndex(0);
      applyStep(0);
    }, 800);

    return () => clearTimeout(t);
  }, [applyStep]);

  // ── ESC to dismiss ──────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, dismiss]);

  // ── Window resize: recalculate tooltip position ─────────────────────────────

  React.useEffect(() => {
    if (!isActive || stepIndex < 0) return;
    const step = STEPS[stepIndex];
    if (!step) return;

    const handleResize = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) return;
      const tooltipHeight = tooltipEl.current?.offsetHeight ?? 200;
      const { spot: s, tooltip } = computePositions(el, tooltipHeight);
      setSpot(s);
      setTooltipPos(tooltip);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [isActive, stepIndex]);

  // ── Unmount cleanup ─────────────────────────────────────────────────────────

  React.useEffect(() => {
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      cleanupSpotlight.current?.();
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isActive || !tooltipPos) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <AnimatePresence>
      {/* Invisible click-away layer — sits behind tooltip, above everything else */}
      <div
        key="tour-backdrop"
        className="fixed inset-0"
        style={{ zIndex: 9998, cursor: "default" }}
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Floating tooltip card */}
      <motion.div
        key={`tour-step-${stepIndex}`}
        ref={tooltipEl}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="false"
        aria-label={`Tour step ${stepIndex + 1} of ${STEPS.length}: ${step?.title ?? ""}`}
        style={{
          position: "fixed",
          zIndex: 10000,
          width: TOOLTIP_WIDTH,
          top: tooltipPos.top,
          bottom: tooltipPos.bottom,
          left: tooltipPos.left,
          background: "linear-gradient(145deg, #FFFFFF 0%, #FDF2F8 100%)",
          border: "1px solid rgba(236,72,153,0.2)",
          borderRadius: "1rem",
          boxShadow:
            "0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(236,72,153,0.08)",
          overflow: "visible",
        }}
        className="p-5"
      >
        {/* Arrow — points toward the highlighted element */}
        {tooltipPos.arrowSide === "top" && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -7,
              left: tooltipPos.arrowLeft,
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderBottom: "7px solid #FFFFFF",
              filter: "drop-shadow(0 -1px 1px rgba(236,72,153,0.12))",
            }}
          />
        )}
        {tooltipPos.arrowSide === "bottom" && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: -7,
              left: tooltipPos.arrowLeft,
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderTop: "7px solid #FDF2F8",
              filter: "drop-shadow(0 1px 1px rgba(236,72,153,0.12))",
            }}
          />
        )}

        {/* Header: step counter + close button */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(236,72,153,0.1)", color: "#EC4899" }}
          >
            {stepIndex + 1} of {STEPS.length}
          </span>
          <button
            onClick={dismiss}
            aria-label="Close tour"
            className="flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-pink-50"
            style={{ color: "rgba(61,12,30,0.38)" }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body copy */}
        {step && (
          <>
            <p className="font-semibold text-ink text-sm leading-snug mb-1.5">
              {step.title}
            </p>
            <p className="text-xs text-ink-stone leading-relaxed mb-4">
              {step.body}
            </p>
          </>
        )}

        {/* Footer: skip + next */}
        <div className="flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-xs text-ink-stone hover:text-ink transition-colors underline-offset-2 hover:underline"
          >
            Skip tour
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)",
              transition: "opacity 0.15s, transform 0.1s",
            }}
          >
            {isLast ? "Done" : "Next"}
            {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
