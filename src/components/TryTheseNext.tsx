"use client";

import { Loader2, Sparkles } from "lucide-react";

export interface TryNextPreset {
  id: string;
  label: string;
  mode: "makeup" | "hair";
  variant: string;
}

interface Props {
  presets: TryNextPreset[];
  onSelect: (preset: TryNextPreset) => void;
  loading?: boolean;
  disabled?: boolean;
  activeId?: string | null;
  loadingId?: string | null;
}

export function TryTheseNext({ presets, onSelect, loading, disabled, activeId, loadingId }: Props) {
  if (presets.length === 0) return null;

  return (
    <div className="relative mt-6">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#9C7D5B" }}>
        <Sparkles className="h-3.5 w-3.5" />
        Try these next
      </p>
      <div
        className="pointer-events-none absolute right-0 top-8 z-10 h-10 w-8"
        style={{ background: "linear-gradient(to left, #FDFAF6, transparent)" }}
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {presets.map((preset) => {
          const isActive = activeId === preset.id;
          const isLoading = loading && (loadingId === preset.id || (!loadingId && loading));
          return (
            <button
              key={preset.id}
              type="button"
              disabled={loading || disabled}
              onClick={() => onSelect(preset)}
              className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                background: isActive ? "#111827" : "rgba(17,24,39,0.08)",
                color: isActive ? "#fff" : "#3D2B1F",
                border: `1px solid ${isActive ? "#111827" : "rgba(17,24,39,0.12)"}`,
              }}
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
