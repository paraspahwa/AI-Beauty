"use client";

import * as React from "react";
import { createSupabaseBrowserClient, isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import type { JourneyUserSnapshot } from "@/lib/report/journey-hints";

type SnapshotState = JourneyUserSnapshot & { loading: boolean };

const EMPTY: SnapshotState = { authenticated: false, loading: true };

export function useJourneySnapshot(): SnapshotState {
  const [snapshot, setSnapshot] = React.useState<SnapshotState>(EMPTY);

  React.useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setSnapshot({ authenticated: false, loading: false });
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setSnapshot({ authenticated: false, loading: false });
      return;
    }

    const client = supabase;
    let cancelled = false;

    async function load() {
      const { data: auth } = await client.auth.getUser();
      const user = auth.user;

      if (!user) {
        if (!cancelled) setSnapshot({ authenticated: false, loading: false });
        return;
      }

      const { data: report } = await client
        .from("reports")
        .select("id, status, is_paid")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setSnapshot({
          authenticated: true,
          loading: false,
          latestReport: report ?? null,
        });
      }
    }

    void load();

    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return snapshot;
}
