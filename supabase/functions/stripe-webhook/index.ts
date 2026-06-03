import type Stripe from "npm:stripe@17.7.0";
import { jsonResponse } from "../_shared/cors.ts";
import {
  cancelOrderPaymentFailed,
  markOrderPaidFromStripeSession,
  type StripePaymentMode,
} from "../_shared/pickup.ts";
import { constructWebhookEvent } from "../_shared/stripe-secrets.ts";
import { createServiceClient } from "../_shared/supabase.ts";

function paymentModeFromMetadata(metadata: Record<string, string> | null | undefined): StripePaymentMode | null {
  const raw = metadata?.mode;
  if (raw === "test" || raw === "live") return raw;
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "Missing stripe-signature header" }, 400);
  }

  const body = await req.text();
  let event: Stripe.Event;
  let paymentMode: StripePaymentMode;

  try {
    const verified = await constructWebhookEvent(body, signature);
    event = verified.event;
    paymentMode = verified.mode;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return jsonResponse({ error: `Webhook Error: ${message}` }, 400);
  }

  if (event.id.startsWith("evt_test_")) {
    return jsonResponse({ verified: true, mode: paymentMode });
  }

  console.log(`[stripe-webhook] ${event.type} (${paymentMode})`);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const mode = paymentModeFromMetadata(session.metadata ?? undefined) ?? paymentMode;
      await markOrderPaidFromStripeSession(session, mode);
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const draftOrderId = pi.metadata?.draftOrderId ? parseInt(pi.metadata.draftOrderId, 10) : null;
      const mode = paymentModeFromMetadata(pi.metadata ?? undefined) ?? paymentMode;
      if (draftOrderId && !Number.isNaN(draftOrderId)) {
        await cancelOrderPaymentFailed(draftOrderId, mode);
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
        console.log(`[stripe-webhook] Connect account ${account.id} (${paymentMode}) status: ${status}`);
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] Error processing event:", err);
    return jsonResponse({ error: "Internal error processing webhook" }, 500);
  }

  return jsonResponse({ received: true, mode: paymentMode });
});
