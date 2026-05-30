import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  createPickupCheckoutSession,
  validatePickupCheckoutInput,
} from "../_shared/pickup.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const input = validatePickupCheckoutInput(body);
    const result = await createPickupCheckoutSession(input);
    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout";
    const status =
      message.includes("empty") || message.includes("Please") || message.includes("Invalid")
        ? 400
        : 500;
    console.error("[checkout-pickup]", err);
    return jsonResponse({ error: message }, status);
  }
});
