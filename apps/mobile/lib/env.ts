export const mobileEnv = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function assertMobileEnv(): void {
  if (!mobileEnv.apiBaseUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }
  if (!mobileEnv.supabaseUrl) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL");
  }
  if (!mobileEnv.supabaseAnonKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }
}
