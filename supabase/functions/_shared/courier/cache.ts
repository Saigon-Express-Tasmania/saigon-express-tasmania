import type { SupabaseClient } from "npm:@supabase/supabase-js@2.107.0";
import type {
  GetCourierQuotesInput,
  GetCourierQuotesResult,
} from "./types.ts";

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CachedQuoteRow = {
  response_payload: GetCourierQuotesResult;
  expires_at: string;
};

function compareItems(
  a: GetCourierQuotesInput["items"][number],
  b: GetCourierQuotesInput["items"][number],
): number {
  return (
    a.weight - b.weight ||
    a.length - b.length ||
    a.width - b.width ||
    a.height - b.height ||
    a.quantity - b.quantity ||
    (a.description ?? "").localeCompare(b.description ?? "")
  );
}

/** Stable canonical form for cache key hashing. */
export function normalizeQuoteInput(
  input: GetCourierQuotesInput,
): GetCourierQuotesInput {
  return {
    items: [...input.items]
      .map((item) => ({
        weight: item.weight,
        height: item.height,
        width: item.width,
        length: item.length,
        quantity: item.quantity,
        description: item.description?.trim() || "Parcel",
      }))
      .sort(compareItems),
    sender: {
      postcode: input.sender.postcode.trim(),
      suburb: input.sender.suburb.trim().toUpperCase(),
      type: input.sender.type,
      country: (input.sender.country?.trim().toUpperCase() || "AU"),
    },
    receiver: {
      postcode: input.receiver.postcode.trim(),
      suburb: input.receiver.suburb.trim().toUpperCase(),
      type: input.receiver.type,
      country: (input.receiver.country?.trim().toUpperCase() || "AU"),
    },
    declaredValue: input.declaredValue ?? 0,
    tailgatePickup: input.tailgatePickup ?? false,
    tailgateDelivery: input.tailgateDelivery ?? false,
    providers: input.providers ?? ["transdirect"],
  };
}

export async function buildQuoteCacheKey(
  normalized: GetCourierQuotesInput,
): Promise<string> {
  const payload = JSON.stringify(normalized);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getCachedQuotes(
  client: SupabaseClient,
  cacheKey: string,
): Promise<{ response: GetCourierQuotesResult; expiresAt: string } | null> {
  const { data, error } = await client
    .from("shipping_quote_cache")
    .select("response_payload, expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read shipping quote cache: ${error.message}`);
  }

  if (!data) return null;

  const row = data as CachedQuoteRow;

  void client
    .rpc("increment_shipping_quote_cache_hit", { p_cache_key: cacheKey })
    .then(({ error: rpcError }) => {
      if (rpcError) {
        console.error("[courier:cache] Failed to bump hit_count:", rpcError);
      }
    });

  return {
    response: row.response_payload,
    expiresAt: row.expires_at,
  };
}

export async function putCachedQuotes(
  client: SupabaseClient,
  cacheKey: string,
  request: GetCourierQuotesInput,
  response: GetCourierQuotesResult,
): Promise<string> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

  const { error } = await client
    .from("shipping_quote_cache")
    .upsert({
      cache_key: cacheKey,
      request_payload: request,
      response_payload: response,
      expires_at: expiresAt,
      last_hit_at: new Date().toISOString(),
      hit_count: 0,
    }, { onConflict: "cache_key" });

  if (error) {
    throw new Error(`Failed to write shipping quote cache: ${error.message}`);
  }

  return expiresAt;
}
