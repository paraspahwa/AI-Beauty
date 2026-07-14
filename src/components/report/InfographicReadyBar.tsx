"use client";

import { Vault } from "lucide-react";
import { InfographicDownloadButton } from "./InfographicDownloadButton";
import { InfographicShareButton } from "./InfographicShareButton";

interface Props {
  signedUrl: string;
  sectionKey: string;
  mime?: string;
  createdAt?: string;
  label: string;
  reportId: string;
  shareText: string;
}

export function InfographicReadyBar({
  signedUrl,
  sectionKey,
  mime,
  createdAt,
  label,
  reportId,
  shareText,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border-t border-terracotta/10 bg-[var(--report-icon-bg)]/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="flex items-center justify-center gap-2 text-xs text-ink-stone sm:justify-start">
        <Vault className="h-3.5 w-3.5 shrink-0 text-terracotta" />
        Saved to your Vault — download a copy to keep permanently
      </p>
      <div className="flex items-center gap-2">
        <InfographicShareButton
          imageUrl={signedUrl}
          sectionKey={sectionKey}
          label={label}
          reportId={reportId}
          shareText={shareText}
        />
        <InfographicDownloadButton
          signedUrl={signedUrl}
          sectionKey={sectionKey}
          mime={mime}
          createdAt={createdAt}
          label={label}
        />
      </div>
    </div>
  );
}
