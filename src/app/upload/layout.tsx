import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Upload Your Selfie — AI Beauty Analysis",
  description:
    "Upload a clear, front-facing selfie to unlock your full AI beauty report: face shape, skin analysis, colour season, hairstyle guide, hair colour guide, spectacles guide, and personal style guide.",
  openGraph: {
    title: "Upload Your Selfie — Renovaara",
    description:
      "One selfie. Full AI beauty report in minutes — face shape, skin analysis, colour guide, hairstyle, spectacles, and style direction.",
    images: ["/og-image.png"],
  },
};

export default function UploadLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

