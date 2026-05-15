import React from "react";
import Image from "next/image";
import type { DoAvoidGuidanceBlock } from "@/types/doAvoidGuidance";
import { track } from "@/lib/track";

interface DoAvoidGuidanceCardProps {
  block: DoAvoidGuidanceBlock;
  /** Extra context for analytics — defaults to "homepage" */
  location?: string;
}

export function DoAvoidGuidanceCard({ block, location = "homepage" }: DoAvoidGuidanceCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  function handleExpand() {
    if (!expanded) {
      track("do_avoid_category_expand", { category: block.category, location });
    }
    setExpanded((v) => !v);
  }

  return (
    <section className="rounded-2xl border bg-white/90 shadow-card p-4 sm:p-6 mb-6">
      <button
        onClick={handleExpand}
        className="w-full text-left flex items-center justify-between gap-2 mb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta rounded-lg"
      >
        <h3 className="text-lg font-bold capitalize">{block.category}</h3>
        <span className="text-ink-stone text-sm select-none">{expanded ? "▲" : "▼"}</span>
      </button>

      {block.summary && <p className="mb-3 text-ink-stone text-sm">{block.summary}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* DO column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex w-5 h-5 bg-green-500 rounded-full text-white items-center justify-center font-bold text-xs">✓</span>
            <span className="font-semibold text-green-700">Do</span>
          </div>
          <ul className="space-y-3">
            {block.do.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                {item.image && (
                  <div className="relative w-16 h-20 shrink-0 rounded-lg overflow-hidden border border-green-100">
                    <Image src={item.image} alt={item.label} fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <div>
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.rationale && <div className="text-xs text-ink-stone mt-0.5">{item.rationale}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* AVOID column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex w-5 h-5 bg-red-500 rounded-full text-white items-center justify-center font-bold text-xs">✗</span>
            <span className="font-semibold text-red-700">Avoid</span>
          </div>
          <ul className="space-y-3">
            {block.avoid.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                {item.image && (
                  <div className={`relative w-16 h-20 shrink-0 rounded-lg overflow-hidden border border-red-100 ${expanded ? "" : "opacity-60 grayscale"}`}>
                    <Image src={item.image} alt={item.label} fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <div>
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.rationale && <div className="text-xs text-ink-stone mt-0.5">{item.rationale}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {block.cta && (
        <div className="mt-5 text-center">
          <button
            onClick={handleExpand}
            className="rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-opacity hover:opacity-80"
            style={{ background: "linear-gradient(135deg,#EC4899,#8B5CF6)", color: "#fff" }}
          >
            {expanded ? "Show less" : block.cta}
          </button>
        </div>
      )}
    </section>
  );
}
