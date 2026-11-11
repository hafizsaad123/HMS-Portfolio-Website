import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Cookie-less Supabase client for PUBLIC reads (site pages, /api/content).
 *
 * Why a separate client: it never touches `cookies()`, so public pages stay
 * cacheable/dynamic without being forced into request-scoped rendering, and
 * it always runs as the `anon` role — the RLS policies allow public SELECT
 * on the content tables and nothing else.
 */
let publicClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createPublicClient() {
  if (!publicClient) {
    publicClient = createSupabaseClient(supabaseUrl!, supabaseKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return publicClient;
}
