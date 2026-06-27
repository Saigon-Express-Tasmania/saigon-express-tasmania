import { withCateringOrderTotals, type CateringOrderTotalsOptions, cateringBillingFromShippingForm } from "@/lib/catering-order-review";
import type { CateringCartItem } from "@/contexts/CateringCartContext";
import type { CateringOrderReviewForm } from "@/types/CateringOrderReview";

const STORAGE_KEY = "saigon-catering-order-review-draft";
const GUEST_PROFILE_STORAGE_KEY = "saigon-catering-guest-checkout-profile";
const DRAFT_VERSION = 1;
const GUEST_PROFILE_VERSION = 1;

export type CateringOrderReviewPersistedFields = Omit<
  CateringOrderReviewForm,
  | "subtotal"
  | "coupon_discount"
  | "wholesale_discount"
  | "tax_total"
  | "shipping_fee"
  | "grand_total"
>;

export type CateringGuestCheckoutProfile = Omit<
  CateringOrderReviewPersistedFields,
  "event_date"
>;

export type CateringOrderReviewDraft = {
  version: typeof DRAFT_VERSION;
  cartItemsSignature: string;
  billingSameAsShipping: boolean;
  form: CateringOrderReviewPersistedFields;
};

type StoredGuestProfile = {
  version: typeof GUEST_PROFILE_VERSION;
  form: CateringGuestCheckoutProfile;
};

export function buildCateringCartItemsSignature(
  items: { lineKey: string; qty: number }[],
): string {
  return [...items]
    .sort((a, b) => a.lineKey.localeCompare(b.lineKey))
    .map((item) => `${item.lineKey}:${item.qty}`)
    .join(",");
}

export function extractPersistableCateringReviewFields(
  review: CateringOrderReviewForm,
): CateringOrderReviewPersistedFields {
  const {
    subtotal: _subtotal,
    coupon_discount: _couponDiscount,
    wholesale_discount: _wholesaleDiscount,
    tax_total: _taxTotal,
    shipping_fee: _shippingFee,
    grand_total: _grandTotal,
    ...persisted
  } = review;
  return persisted;
}

export function extractCateringGuestCheckoutProfile(
  review: CateringOrderReviewForm,
): CateringGuestCheckoutProfile {
  const { event_date: _eventDate, ...profile } =
    extractPersistableCateringReviewFields(review);
  return profile;
}

export function readCateringGuestCheckoutProfile(): CateringGuestCheckoutProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(GUEST_PROFILE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredGuestProfile;
    if (parsed.version !== GUEST_PROFILE_VERSION) return null;
    if (!parsed.form || typeof parsed.form !== "object") return null;

    return parsed.form;
  } catch {
    return null;
  }
}

export function writeCateringGuestCheckoutProfile(
  review: CateringOrderReviewForm,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      GUEST_PROFILE_STORAGE_KEY,
      JSON.stringify({
        version: GUEST_PROFILE_VERSION,
        form: extractCateringGuestCheckoutProfile(review),
      } satisfies StoredGuestProfile),
    );
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

export function readCateringOrderReviewDraft(): CateringOrderReviewDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CateringOrderReviewDraft;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (
      typeof parsed.cartItemsSignature !== "string" ||
      typeof parsed.billingSameAsShipping !== "boolean" ||
      !parsed.form ||
      typeof parsed.form !== "object"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeCateringOrderReviewDraft(draft: CateringOrderReviewDraft): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...draft,
        version: DRAFT_VERSION,
      }),
    );
  } catch {
    // Ignore quota or private-mode storage errors.
  }
}

export function clearCateringOrderReviewDraft(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function readCateringOrderReviewBillingSameAsShipping(
  cartItemsSignature: string,
): boolean | null {
  const draft = readCateringOrderReviewDraft();
  if (!draft || draft.cartItemsSignature !== cartItemsSignature) {
    return null;
  }
  return draft.billingSameAsShipping;
}

export function hydrateCateringOrderReview(
  base: CateringOrderReviewForm,
  cartItemsSignature: string,
  items: CateringCartItem[],
  tax?: import("@/lib/gst").CommerceTaxSettings,
  totalsOptions?: CateringOrderTotalsOptions,
): CateringOrderReviewForm {
  const options: CateringOrderTotalsOptions = totalsOptions ?? { tax };
  const isMemberBase = Boolean(base.customer_email.trim());
  const guestProfile = isMemberBase ? null : readCateringGuestCheckoutProfile();
  const draft = readCateringOrderReviewDraft();

  let merged: CateringOrderReviewForm = {
    ...base,
    requested_fulfillment_method:
      base.requested_fulfillment_method ?? "delivery",
    requested_pick_up_store_id: base.requested_pick_up_store_id ?? null,
  };

  if (guestProfile) {
    merged = {
      ...merged,
      ...guestProfile,
      event_date: "",
    };
  }

  if (draft && draft.cartItemsSignature === cartItemsSignature) {
    merged = {
      ...merged,
      ...draft.form,
      ...(isMemberBase
        ? {
            customer_name: base.customer_name,
            customer_email: base.customer_email,
            customer_phone: base.customer_phone,
          }
        : {
            event_date: "",
          }),
    };
    if (
      draft.billingSameAsShipping &&
      merged.requested_fulfillment_method !== "pick_up"
    ) {
      merged = cateringBillingFromShippingForm(merged);
    }
  } else if (
    merged.requested_fulfillment_method !== "pick_up" &&
    merged.shipping_city.trim() &&
    merged.shipping_postal_code.trim() &&
    !merged.billing_address.trim()
  ) {
    merged = cateringBillingFromShippingForm(merged);
  }

  return withCateringOrderTotals(merged, items, options);
}
