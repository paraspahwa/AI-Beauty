import { createClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolve the authenticated user from cookie session (web) or Bearer JWT (mobile).
 */
export async function getRequestUser(req?: NextRequest): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user: cookieUser } } = await supabase.auth.getUser();
  if (cookieUser) return cookieUser;

  if (!req) return null;

  const authorization = req.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return null;

  const tokenClient = createClient(env.supabase.url, env.supabase.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await tokenClient.auth.getUser(match[1]);
  if (error || !data.user) return null;
  return data.user;
}
