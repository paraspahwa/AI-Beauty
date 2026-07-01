"use client";

import * as React from "react";
import Image from "next/image";

interface Props {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  /** Play one-time auto-sweep on first mount. */
  autoSweep?: boolean;
}

export function BeforeAfterReveal({
  beforeUrl,
  afterUrl,
  beforeLabel = "Before",
  afterLabel = "After",
  className = "",
  autoSweep = true,
}: Props) {
  const [position, setPosition] = React.useState(50);
  const [hintVisible, setHintVisible] = React.useState(autoSweep);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);
  const swept = React.useRef(false);

  const updateFromClientX = React.useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
    setHintVisible(false);
  }, []);

  React.useEffect(() => {
    if (!autoSweep || swept.current) return;
    swept.current = true;
    let frame: number;
    let start: number | null = null;
    const delay = setTimeout(() => {
      const animate = (ts: number) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / 1400, 1);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        // 0 → 70 → 50
        const pos = progress < 0.6 ? eased / 0.6 * 70 : 70 - ((progress - 0.6) / 0.4) * 20;
        setPosition(pos);
        if (progress < 1) frame = requestAnimationFrame(animate);
        else setTimeout(() => setHintVisible(false), 2000);
      };
      frame = requestAnimationFrame(animate);
    }, 400);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(frame);
    };
  }, [autoSweep]);

  React.useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragging.current) return;
      updateFromClientX(e.clientX);
    }
    function onUp() {
      dragging.current = false;
    }
    function onKey(e: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== containerRef.current) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPosition((p) => Math.max(0, p - 5));
        setHintVisible(false);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPosition((p) => Math.min(100, p + 5));
        setHintVisible(false);
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [updateFromClientX]);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        role="slider"
        aria-label="Before and after comparison"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        className="relative overflow-hidden rounded-2xl select-none touch-none outline-none focus-visible:ring-2 focus-visible:ring-terracotta/30"
        style={{ aspectRatio: "3/4", boxShadow: "0 6px 32px rgba(61,43,31,0.15)" }}
        onPointerDown={(e) => {
          dragging.current = true;
          updateFromClientX(e.clientX);
        }}
      >
        <Image src={afterUrl} alt={afterLabel} fill unoptimized className="object-cover" />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <div className="relative h-full w-full" style={{ width: containerRef.current?.offsetWidth ?? "100%" }}>
            <Image src={beforeUrl} alt={beforeLabel} fill unoptimized className="object-cover" />
          </div>
        </div>
        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 cursor-ew-resize"
          style={{ left: `${position}%`, background: "#fff", boxShadow: "0 0 8px rgba(0,0,0,0.35)" }}
        >
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
          >
            <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>⇔</span>
          </div>
        </div>
        <span className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>
          {beforeLabel}
        </span>
        <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ background: "rgba(17,24,39,0.85)", color: "#fff" }}>
          {afterLabel}
        </span>
      </div>
      {hintVisible ? (
        <p className="mt-2 text-center text-xs" style={{ color: "var(--rose-gold)" }}>
          Drag to compare
        </p>
      ) : null}
    </div>
  );
}
