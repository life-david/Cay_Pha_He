import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

// Accept multiple popular env names to be more robust for different setups
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL_2;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

function dummyClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: new Error("Missing Supabase configuration") }),
      signUp: async () => ({ data: null, error: new Error("Missing Supabase configuration") }),
    },
  } as unknown as SupabaseClient;
}

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    // warn so developers see immediate feedback in browser console
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("Supabase client: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    return dummyClient();
  }

  // basic url validation
  if (!/^https?:\/\//.test(supabaseUrl)) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("Supabase client: NEXT_PUBLIC_SUPABASE_URL does not look like a valid URL:", supabaseUrl);
    }
    return dummyClient();
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseKey);
  } catch (e) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("Supabase client: failed to create client", e);
    }
    return dummyClient();
  }
};
