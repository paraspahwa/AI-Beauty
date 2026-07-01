"use client";

import { Vault } from "lucide-react";
import { InfographicDownloadButton } from "./InfographicDownloadButton";

interface Props {
  signedUrl: string;
  sectionKey: string;
  mime?: string;
  createdAt?: string;
  label: string;
}

export function InfographicReadyBar({ signedUrl, sectionKey, mime, createdAt, label }: Props) {
  return (
    <div className="flex flex-col gap-3 border-t border-terracotta/10 bg-[var(--report-icon-bg)]/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="flex items-center justify-center gap-2 text-xs text-ink-stone sm:justify-start">
        <Vault className="h-3.5 w-3.5 shrink-0 text-terracotta" />
        Saved to your Vault — download a copy to keep permanently
      </p>
      <InfographicDownloadButton
        signedUrl={signedUrl}
        sectionKey={sectionKey}
        mime={mime}
        createdAt={createdAt}
        label={label}
      />
    </div>
  );
}
