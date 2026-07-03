import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { JourneyUserSnapshot } from "@web/lib/report/journey-hints";

export type JourneySnapshotState = JourneyUserSnapshot & { loading: boolean };

export function useJourneySnapshot(): JourneySnapshotState {
  const [snapshot, setSnapshot] = useState<JourneySnapshotState>({
    authenticated: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) {
      setSnapshot({ authenticated: false, loading: false });
      return;
    }

    const { data: report } = await supabase
      .from("reports")
      .select("id, status, is_paid")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setSnapshot({
      authenticated: true,
      loading: false,
      latestReport: report ?? null,
    });
  }, []);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => void refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return snapshot;
}
