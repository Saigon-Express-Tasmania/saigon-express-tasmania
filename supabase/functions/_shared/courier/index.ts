import { getTransdirectQuotes } from "./transdirect.ts";
import {
  buildQuoteCacheKey,
  getCachedQuotes,
  normalizeQuoteInput,
  putCachedQuotes,
} from "./cache.ts";
import { createServiceClient } from "../supabase.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.107.0";
import type {
  CourierProvider,
  CourierQuote,
  CourierQuoteError,
  GetCourierQuotesInput,
  GetCourierQuotesResult,
} from "./types.ts";

export type {
  CourierAddress,
  CourierAddressType,
  CourierProvider,
  CourierProviderRef,
  CourierQuote,
  CourierQuoteError,
  DeliverableItem,
  GetCourierQuotesInput,
  GetCourierQuotesResult,
};

export { validateFreightDeclaration } from "./validate.ts";

export type GetCourierQuotesCachedResult = GetCourierQuotesResult & {
  cached: boolean;
  expiresAt: string;
};

const DEFAULT_PROVIDERS: CourierProvider[] = ["transdirect"];

/**
 * Declare deliverables and fetch delivery quotes from registered courier providers.
 * Results are merged and sorted cheapest-first so a single option can be selected.
 */
export async function getCourierQuotes(
  input: GetCourierQuotesInput,
): Promise<GetCourierQuotesResult> {
  if (!input.items.length) {
    throw new Error("At least one deliverable item is required");
  }

  const providers = input.providers ?? DEFAULT_PROVIDERS;
  const quotes: CourierQuote[] = [];
  const errors: CourierQuoteError[] = [];
  const providerRefs: GetCourierQuotesResult["providerRefs"] = {};

  for (const provider of providers) {
    switch (provider) {
      case "transdirect": {
        const result = await getTransdirectQuotes(input);
        quotes.push(...result.quotes);
        errors.push(...result.errors);
        if (result.bookingId != null) {
          providerRefs.transdirect = { bookingId: result.bookingId };
        }
        break;
      }
      default:
        throw new Error(`Unknown courier provider: ${provider satisfies never}`);
    }
  }

  quotes.sort((a, b) => a.total - b.total);

  return { quotes, errors, providerRefs };
}

/**
 * Fetch courier quotes with a 7-day Postgres cache keyed by normalized freight input.
 */
export async function getCourierQuotesCached(
  input: GetCourierQuotesInput,
  client?: SupabaseClient,
): Promise<GetCourierQuotesCachedResult> {
  const supabase = client ?? createServiceClient();
  const normalized = normalizeQuoteInput(input);
  const cacheKey = await buildQuoteCacheKey(normalized);

  const cached = await getCachedQuotes(supabase, cacheKey);
  if (cached) {
    console.log(`[courier:cache] hit ${cacheKey.slice(0, 12)}…`);
    return {
      ...cached.response,
      cached: true,
      expiresAt: cached.expiresAt,
    };
  }

  console.log(`[courier:cache] miss ${cacheKey.slice(0, 12)}…`);
  const result = await getCourierQuotes(normalized);
  const expiresAt = await putCachedQuotes(
    supabase,
    cacheKey,
    normalized,
    result,
  );

  return {
    ...result,
    cached: false,
    expiresAt,
  };
}
