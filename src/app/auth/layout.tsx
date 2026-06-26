import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign In — Get Your AI Beauty Report",
  description:
    "Sign in or create a free account to upload your selfie and receive your personalised AI beauty report: face shape, colour season, skin routine, hairstyle guide, and more.",
  openGraph: {
    title: "Sign In to Renovaara",
    description:
      "Create a free account and get your full AI beauty report — colour season, skin analysis, spectacles, hairstyle, and style guide — all from one selfie.",
    images: ["/og-image.png"],
  },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
