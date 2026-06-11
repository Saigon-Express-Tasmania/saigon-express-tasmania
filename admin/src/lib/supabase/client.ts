import { ENV } from "@/constants/env";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const supabase: SupabaseClient = createClient(
  ENV.supabaseUrl,
  ENV.supabasePublishableKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);

export default supabase;
