import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  createPendingCateringOrder,
  validateCateringOrderInput,
} from "../_shared/catering-order.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const auth = await requireAuthenticatedUser(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const input = validateCateringOrderInput(body);

    if (input.customerAccount !== auth.user.id) {
      return jsonResponse({ error: "Unauthorized" }, 403);
    }

    const result = await createPendingCateringOrder(input);
    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to place catering order";
    const status =
      message.includes("empty") ||
        message.includes("Please") ||
        message.includes("Invalid") ||
        message.includes("required") ||
        message.includes("Delivery") ||
        message.includes("delivery") ||
        message.includes("Unauthorized")
        ? 400
        : 500;
    console.error("[catering-order]", err);
    return jsonResponse({ error: message }, status);
  }
});
