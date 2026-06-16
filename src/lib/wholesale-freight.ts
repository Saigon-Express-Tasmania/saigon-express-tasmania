import type { WholesaleCartItem } from "@/contexts/WholesaleCartContext";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import { findShippingOriginStore } from "@/lib/supabase/store-locations-client";
import { supabase } from "@/lib/supabase/client";
import type { StoreLocation, UserProfile } from "@/types";

const FREIGHT_QUOTE_SESSION_KEY = "saigon-wholesale-freight-quote";

export type FreightCourierAddress = {
  postcode: string;
  suburb: string;
  type: "business" | "residential";
  country?: string;
};

export type FreightDeliverableItem = {
  weight: number;
  height: number;
  width: number;
  length: number;
  quantity: number;
  description?: string;
};

export type FreightDeclarationPayload = {
  items: FreightDeliverableItem[];
  sender: FreightCourierAddress;
  receiver: FreightCourierAddress;
  declaredValue?: number;
};

export type FreightShippingQuote = {
  provider: string;
  courier: string;
  total: number;
  currency: "AUD";
  transitTime?: string;
  service?: string;
};

export type FreightQuoteResponse = {
  quote: FreightShippingQuote | null;
  errors: Array<{ provider: string; courier: string; code: string }>;
  cached: boolean;
  expiresAt: string;
};

export type ProductShippingInfo = {
  id: number;
  name: string;
  is_shippable: boolean;
  ship_weight_kg: number | null;
  ship_length_cm: number | null;
  ship_width_cm: number | null;
  ship_height_cm: number | null;
};

export type ShippingOriginStore = {
  id: number;
  name: string;
  address: string;
  suburb: string | null;
};

type CachedFreightQuote = {
  payloadHash: string;
  quoteTotal: number;
  quote: FreightShippingQuote | null;
  expiresAt: string;
};

function positiveNumber(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function profileCountryCode(country: string | null | undefined): string {
  const normalized = String(country ?? "").trim().toUpperCase();
  if (normalized === "AU" || normalized === "AUSTRALIA") return "AU";
  return normalized.slice(0, 2) || "AU";
}

export function buildFreightReceiverFromProfile(
  profile: UserProfile,
): FreightCourierAddress | null {
  const postcode = profile.postal_code?.trim() ?? "";
  const suburb = (profile.suburb?.trim() || profile.city?.trim() || "").toUpperCase();
  if (!postcode || !suburb) return null;

  return {
    postcode,
    suburb,
    type: profile.business_name?.trim() ? "business" : "residential",
    country: profileCountryCode(profile.country),
  };
}

export function buildFreightReceiverFromReview(form: {
  shipping_postal_code: string;
  shipping_city: string;
  shipping_dba_name: string;
  shipping_country?: string;
}): FreightCourierAddress | null {
  const postcode = form.shipping_postal_code.trim();
  const suburb = form.shipping_city.trim().toUpperCase();
  if (!postcode || !suburb) return null;

  return {
    postcode,
    suburb,
    type: form.shipping_dba_name.trim() ? "business" : "residential",
    country: profileCountryCode(form.shipping_country),
  };
}

export function parseAustralianPostcode(address: string): string | null {
  const matches = address.match(/\b(\d{4})\b/g);
  if (!matches?.length) return null;
  return matches[matches.length - 1] ?? null;
}

export function buildFreightSenderFromStore(
  store: ShippingOriginStore,
): FreightCourierAddress | null {
  const postcode = parseAustralianPostcode(store.address);
  const suburb = (store.suburb?.trim() || "").toUpperCase();
  if (!postcode || !suburb) return null;

  return {
    postcode,
    suburb,
    type: "business",
    country: "AU",
  };
}

export function getShippingOriginStore(
  stores?: StoreLocation[],
): ShippingOriginStore | null {
  const store = findShippingOriginStore(stores);
  if (!store) return null;

  return {
    id: store.id,
    name: store.name,
    address: store.address,
    suburb: store.suburb,
  };
}

export async function fetchCartProductShipping(
  productIds: number[],
): Promise<Map<number, ProductShippingInfo>> {
  if (productIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, is_shippable, ship_weight_kg, ship_length_cm, ship_width_cm, ship_height_cm",
    )
    .in("id", productIds);

  if (error) {
    throw new Error(`products: ${error.message}`);
  }

  return new Map(
    (data ?? []).map((row) => {
      const product = row as ProductShippingInfo;
      return [product.id, product] as const;
    }),
  );
}

export function buildFreightDeclarationPayload(
  cart: WholesaleCartItem[],
  products: Map<number, ProductShippingInfo>,
  sender: FreightCourierAddress,
  receiver: FreightCourierAddress,
  declaredValueExGst: number,
): FreightDeclarationPayload | null {
  const items: FreightDeliverableItem[] = [];

  for (const line of cart) {
    const product = products.get(line.productId);
    if (!product?.is_shippable) continue;

    const weight = positiveNumber(product.ship_weight_kg);
    const length = positiveNumber(product.ship_length_cm);
    const width = positiveNumber(product.ship_width_cm);
    const height = positiveNumber(product.ship_height_cm);
    if (weight == null || length == null || width == null || height == null) {
      continue;
    }

    items.push({
      weight,
      length,
      width,
      height,
      quantity: line.qty,
      description: product.name || line.productName,
    });
  }

  if (items.length === 0) return null;

  return {
    items,
    sender: {
      ...sender,
      suburb: sender.suburb.trim().toUpperCase(),
      country: sender.country?.trim().toUpperCase() || "AU",
    },
    receiver: {
      ...receiver,
      suburb: receiver.suburb.trim().toUpperCase(),
      country: receiver.country?.trim().toUpperCase() || "AU",
    },
    declaredValue: Number(Math.max(declaredValueExGst, 0).toFixed(2)),
  };
}

function canonicalFreightPayload(payload: FreightDeclarationPayload) {
  return {
    items: [...payload.items]
      .map((item) => ({
        weight: item.weight,
        height: item.height,
        width: item.width,
        length: item.length,
        quantity: item.quantity,
        description: item.description?.trim() || "Parcel",
      }))
      .sort(
        (a, b) =>
          a.weight - b.weight ||
          a.length - b.length ||
          a.width - b.width ||
          a.height - b.height ||
          a.quantity - b.quantity ||
          (a.description ?? "").localeCompare(b.description ?? ""),
      ),
    sender: payload.sender,
    receiver: payload.receiver,
    declaredValue: payload.declaredValue ?? 0,
  };
}

export async function hashFreightPayload(
  payload: FreightDeclarationPayload,
): Promise<string> {
  const canonical = canonicalFreightPayload(payload);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(canonical)),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function readCachedFreightQuote(
  payloadHash: string,
): CachedFreightQuote | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(FREIGHT_QUOTE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFreightQuote;
    if (parsed.payloadHash !== payloadHash) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedFreightQuote(cache: CachedFreightQuote): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(FREIGHT_QUOTE_SESSION_KEY, JSON.stringify(cache));
}

function formatFieldLabel(path: string): string {
  return path
    .split(/[.\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function collectValidationMessages(
  node: Record<string, unknown>,
  prefix = "",
): string[] {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(node)) {
    const field = prefix ? `${prefix} ${key}` : key;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          lines.push(`${formatFieldLabel(field)}: ${item.trim()}`);
        }
      }
      continue;
    }

    if (value && typeof value === "object") {
      lines.push(
        ...collectValidationMessages(value as Record<string, unknown>, field),
      );
      continue;
    }

    if (typeof value === "string" && value.trim()) {
      lines.push(`${formatFieldLabel(field)}: ${value.trim()}`);
    }
  }

  return lines;
}

