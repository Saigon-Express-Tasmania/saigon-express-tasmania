import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  getCourierQuotesCached,
  validateFreightDeclaration,
} from "../_shared/courier/index.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const input = validateFreightDeclaration(body);
    const result = await getCourierQuotesCached(input);
    const quote = result.quotes.length > 0
      ? result.quotes.reduce((max, current) =>
        current.total > max.total ? current : max
      )
      : null;

    return jsonResponse({
      quote,
      errors: result.errors,
      providerRefs: result.providerRefs,
      cached: result.cached,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : "Failed to fetch shipping quotes";
    const status =
      message.includes("empty") ||
        message.includes("Please") ||
        message.includes("Invalid") ||
        message.includes("required") ||
        message.includes("At least one")
        ? 400
        : 500;
    console.error("[shipping-quotes]", err);
    return jsonResponse({ error: message }, status);
  }
});
