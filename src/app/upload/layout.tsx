import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Upload Your Selfie — AI Beauty Analysis",
  description:
    "Upload a clear, front-facing selfie to unlock your full AI beauty report: face shape, colour season, virtual clothing try-on, makeup try-on, spectacles guide, and hairstyle recommendations.",
  openGraph: {
    title: "Upload Your Selfie — Renovaara",
    description:
      "One selfie. Full AI beauty report in minutes — face shape, skin analysis, virtual try-on, makeup, spectacles, and hairstyle guide.",
    images: ["/og-image.png"],
  },
};

export default function UploadLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

