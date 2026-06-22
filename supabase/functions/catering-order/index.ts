import { requireAuthenticatedUser } from "../_shared/auth.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  cancelCateringOrder,
  createPendingCateringOrder,
  validateCancelCateringOrderInput,
  validateCateringOrderInput,
} from "../_shared/catering-order.ts";
import { sendCateringOrderNotifyEmail } from "../_shared/catering-order-notify-email.ts";
import { sendOrderCancelledEmail } from "../_shared/order-cancelled-email.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();

    if (body?.action === "cancel") {
      const input = validateCancelCateringOrderInput(body);

      if (input.customerAccount) {
        const auth = await requireAuthenticatedUser(req);
        if (!auth.ok) return auth.response;

        if (input.customerAccount !== auth.user.id) {
          return jsonResponse({ error: "Unauthorized" }, 403);
        }
      }

      const result = await cancelCateringOrder(input);

      try {
        await sendOrderCancelledEmail(result.orderId);
      } catch (err) {
        console.error(
          `[catering-order] Failed to send cancelled notify for #${result.orderId}:`,
          err,
        );
      }

      return jsonResponse(result);
    }

    const input = await validateCateringOrderInput(body);

    if (input.customerAccount) {
      const auth = await requireAuthenticatedUser(req);
      if (!auth.ok) return auth.response;

      if (input.customerAccount !== auth.user.id) {
        return jsonResponse({ error: "Unauthorized" }, 403);
      }
    }

    const result = await createPendingCateringOrder(input);

    try {
      await sendCateringOrderNotifyEmail(result.orderId);
    } catch (err) {
      console.error(
        `[catering-order] Failed to send admin notify for #${result.orderId}:`,
        err,
      );
    }

    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process catering order";
    const status =
      message.includes("empty") ||
        message.includes("Please") ||
        message.includes("Invalid") ||
        message.includes("required") ||
        message.includes("Delivery") ||
        message.includes("delivery") ||
        message.includes("Unauthorized") ||
        message.includes("cannot be cancelled") ||
        message.includes("Only pending") ||
        message.includes("Paid orders") ||
        message.includes("not found")
        ? 400
        : 500;
    console.error("[catering-order]", err);
    return jsonResponse({ error: message }, status);
  }
});
