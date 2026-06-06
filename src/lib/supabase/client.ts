"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return url;
}

function getSupabaseKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
  }
  return key;
}

/** Browser Supabase client (anon key; session persisted in local storage). */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(getSupabaseUrl(), getSupabaseKey(), {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export const supabase = createBrowserSupabaseClient();
