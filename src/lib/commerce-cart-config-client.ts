import { SHORT_REVALIDATE_SECONDS } from "@/config/settings";
import type { CommerceCartConfigPayload } from "@/lib/commerce-cart-config-payload";
import {
  DEFAULT_SELF_DELIVERY_FEE,
  DEFAULT_SELF_DELIVERY_ORIGIN,
  DEFAULT_WHOLESALE_CART_CONFIG,
} from "@/lib/site-chrome-defaults";

const STORAGE_KEY = "saigon-commerce-cart-config-v1";
const CLIENT_CACHE_TTL_MS = SHORT_REVALIDATE_SECONDS * 1000;

type CachedCommerceCartConfig = {
  fetchedAt: number;
  payload: CommerceCartConfigPayload;
};

export const DEFAULT_COMMERCE_CART_CONFIG: CommerceCartConfigPayload = {
  deliveryCities: [],
  wholesaleCartConfig: DEFAULT_WHOLESALE_CART_CONFIG,
  selfDeliveryFee: DEFAULT_SELF_DELIVERY_FEE,
  selfDeliveryOrigin: DEFAULT_SELF_DELIVERY_ORIGIN,
};

function readCachedConfig(): CommerceCartConfigPayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedCommerceCartConfig;
    if (
      !parsed?.payload ||
      typeof parsed.fetchedAt !== "number" ||
      Date.now() - parsed.fetchedAt > CLIENT_CACHE_TTL_MS
    ) {
      return null;
    }

    return parsed.payload;
  } catch {
    return null;
  }
}

function writeCachedConfig(payload: CommerceCartConfigPayload): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fetchedAt: Date.now(),
        payload,
      } satisfies CachedCommerceCartConfig),
    );
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

let inFlight: Promise<CommerceCartConfigPayload> | null = null;

export async function fetchCommerceCartConfig(): Promise<CommerceCartConfigPayload> {
  const cached = readCachedConfig();
  if (cached) return cached;

  if (inFlight) return inFlight;

  inFlight = (async () => {
    const response = await fetch("/api/commerce-cart-config", {
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("Failed to load commerce cart configuration");
    }

    const payload = (await response.json()) as CommerceCartConfigPayload;
    writeCachedConfig(payload);
    return payload;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
