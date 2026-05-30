import Stripe from "npm:stripe@17.7.0";
import { jsonResponse } from "../_shared/cors.ts";
import {
  cancelOrderPaymentFailed,
  markOrderPaidFromStripeSession,
} from "../_shared/pickup.ts";
import { createServiceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set");
    return jsonResponse({ error: "Webhook secret not configured" }, 500);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "Missing stripe-signature header" }, 400);
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    const stripe = new Stripe(secretKey);
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return jsonResponse({ error: `Webhook Error: ${message}` }, 400);
  }

  if (event.id.startsWith("evt_test_")) {
    return jsonResponse({ verified: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await markOrderPaidFromStripeSession(session);
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId ? parseInt(pi.metadata.orderId, 10) : null;
      if (orderId && !Number.isNaN(orderId)) {
        await cancelOrderPaymentFailed(orderId);
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const status =
        account.charges_enabled && account.payouts_enabled
          ? "active"
          : account.details_submitted
            ? "pending_verification"
            : "pending";

      const supabase = createServiceClient();
      const { error } = await supabase
        .from("store_locations")
        .update({ stripe_connect_status: status })
        .eq("stripe_connect_account_id", account.id);

      if (error) {
        console.error("[stripe-webhook] Connect account update failed:", error.message);
      } else {
        console.log(`[stripe-webhook] Connect account ${account.id} status: ${status}`);
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] Error processing event:", err);
    return jsonResponse({ error: "Internal error processing webhook" }, 500);
  }

  return jsonResponse({ received: true });
});
