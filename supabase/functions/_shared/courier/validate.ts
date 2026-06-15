import type {
  CourierAddress,
  CourierAddressType,
  CourierProvider,
  DeliverableItem,
  GetCourierQuotesInput,
} from "./types.ts";

const ADDRESS_TYPES = new Set<CourierAddressType>(["business", "residential"]);
const COURIER_PROVIDERS = new Set<CourierProvider>(["transdirect"]);

function parsePositiveNumber(
  value: unknown,
  field: string,
): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error(`Invalid ${field}: must be a positive number`);
  }
  return num;
}

function parseNonNegativeNumber(
  value: unknown,
  field: string,
): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Invalid ${field}: must be zero or greater`);
  }
  return num;
}

function parseAddress(value: unknown, field: string): CourierAddress {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid ${field}: address is required`);
  }

  const data = value as Record<string, unknown>;
  const postcode = String(data.postcode ?? "").trim();
  const suburb = String(data.suburb ?? "").trim();
  const type = String(data.type ?? "").trim().toLowerCase() as CourierAddressType;
  const country = data.country != null
    ? String(data.country).trim().toUpperCase()
    : undefined;

  if (!postcode) {
    throw new Error(`Invalid ${field}: postcode is required`);
  }
  if (!suburb) {
    throw new Error(`Invalid ${field}: suburb is required`);
  }
  if (!ADDRESS_TYPES.has(type)) {
    throw new Error(
      `Invalid ${field}: type must be "business" or "residential"`,
    );
  }

  return { postcode, suburb, type, country };
}

function parseItem(value: unknown, index: number): DeliverableItem {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid items[${index}]: item is required`);
  }

  const data = value as Record<string, unknown>;
  const description = data.description != null
    ? String(data.description).trim()
    : undefined;

  return {
    weight: parsePositiveNumber(data.weight, `items[${index}].weight`),
    height: parsePositiveNumber(data.height, `items[${index}].height`),
    width: parsePositiveNumber(data.width, `items[${index}].width`),
    length: parsePositiveNumber(data.length, `items[${index}].length`),
    quantity: parsePositiveNumber(data.quantity, `items[${index}].quantity`),
    description: description || undefined,
  };
}

function parseProviders(value: unknown): CourierProvider[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Invalid providers: must be a non-empty array");
  }

  const providers = value.map((entry, index) => {
    const provider = String(entry ?? "").trim().toLowerCase() as CourierProvider;
    if (!COURIER_PROVIDERS.has(provider)) {
      throw new Error(`Invalid providers[${index}]: unknown provider`);
    }
    return provider;
  });

  return providers;
}

export function validateFreightDeclaration(body: unknown): GetCourierQuotesInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("At least one deliverable item is required");
  }

  const items = data.items.map((item, index) => parseItem(item, index));
  const sender = parseAddress(data.sender, "sender");
  const receiver = parseAddress(data.receiver, "receiver");

  const declaredValue = data.declaredValue != null
    ? parseNonNegativeNumber(data.declaredValue, "declaredValue")
    : undefined;

  const tailgatePickup = data.tailgatePickup != null
    ? Boolean(data.tailgatePickup)
    : undefined;
  const tailgateDelivery = data.tailgateDelivery != null
    ? Boolean(data.tailgateDelivery)
    : undefined;
  const providers = parseProviders(data.providers);

  return {
    items,
    sender,
    receiver,
    declaredValue,
    tailgatePickup,
    tailgateDelivery,
    providers,
  };
}
