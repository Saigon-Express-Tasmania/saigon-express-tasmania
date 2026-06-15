const DEFAULT_APP_URL = "http://localhost:3000";
const DEFAULT_SUPABASE_STORAGE_BUCKET_FOR_CUSTOMER = "saigon-express-tasmania-customers";

export const ENV = {
  appUrl: process.env.APP_URL || DEFAULT_APP_URL,
  cacheRevalidateSecret: process.env.CACHE_REVALIDATE_SECRET || "",
  gaMeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
  supabaseStorageBucketForCustomer: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_FOR_CUSTOMER || DEFAULT_SUPABASE_STORAGE_BUCKET_FOR_CUSTOMER,
};
