import { buildWholesaleOrderTotals } from "@/lib/wholesale-b2b-order";
import type { WholesalePricingTier } from "@/types";
import type { WholesaleOrderReviewForm } from "@/types/WholesaleB2BOrder";

const STORAGE_KEY = "saigon-wholesale-order-review-draft";
const DRAFT_VERSION = 1;

export type WholesaleOrderReviewPersistedFields = Omit<
  WholesaleOrderReviewForm,
  "subtotal" | "wholesale_discount" | "tax_total" | "shipping_fee" | "grand_total"
>;

export type WholesaleOrderReviewDraft = {
  version: typeof DRAFT_VERSION;
  cartItemsSignature: string;
  billingSameAsShipping: boolean;
  form: WholesaleOrderReviewPersistedFields;
};

export function buildWholesaleCartItemsSignature(
  items: { productId: number; qty: number }[],
): string {
  return items.map((item) => `${item.productId}:${item.qty}`).join(",");
}

export function extractPersistableReviewFields(
  review: WholesaleOrderReviewForm,
): WholesaleOrderReviewPersistedFields {
  const {
    subtotal: _subtotal,
    wholesale_discount: _wholesaleDiscount,
    tax_total: _taxTotal,
    shipping_fee: _shippingFee,
    grand_total: _grandTotal,
    ...persisted
  } = review;
  return persisted;
}

export function readWholesaleOrderReviewDraft(): WholesaleOrderReviewDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as WholesaleOrderReviewDraft;
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

export function writeWholesaleOrderReviewDraft(draft: WholesaleOrderReviewDraft): void {
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

export function clearWholesaleOrderReviewDraft(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function readWholesaleOrderReviewBillingSameAsShipping(
  cartItemsSignature: string,
): boolean | null {
  const draft = readWholesaleOrderReviewDraft();
  if (!draft || draft.cartItemsSignature !== cartItemsSignature) {
    return null;
  }
  return draft.billingSameAsShipping;
}

export function hydrateWholesaleOrderReview(
  base: WholesaleOrderReviewForm,
  cartItemsSignature: string,
  pricingLines: { qty: number; unitPriceExGst: number }[],
  pricingTiers: WholesalePricingTier[],
): WholesaleOrderReviewForm {
  const draft = readWholesaleOrderReviewDraft();
  const totals = buildWholesaleOrderTotals(pricingLines, pricingTiers, 0);

  if (!draft || draft.cartItemsSignature !== cartItemsSignature) {
    return { ...base, ...totals };
  }

  return {
    ...base,
    ...draft.form,
    customer_name: base.customer_name,
    customer_email: base.customer_email,
    customer_phone: base.customer_phone,
    ...totals,
  };
}
