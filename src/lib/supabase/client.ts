"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "../env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Singleton browser client used by client components. */
export function createSupabaseBrowserClient() {
  if (!cached) {
    cached = createBrowserClient(env.supabase.url, env.supabase.anonKey);
  }
  return cached;
}
