import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { mobileEnv } from "@/lib/env";

const SESSION_KEY = "renovaara.mobile.session";

const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (key !== SESSION_KEY) return null;
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (key !== SESSION_KEY) return;
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (key !== SESSION_KEY) return;
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(mobileEnv.supabaseUrl, mobileEnv.supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
