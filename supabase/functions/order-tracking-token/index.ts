import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  getOrderTrackingDetails,
  getOrderTrackingDetailsBySessionId,
} from "../_shared/order.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const orderIdParam = url.searchParams.get("orderId");
  const sessionId = url.searchParams.get("sessionId")?.trim() ?? "";
  const orderId = orderIdParam ? parseInt(orderIdParam, 10) : NaN;

  if (!sessionId && (!orderIdParam || Number.isNaN(orderId) || orderId <= 0)) {
    return jsonResponse({ error: "Invalid orderId or sessionId" }, 400);
  }

  try {
    const details = sessionId
      ? await getOrderTrackingDetailsBySessionId(sessionId)
      : await getOrderTrackingDetails(orderId);

    return jsonResponse({
      trackingToken: details.trackingToken,
      invoiceNumber: details.invoiceNumber,
    });
  } catch (err) {
    console.error("[order-tracking-token]", err);
    return jsonResponse({ error: "Failed to load tracking token" }, 500);
  }
});