function toSingleLineQuoteError(message: string): string {
  return message
    .split(/\r?\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" • ");
}

function formatNestedApiErrors(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;

  const errorsNode = record.errors;
  if (errorsNode && typeof errorsNode === "object") {
    const lines = collectValidationMessages(errorsNode as Record<string, unknown>);
    if (lines.length > 0) return lines.join(" • ");
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }

  return null;
}

/** Turn courier / edge-function error payloads into readable validation messages. */
export function formatShippingQuoteError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "Failed to fetch shipping quote";

  const apiMatch = trimmed.match(/^Transdirect API \d+:\s*([\s\S]+)$/i);
  const payload = apiMatch?.[1]?.trim() ?? trimmed;

  try {
    const parsed = JSON.parse(payload) as unknown;
    const formatted = formatNestedApiErrors(parsed);
    if (formatted) return toSingleLineQuoteError(formatted);
  } catch {
    // Not JSON — fall through to the original message.
  }

  return toSingleLineQuoteError(trimmed);
}

export async function fetchWholesaleFreightQuote(
  payload: FreightDeclarationPayload,
  payloadHash: string,
): Promise<{ total: number; quote: FreightShippingQuote | null; cached: boolean }> {
  const sessionCached = readCachedFreightQuote(payloadHash);
  if (sessionCached) {
    return {
      total: sessionCached.quoteTotal,
      quote: sessionCached.quote,
      cached: true,
    };
  }

  const result = await invokeEdgeFunction<FreightQuoteResponse>("shipping-quotes", {
    method: "POST",
    body: payload,
  });

  if (!result.ok) {
    throw new Error(
      formatShippingQuoteError(result.error || "Failed to fetch delivery quote"),
    );
  }

  const quote = result.data.quote;
  const total = quote?.total ?? 0;

  writeCachedFreightQuote({
    payloadHash,
    quoteTotal: total,
    quote,
    expiresAt: result.data.expiresAt,
  });

  return {
    total,
    quote,
    cached: result.data.cached,
  };
}

export type WholesaleFreightQuoteContext =
  | { status: "incomplete_address" }
  | { status: "no_shipping_origin" }
  | { status: "no_shippable_items" }
  | {
      status: "quotable";
      payload: FreightDeclarationPayload;
      payloadHash: string;
    };

export async function prepareWholesaleFreightQuoteContext(
  items: WholesaleCartItem[],
  storeLocations: StoreLocation[],
  review: {
    shipping_postal_code: string;
    shipping_city: string;
    shipping_dba_name: string;
    shipping_country?: string;
  },
  declaredValueExGst: number,
): Promise<WholesaleFreightQuoteContext> {
  const receiver = buildFreightReceiverFromReview(review);
  if (!receiver) {
    return { status: "incomplete_address" };
  }

  const shippingOrigin = getShippingOriginStore(storeLocations);
  const sender = shippingOrigin
    ? buildFreightSenderFromStore(shippingOrigin)
    : null;
  if (!sender) {
    return { status: "no_shipping_origin" };
  }

  const products = await fetchCartProductShipping(
    items.map((item) => item.productId),
  );
  const payload = buildFreightDeclarationPayload(
    items,
    products,
    sender,
    receiver,
    declaredValueExGst,
  );
  if (!payload) {
    return { status: "no_shippable_items" };
  }

  const payloadHash = await hashFreightPayload(payload);
  return { status: "quotable", payload, payloadHash };
}

export function readWholesaleFreightQuoteTotal(
  payloadHash: string,
): number | null {
  const cached = readCachedFreightQuote(payloadHash);
  if (!cached) return null;
  return cached.quoteTotal;
}
