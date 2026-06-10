import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { postStudioProgress } from "@/lib/api";
import { parseOnboardingProgress } from "@/lib/progressive-unlock";
import { supabase } from "@/lib/supabase";

const GUEST_PROGRESS_KEY = "rv_guest_progress";
const GUEST_STUDIO_STATE_KEY = "rv_guest_studio_state";

export function GuestProgressMerge() {
  const merged = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !session?.user || merged.current) return;

      void (async () => {
        try {
          const raw = await AsyncStorage.getItem(GUEST_PROGRESS_KEY);
          if (!raw) return;
          const progress = parseOnboardingProgress(JSON.parse(raw));
          if (progress.tryOnCount <= 0) return;

          merged.current = true;
          await postStudioProgress("merge_guest", { guestCount: progress.tryOnCount });
          await AsyncStorage.multiRemove([GUEST_PROGRESS_KEY, GUEST_STUDIO_STATE_KEY]);
        } catch {
          merged.current = false;
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
