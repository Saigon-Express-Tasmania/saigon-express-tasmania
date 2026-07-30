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
  cacheRevalidateSecret: import.meta.env.VITE_CACHE_REVALIDATE_SECRET as
    | string
    | undefined,
  brevoApiKey: import.meta.env.VITE_BREVO_API_KEY as string | undefined,
  r2AccountId: import.meta.env.VITE_R2_ACCOUNT_ID as string | undefined,
  r2AccessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID as string | undefined,
  r2SecretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY as
    | string
    | undefined,
  r2Bucket: import.meta.env.VITE_R2_BUCKET as string | undefined,
  /** Public base URL / custom domain for R2 objects (no trailing slash). */
  r2PublicUrl: import.meta.env.VITE_R2_PUBLIC_URL as string | undefined,
};

export const STORAGE_BUCKET = ENV.r2Bucket || 'saigon-express-tasmania';
