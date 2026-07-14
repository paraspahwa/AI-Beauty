import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Beauty Blog | Renovaara",
    template: "%s | Renovaara Blog",
  },
  description:
    "Learn about face shapes, colour seasons, skin analysis, and AI beauty technology. Expert guides to discover your personal style.",
};

export default function BlogLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
