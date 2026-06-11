const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.',
  );
}

export const ENV = {
  supabaseUrl,
  supabasePublishableKey,
  supabaseStorageBucket: import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string | undefined,
  cacheRevalidateSecret: import.meta.env.VITE_CACHE_REVALIDATE_SECRET as string | undefined,
};

export const STORAGE_BUCKET = ENV.supabaseStorageBucket;
