import Stripe from "npm:stripe@17.7.0";

/** Checkout / webhook payment environment (not Stripe Checkout `mode`). */
export type StripePaymentMode = "test" | "live";

const SECRET_KEYS: Record<StripePaymentMode, string> = {
  test: "STRIPE_TEST_SECRET_KEY",
  live: "STRIPE_LIVE_SECRET_KEY",
};

const WEBHOOK_KEYS: Record<StripePaymentMode, string> = {
  test: "STRIPE_TEST_WEBHOOK_KEY",
  live: "STRIPE_LIVE_WEBHOOK_KEY",
};

export function parsePaymentMode(value: unknown): StripePaymentMode {
  const mode = String(value ?? "").trim().toLowerCase();
  if (mode === "live" || mode === "test") return mode;
  throw new Error('Invalid mode: must be "test" or "live"');
}

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

export function createStripeClient(mode: StripePaymentMode): Stripe {
  return new Stripe(getStripeSecretKey(mode));
}

export type VerifiedStripeEvent = {
  event: Stripe.Event;
  mode: StripePaymentMode;
};

/**
 * Verify webhook signature using test or live webhook secret.
 * Prefers metadata.mode on the payload when present; otherwise uses event.livemode.
 */
export async function constructWebhookEvent(
  body: string,
  signature: string,
): Promise<VerifiedStripeEvent> {
  const modes: StripePaymentMode[] = ["test", "live"];
  let lastError: Error | null = null;

  for (const mode of modes) {
    try {
      const secret = getWebhookSecret(mode);
      const event = await Stripe.webhooks.constructEventAsync(body, signature, secret);
      const resolvedMode = resolveEventPaymentMode(event, mode);
      return { event, mode: resolvedMode };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Webhook signature verification failed");
}

function resolveEventPaymentMode(
  event: Stripe.Event,
  verifiedWith: StripePaymentMode,
): StripePaymentMode {
  const metaMode = extractModeFromEvent(event);
  if (metaMode) return metaMode;
  if (typeof event.livemode === "boolean") {
    return event.livemode ? "live" : "test";
  }
  return verifiedWith;
}

function extractModeFromEvent(event: Stripe.Event): StripePaymentMode | null {
  const obj = event.data.object as { metadata?: Record<string, string> };
  const raw = obj.metadata?.mode;
  if (raw === "test" || raw === "live") return raw;
  return null;
}
