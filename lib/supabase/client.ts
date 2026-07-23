import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Browser Supabase client. Only call when `isSupabaseConfigured` is true —
 * it throws if the env vars are missing so misconfiguration fails loudly.
 */
export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase is not configured (missing env vars).");
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
