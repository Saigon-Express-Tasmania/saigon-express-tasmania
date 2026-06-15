import type { SupabaseClient } from "npm:@supabase/supabase-js@2.107.0";
import {
  getCourierQuotesCached,
  type CourierAddress,
  type DeliverableItem,
} from "./courier/index.ts";
import type {
  OrderCheckoutInput,
  OrderCheckoutItem,
  WholesaleShippingAddress,
} from "./order.ts";
import { wholesaleItemsSubtotalExGst } from "./wholesale-tier-discount.ts";

type ProductShippingRow = {
  id: number;
  name: string;
  is_shippable: boolean;
  ship_weight_kg: number | null;
  ship_length_cm: number | null;
  ship_width_cm: number | null;
  ship_height_cm: number | null;
};

type ShippingOriginRow = {
  id: number;
  name: string;
  address: string;
  suburb: string | null;
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

function parseAustralianPostcode(address: string): string | null {
  const matches = address.match(/\b(\d{4})\b/g);
  if (!matches?.length) return null;
  return matches[matches.length - 1] ?? null;
}

function buildSenderFromStore(
  store: ShippingOriginRow,
): CourierAddress | null {
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

function buildReceiverFromShippingAddress(
  shipping: WholesaleShippingAddress,
): CourierAddress {
  return {
    postcode: shipping.postal_code.trim(),
    suburb: shipping.city.trim().toUpperCase(),
    type: shipping.dba_name.trim() ? "business" : "residential",
    country: profileCountryCode(shipping.country),
  };
}

async function fetchProductShipping(
  supabase: SupabaseClient,
  productIds: number[],
): Promise<Map<number, ProductShippingRow>> {
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
      const product = row as ProductShippingRow;
      return [product.id, product] as const;
    }),
  );
}

async function fetchShippingOriginStore(
  supabase: SupabaseClient,
): Promise<ShippingOriginRow | null> {
  const { data, error } = await supabase
    .from("store_locations")
    .select("id, name, address, suburb")
    .eq("is_shipping", true)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`store_locations: ${error.message}`);
  }

  return (data as ShippingOriginRow | null) ?? null;
}

function buildFreightItems(
  items: OrderCheckoutItem[],
  products: Map<number, ProductShippingRow>,
): DeliverableItem[] {
  const freightItems: DeliverableItem[] = [];

  for (const line of items) {
    const product = products.get(line.productId);
    if (!product?.is_shippable) continue;

    const weight = positiveNumber(product.ship_weight_kg);
    const length = positiveNumber(product.ship_length_cm);
    const width = positiveNumber(product.ship_width_cm);
    const height = positiveNumber(product.ship_height_cm);
    if (weight == null || length == null || width == null || height == null) {
      continue;
    }

    freightItems.push({
      weight,
      length,
      width,
      height,
      quantity: line.qty,
      description: product.name || line.itemName,
    });
  }

  return freightItems;
}

function selectMostExpensiveQuoteTotal(
  quotes: { total: number }[],
): number | null {
  if (quotes.length === 0) return null;
  const max = quotes.reduce((best, current) =>
    current.total > best.total ? current : best
  );
  return Number(max.total.toFixed(2));
}

/**
 * Resolve wholesale delivery fee via the same cached courier quotes used by
 * `shipping-quotes` (Postgres cache keyed by normalized freight input).
 */
export async function resolveWholesaleShippingFee(
  supabase: SupabaseClient,
  input: OrderCheckoutInput,
): Promise<number> {
  if (input.fulfillmentType === "pick_up") {
    return 0;
  }

  if (!input.shippingAddress) {
    throw new Error("Shipping address is required to quote delivery");
  }

  const shippingOrigin = await fetchShippingOriginStore(supabase);
  if (!shippingOrigin) {
    throw new Error("Shipping origin is not configured");
  }

  const sender = buildSenderFromStore(shippingOrigin);
  if (!sender) {
    throw new Error("Shipping origin address is incomplete");
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const products = await fetchProductShipping(supabase, productIds);
  const freightItems = buildFreightItems(input.items, products);
  if (freightItems.length === 0) {
    throw new Error("No shippable items in this order");
  }

  const receiver = buildReceiverFromShippingAddress(input.shippingAddress);
  const declaredValueExGst = wholesaleItemsSubtotalExGst(input.items);

  const result = await getCourierQuotesCached(
    {
      items: freightItems,
      sender,
      receiver,
      declaredValue: declaredValueExGst,
    },
    supabase,
  );

  const shippingFee = selectMostExpensiveQuoteTotal(result.quotes);
  if (shippingFee == null) {
    const firstError = result.errors[0];
    throw new Error(
      firstError
        ? `Shipping quote unavailable (${firstError.courier}: ${firstError.code})`
        : "Shipping quote unavailable for this order",
    );
  }

  return shippingFee;
}
