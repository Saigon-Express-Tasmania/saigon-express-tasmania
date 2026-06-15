/** Courier aggregator backends (Transdirect wraps multiple carriers). */
export type CourierProvider = "transdirect";

export type CourierAddressType = "business" | "residential";

export type CourierAddress = {
  postcode: string;
  suburb: string;
  type: CourierAddressType;
  /** ISO 3166-1 alpha-2; defaults to AU. */
  country?: string;
};

/** A parcel or carton to ship. Dimensions in cm, weight in kg. */
export type DeliverableItem = {
  weight: number;
  height: number;
  width: number;
  length: number;
  quantity: number;
  description?: string;
};

export type GetCourierQuotesInput = {
  items: DeliverableItem[];
  sender: CourierAddress;
  receiver: CourierAddress;
  /** Declared value in AUD for insurance quoting. */
  declaredValue?: number;
  tailgatePickup?: boolean;
  tailgateDelivery?: boolean;
  /** Defaults to all registered providers. */
  providers?: CourierProvider[];
};

/** A single carrier option returned from one or more providers. */
export type CourierQuote = {
  provider: CourierProvider;
  /** Carrier slug, e.g. `aramex`, `tnt_road_express`. */
  courier: string;
  /** Total price in AUD (incl. GST where applicable). */
  total: number;
  currency: "AUD";
  transitTime?: string;
  service?: string;
  priceInsuranceEx?: number;
  fee?: number;
  gst?: number;
  pickupDates?: string[];
};

export type CourierQuoteError = {
  provider: CourierProvider;
  courier: string;
  code: string;
};

export type CourierProviderRef = {
  bookingId: number;
};

export type GetCourierQuotesResult = {
  /** Sorted cheapest-first across all providers. */
  quotes: CourierQuote[];
  errors: CourierQuoteError[];
  providerRefs: Partial<Record<CourierProvider, CourierProviderRef>>;
};
