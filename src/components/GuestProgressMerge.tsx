"use client";

import * as React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GUEST_PROGRESS_KEY, parseOnboardingProgress } from "@/lib/progressive-unlock";

/**
 * On sign-in, merge guest try-on count from localStorage into server onboarding progress.
 */
export function GuestProgressMerge() {
  const merged = React.useRef(false);

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user || merged.current) return;

      try {
        const raw = localStorage.getItem(GUEST_PROGRESS_KEY);
        if (!raw) return;
        const progress = parseOnboardingProgress(JSON.parse(raw));
        if (progress.tryOnCount <= 0) return;

        merged.current = true;
        void fetch("/api/studio/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "merge_guest", guestCount: progress.tryOnCount }),
        })
          .then((res) => {
            if (res.ok) localStorage.removeItem(GUEST_PROGRESS_KEY);
          })
          .catch(() => undefined);
      } catch {
        // ignore
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
