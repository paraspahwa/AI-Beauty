import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Upload Your Selfie — AI Beauty Analysis",
  description:
    "Upload a clear, front-facing selfie for your AI beauty report: free face-shape preview, then unlock six analysis infographics and a PDF. Optional Style Guide add-on available after unlock.",
  openGraph: {
    title: "Upload Your Selfie — Renovaara",
    description:
      "One selfie. Six analysis infographics in minutes — skin, colour, hairstyle, spectacles, hair colour, and more.",
    images: ["/og-image.png"],
  },
};

export default function UploadLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

