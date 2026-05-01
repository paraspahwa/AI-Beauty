"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "../public-env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Singleton browser client used by client components. */
export function createSupabaseBrowserClient() {
  if (!cached) {
    cached = createBrowserClient(publicEnv.supabase.url, publicEnv.supabase.anonKey);
  }
  return cached;
}
