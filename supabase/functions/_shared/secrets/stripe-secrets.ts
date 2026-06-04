export type StripePaymentMode = "test" | "live";

const SECRET_KEYS: Record<StripePaymentMode, string> = {
  test: "STRIPE_TEST_SECRET_KEY",
  live: "STRIPE_LIVE_SECRET_KEY",
};

const WEBHOOK_KEYS: Record<StripePaymentMode, string> = {
  test: "STRIPE_TEST_WEBHOOK_KEY",
  live: "STRIPE_LIVE_WEBHOOK_KEY",
};

/** Supabase-injected secret (Dashboard → Edge Functions → Secrets). */
function requireSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing Supabase secret: ${name}`);
  }
  return value;
}

export function getStripeSecretKey(mode: StripePaymentMode): string {
  return requireSecret(SECRET_KEYS[mode]);
}

export function getWebhookSecret(mode: StripePaymentMode): string {
  return requireSecret(WEBHOOK_KEYS[mode]);
}
