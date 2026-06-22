import { withCateringOrderTotals } from "@/lib/catering-order-review";
import type { CateringCartItem } from "@/contexts/CateringCartContext";
import type { CateringOrderReviewForm } from "@/types/CateringOrderReview";

const STORAGE_KEY = "saigon-catering-order-review-draft";
const DRAFT_VERSION = 1;

export type CateringOrderReviewPersistedFields = Omit<
  CateringOrderReviewForm,
  | "subtotal"
  | "coupon_discount"
  | "wholesale_discount"
  | "tax_total"
  | "shipping_fee"
  | "grand_total"
>;

export type CateringOrderReviewDraft = {
  version: typeof DRAFT_VERSION;
  cartItemsSignature: string;
  form: CateringOrderReviewPersistedFields;
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

export function readCateringOrderReviewDraft(): CateringOrderReviewDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CateringOrderReviewDraft;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (
      typeof parsed.cartItemsSignature !== "string" ||
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

export function hydrateCateringOrderReview(
  base: CateringOrderReviewForm,
  cartItemsSignature: string,
  items: CateringCartItem[],
  tax?: import("@/lib/gst").CommerceTaxSettings,
): CateringOrderReviewForm {
  const draft = readCateringOrderReviewDraft();
  if (!draft || draft.cartItemsSignature !== cartItemsSignature) {
    return withCateringOrderTotals(base, items, tax);
  }

  const isMemberBase = Boolean(base.customer_email.trim());

  return withCateringOrderTotals(
    {
      ...base,
      ...draft.form,
      ...(isMemberBase
        ? {
            customer_name: base.customer_name,
            customer_email: base.customer_email,
            customer_phone: base.customer_phone,
          }
        : {}),
    },
    items,
    tax,
  );
}
