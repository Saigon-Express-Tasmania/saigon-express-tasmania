import { getTransdirectApiKey } from "../secrets/transdirect-secrets.ts";
import type {
  CourierQuote,
  CourierQuoteError,
  GetCourierQuotesInput,
} from "./types.ts";

const TRANSDIRECT_API_BASE = "https://www.transdirect.com.au/api/bookings/v4";
const DEFAULT_REQUESTING_SITE = "https://saigonexpress.com.au";

type TransdirectAddress = {
  postcode: string;
  suburb: string;
  type: "business" | "residential";
  country: string;
};

type TransdirectItem = {
  weight: number;
  height: number;
  width: number;
  length: number;
  quantity: number;
  description: string;
};

type TransdirectQuoteRequest = {
  declared_value: number;
  referrer: string;
  requesting_site: string;
  tailgate_pickup: boolean;
  tailgate_delivery: boolean;
  items: TransdirectItem[];
  sender: TransdirectAddress;
  receiver: TransdirectAddress;
};

type TransdirectPickupTime = {
  from: string;
  to: string;
};

type TransdirectQuoteDetail = {
  total: number;
  price_insurance_ex?: number;
  fee?: number;
  applied_gst?: number;
  service?: string;
  transit_time?: string;
  pickup_dates?: string[];
  pickup_time?: TransdirectPickupTime;
};

type TransdirectQuoteResponse = {
  id?: number;
  quotes?: Record<string, TransdirectQuoteDetail>;
  quote_errors?: Array<{ courier: string; code: string }>;
};

export type TransdirectQuotesResult = {
  quotes: CourierQuote[];
  errors: CourierQuoteError[];
  bookingId?: number;
};

function getRequestingSite(): string {
  return Deno.env.get("SITE_ORIGIN")?.trim() ||
    Deno.env.get("NEXT_PUBLIC_SITE_URL")?.trim() ||
    DEFAULT_REQUESTING_SITE;
}

function toTransdirectAddress(
  address: GetCourierQuotesInput["sender"],
): TransdirectAddress {
  return {
    postcode: address.postcode.trim(),
    suburb: address.suburb.trim().toUpperCase(),
    type: address.type,
    country: address.country?.trim().toUpperCase() || "AU",
  };
}

function toTransdirectItems(
  items: GetCourierQuotesInput["items"],
): TransdirectItem[] {
  return items.map((item) => ({
    weight: item.weight,
    height: item.height,
    width: item.width,
    length: item.length,
    quantity: item.quantity,
    description: item.description?.trim() || "Parcel",
  }));
}

function buildTransdirectRequest(
  input: GetCourierQuotesInput,
): TransdirectQuoteRequest {
  return {
    declared_value: input.declaredValue ?? 0,
    referrer: "api",
    requesting_site: getRequestingSite(),
    tailgate_pickup: input.tailgatePickup ?? false,
    tailgate_delivery: input.tailgateDelivery ?? false,
    items: toTransdirectItems(input.items),
    sender: toTransdirectAddress(input.sender),
    receiver: toTransdirectAddress(input.receiver),
  };
}

async function transdirectRequest<T>(
  init: RequestInit,
): Promise<T> {
  const response = await fetch(TRANSDIRECT_API_BASE, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Api-Key": getTransdirectApiKey(),
      ...(init.headers ?? {}),
    },
  });

  const body = await response.text();
  let parsed: unknown = null;
  if (body) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }
  }

  if (!response.ok) {
    const message = parsed && typeof parsed === "object" && "message" in parsed
      ? String((parsed as { message: unknown }).message)
      : body || response.statusText;
    throw new Error(`Transdirect API ${response.status}: ${message}`);
  }

  return parsed as T;
}

function parseTransdirectQuotes(
  data: TransdirectQuoteResponse,
): CourierQuote[] {
  const quotes: CourierQuote[] = [];

  for (const [courier, detail] of Object.entries(data.quotes ?? {})) {
    if (typeof detail.total !== "number") continue;

    quotes.push({
      provider: "transdirect",
      courier,
      total: detail.total,
      currency: "AUD",
      transitTime: detail.transit_time,
      service: detail.service,
      priceInsuranceEx: detail.price_insurance_ex,
      fee: detail.fee,
      gst: detail.applied_gst,
      pickupDates: detail.pickup_dates,
    });
  }

  return quotes;
}

function parseTransdirectErrors(
  data: TransdirectQuoteResponse,
): CourierQuoteError[] {
  return (data.quote_errors ?? []).map((error) => ({
    provider: "transdirect" as const,
    courier: error.courier,
    code: error.code,
  }));
}

/** Request quick quotes from Transdirect (multiple carriers in one call). */
export async function getTransdirectQuotes(
  input: GetCourierQuotesInput,
): Promise<TransdirectQuotesResult> {
  if (!input.items.length) {
    throw new Error("At least one deliverable item is required");
  }

  const requestBody = buildTransdirectRequest(input);

  console.log(
    `[courier:transdirect] Quoting ${input.items.length} item(s) ` +
      `${input.sender.suburb} → ${input.receiver.suburb}`,
  );

  const data = await transdirectRequest<TransdirectQuoteResponse>({
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  const quotes = parseTransdirectQuotes(data);
  const errors = parseTransdirectErrors(data);

  console.log(
    `[courier:transdirect] Received ${quotes.length} quote(s)` +
      (errors.length ? `, ${errors.length} error(s)` : ""),
  );

  return {
    quotes,
    errors,
    bookingId: data.id,
  };
}
