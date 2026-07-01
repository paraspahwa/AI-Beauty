"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "../public-env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let cached: BrowserClient | null = null;

/** True when both public Supabase env vars are present. */
export function isSupabaseBrowserConfigured(): boolean {
  return publicEnv.supabase.isConfigured;
}

/**
 * Singleton browser client used by client components.
 * Returns null when Supabase public env vars are missing (local dev without .env.local).
 */
export function createSupabaseBrowserClient(): BrowserClient | null {
  if (!isSupabaseBrowserConfigured()) {
    return null;
  }

  if (!cached) {
    cached = createBrowserClient(publicEnv.supabase.url, publicEnv.supabase.anonKey);
  }
  return cached;
}
