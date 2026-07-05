import { ENV } from "@/constants/env";
import { isUnauthorizedApiResponse, notifyAuthFailure } from "@/lib/auth-session";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

async function adminSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (isUnauthorizedApiResponse(response, requestUrl)) {
    notifyAuthFailure();
  }

  return response;
}

export const supabase: SupabaseClient = createClient(
  ENV.supabaseUrl,
  ENV.supabasePublishableKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: adminSupabaseFetch,
    },
  },
);

export default supabase;
