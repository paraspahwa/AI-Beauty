export const mobileEnv = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

function isLocalhostHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "10.0.2.2" || hostname === "10.0.3.2";
}

export function getValidatedMobileApiBaseUrl(): string {
  const baseUrl = mobileEnv.apiBaseUrl.trim();

  if (!baseUrl) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL");
  }

  if (!__DEV__) {
    if (parsedUrl.protocol !== "https:") {
      throw new Error("EXPO_PUBLIC_API_BASE_URL must use https in production");
    }
    if (isLocalhostHost(parsedUrl.hostname)) {
      throw new Error("EXPO_PUBLIC_API_BASE_URL cannot point to localhost in production");
    }
  }

  return parsedUrl.toString().replace(/\/$/, "");
}

export function assertMobileEnv(): void {
  getValidatedMobileApiBaseUrl();
  if (!mobileEnv.supabaseUrl) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL");
  }
  if (!mobileEnv.supabaseAnonKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }
}
