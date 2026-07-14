"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/track";

/**
 * Tracks page views automatically on route changes.
 * Must be a client component wrapped in Suspense due to usePathname().
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);

  return null;
}
