export type StripePaymentMode = "test" | "live";

/** Client-side Stripe mode sent to checkout-pickup (defaults to test). */
export function getClientStripeMode(): StripePaymentMode {
  const raw = process.env.NEXT_PUBLIC_STRIPE_MODE?.trim().toLowerCase();
  return raw === "live" ? "live" : "test";
}
