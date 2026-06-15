import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  createOrderCheckoutSession,
  validateOrderCheckoutInput,
} from "../_shared/order.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const input = validateOrderCheckoutInput(body);
    const result = await createOrderCheckoutSession(input);
    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout";
    const status =
      message.includes("empty") ||
        message.includes("Please") ||
        message.includes("Invalid") ||
        message.includes("Shipping") ||
        message.includes("shipping") ||
        message.includes("changed") ||
        message.includes("required") ||
        message.includes("At least one")
        ? 400
        : 500;
    console.error("[checkout]", err);
    return jsonResponse({ error: message }, status);
  }
});
