"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { DayPicker } from "react-day-picker";
import WholesaleCartItemThumbnail from "@/components/WholesaleCartItemThumbnail";
import type { WholesaleCartItem } from "@/contexts/WholesaleCartContext";
import { formatStoreHours } from "@/lib/store-hours";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUSTRALIAN_STATES,
  billingFromShippingForm,
  buildWholesaleOrderTotals,
  isBillingSameAsShippingForm,
  WHOLESALE_DEFAULT_COUNTRY,
  WHOLESALE_FULFILLMENT_OPTIONS,
  WHOLESALE_PAYMENT_TERMS_OPTIONS,
  hasWholesalePickupStoreSelected,
} from "@/lib/wholesale-b2b-order";
import {
  fetchWholesaleFreightQuote,
  formatShippingQuoteError,
  prepareWholesaleFreightQuoteContext,
  readWholesaleFreightQuoteTotal,
} from "@/lib/wholesale-freight";
import { filterActiveStoreLocations } from "@/lib/supabase/store-locations-client";
import { cn } from "@/lib/utils";
import type { AustralianStateCode, WholesaleOrderReviewForm } from "@/types/WholesaleB2BOrder";
import type { StoreLocation, WholesalePricingTier } from "@/types";
import { ArrowLeft, CalendarIcon, Check, CreditCard, Loader2, MapPin, Phone } from "lucide-react";
import "react-day-picker/style.css";

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/40";

const selectTriggerClass =
  "h-10 w-full border-white/15 bg-black/40 text-white shadow-none focus-visible:border-primary/50 focus-visible:ring-primary/30 [&>span]:text-white";

const selectIconClass = "text-white/60";

const selectContentClass =
  "z-[60] border-white/15 bg-[#121212] text-white shadow-2xl";

const selectItemClass =
  "text-white focus:bg-white/10 data-[highlighted]:bg-white/10";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-xs text-white/40">{description}</p>
      ) : null}
    </div>
  );
}

function ReviewSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={selectTriggerClass} iconClassName={selectIconClass}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={selectContentClass}>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={selectItemClass}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function ReviewDatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    const datePart = value.length >= 10 ? value.slice(0, 10) : value;
    try {
      const parsed = parseISO(datePart);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  }, [value]);

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  return (
    <Field label={label}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              fieldClass,
              "flex items-center justify-between gap-2 text-left",
            )}
          >
            <span>
              {selectedDate
                ? format(selectedDate, "d MMMM yyyy")
                : "Select delivery date"}
            </span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-white/45" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-[60] w-auto border-white/15 bg-[#121212] p-3 text-white shadow-2xl"
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }}
            disabled={{ before: today }}
            className="wholesale-review-calendar"
            classNames={{
              root: "text-white",
              month_caption: "flex justify-center pb-2 text-sm font-semibold",
              weekday: "w-9 text-center text-xs text-white/45",
              day: "p-0",
              day_button:
                "h-9 w-9 rounded-md text-sm text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              selected:
                "[&>button]:bg-primary [&>button]:text-white [&>button]:hover:bg-primary/90",
              today: "[&>button]:border [&>button]:border-primary/50",
              outside: "[&>button]:text-white/25",
              disabled: "[&>button]:text-white/20 [&>button]:hover:bg-transparent",
            }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function fulfillmentDateLabel(method: WholesaleOrderReviewForm["requested_fulfillment_method"]) {
  if (method === "pick_up") return "When would you like to pick up your order?";
  if (method === "shipping") return "When would you like your order to be shipped?";
  return "When would you like your order to be delivered?";
}

function fulfillmentSectionDescription(
  method: WholesaleOrderReviewForm["requested_fulfillment_method"],
) {
  if (method === "pick_up") {
    return "Choose where and when you will collect your order";
  }
  if (method === "shipping") {
    return "Fulfillment method and requested shipping date";
  }
  return "Fulfillment method and requested delivery date";
}

function PickupStorePicker({
  stores,
  selectedId,
  onSelect,
}: {
  stores: StoreLocation[];
  selectedId: number | null;
  onSelect: (storeId: number) => void;
}) {
  if (stores.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/45">
        No pickup locations are available right now.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {stores.map((store) => {
        const selected = selectedId === store.id;
        return (
          <button
            key={store.id}
            type="button"
            onClick={() => onSelect(store.id)}
            className={cn(
              "group relative flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition-all",
              selected
                ? "border-primary/70 bg-primary/10 ring-1 ring-primary/40"
                : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/[0.07]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    selected
                      ? "border-primary/50 bg-primary/20 text-primary"
                      : "border-white/10 bg-black/30 text-white/45 group-hover:text-white/70",
                  )}
                >
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{store.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/45">
                    {store.address}
                    {store.suburb ? `, ${store.suburb}` : ""}
                  </p>
                </div>
              </div>
              {selected ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>
            {store.phone ? (
              <p className="flex items-center gap-1.5 pl-10 text-xs text-white/35">
                <Phone className="h-3 w-3 shrink-0" />
                {store.phone}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function withDeliveryFee(
  review: WholesaleOrderReviewForm,
  lines: { qty: number; unitPriceExGst: number }[],
  tiers: WholesalePricingTier[],
  deliveryFee: number,
): WholesaleOrderReviewForm {
  return {
    ...review,
    ...buildWholesaleOrderTotals(lines, tiers, deliveryFee),
  };
}

type DeliveryQuoteStatus =
  | "pickup"
  | "incomplete_address"
  | "no_shipping_origin"
  | "no_shippable_items"
  | "pending"
  | "cached"
  | "ready"
  | "loading"
  | "error";

export default function WholesaleOrderReviewPanel({
  items,
  cartSubtotalExGst,
  pricingTiers,
  storeLocations,
  review,
  onReviewChange,
  onBack,
  onConfirm,
  isCheckingOut,
}: {
  items: WholesaleCartItem[];
  cartSubtotalExGst: number;
  pricingTiers: WholesalePricingTier[];
  storeLocations: StoreLocation[];
  review: WholesaleOrderReviewForm;
  onReviewChange: (next: WholesaleOrderReviewForm) => void;
  onBack: () => void;
  onConfirm: () => void;
  isCheckingOut: boolean;
}) {
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(() =>
    isBillingSameAsShippingForm(review),
  );
  const [deliveryQuoteStatus, setDeliveryQuoteStatus] =
    useState<DeliveryQuoteStatus>("pickup");
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const quoteContextRequestIdRef = useRef(0);
  const quoteCalculateRequestIdRef = useRef(0);
  const isPickup = review.requested_fulfillment_method === "pick_up";
  const cartItemsSignature = useMemo(
    () => items.map((item) => `${item.productId}:${item.qty}`).join(","),
    [items],
  );
  const pricingLines = useMemo(
    () =>
      items.map((item) => ({
        qty: item.qty,
        unitPriceExGst: Number(item.unitPrice),
      })),
    [items],
  );
  const pickupStores = useMemo(
    () => filterActiveStoreLocations(storeLocations),
    [storeLocations],
  );
  const selectedPickupStore = useMemo(
    () =>
      review.requested_pick_up_store_id != null
        ? pickupStores.find((store) => store.id === review.requested_pick_up_store_id) ?? null
        : null,
    [review.requested_pick_up_store_id, pickupStores],
  );
  const selectedPickupHours = formatStoreHours(selectedPickupStore?.hours ?? null);
  const couponDiscount = review.coupon_discount ?? 0;
  const totalDiscount = review.wholesale_discount + couponDiscount;

  useEffect(() => {
    if (isPickup) {
      setDeliveryQuoteStatus("pickup");
      setDeliveryError(null);
      onReviewChange(
        withDeliveryFee(review, pricingLines, pricingTiers, 0),
      );
      return;
    }

    const requestId = ++quoteContextRequestIdRef.current;
    setDeliveryError(null);

    void (async () => {
      try {
        const context = await prepareWholesaleFreightQuoteContext(
          items,
          storeLocations,
          review,
          cartSubtotalExGst,
        );
        if (requestId !== quoteContextRequestIdRef.current) return;

        if (context.status === "incomplete_address") {
          setDeliveryQuoteStatus("incomplete_address");
          onReviewChange(
            withDeliveryFee(review, pricingLines, pricingTiers, 0),
          );
          return;
        }

        if (context.status === "no_shipping_origin") {
          setDeliveryQuoteStatus("no_shipping_origin");
          onReviewChange(
            withDeliveryFee(review, pricingLines, pricingTiers, 0),
          );
          return;
        }

        if (context.status === "no_shippable_items") {
          setDeliveryQuoteStatus("no_shippable_items");
          onReviewChange(
            withDeliveryFee(review, pricingLines, pricingTiers, 0),
          );
          return;
        }

        const cachedTotal = readWholesaleFreightQuoteTotal(context.payloadHash);
        if (cachedTotal != null) {
          setDeliveryQuoteStatus("cached");
          onReviewChange(
            withDeliveryFee(
              review,
              pricingLines,
              pricingTiers,
              Number(cachedTotal.toFixed(2)),
            ),
          );
          return;
        }

        setDeliveryQuoteStatus("pending");
        onReviewChange(
          withDeliveryFee(review, pricingLines, pricingTiers, 0),
        );
      } catch (err) {
        if (requestId !== quoteContextRequestIdRef.current) return;
        setDeliveryQuoteStatus("error");
        setDeliveryError(
          formatShippingQuoteError(
            err instanceof Error
              ? err.message
              : "Unable to prepare shipping quote",
          ),
        );
        onReviewChange(
          withDeliveryFee(review, pricingLines, pricingTiers, 0),
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh cache lookup when shipping inputs change
  }, [
    isPickup,
    cartItemsSignature,
    cartSubtotalExGst,
    pricingTiers,
    review.shipping_postal_code,
    review.shipping_city,
    review.shipping_dba_name,
    review.requested_fulfillment_method,
    storeLocations,
  ]);

  const handleCalculateShippingQuote = async () => {
    const requestId = ++quoteCalculateRequestIdRef.current;
    setDeliveryQuoteStatus("loading");
    setDeliveryError(null);

    try {
      const context = await prepareWholesaleFreightQuoteContext(
        items,
        storeLocations,
        review,
        cartSubtotalExGst,
      );
      if (requestId !== quoteCalculateRequestIdRef.current) return;

      if (context.status !== "quotable") {
        setDeliveryQuoteStatus(context.status);
        onReviewChange(
          withDeliveryFee(review, pricingLines, pricingTiers, 0),
        );
        return;
      }

      const { total } = await fetchWholesaleFreightQuote(
        context.payload,
        context.payloadHash,
      );
      if (requestId !== quoteCalculateRequestIdRef.current) return;

      setDeliveryQuoteStatus("ready");
      onReviewChange(
        withDeliveryFee(
          review,
          pricingLines,
          pricingTiers,
          Number(total.toFixed(2)),
        ),
      );
    } catch (err) {
      if (requestId !== quoteCalculateRequestIdRef.current) return;
      setDeliveryQuoteStatus("error");
      setDeliveryError(
        formatShippingQuoteError(
          err instanceof Error
            ? err.message
            : "Failed to calculate shipping quote",
        ),
      );
      onReviewChange(
        withDeliveryFee(review, pricingLines, pricingTiers, 0),
      );
    }
  };

  const handlePrimaryAction = () => {
    if (isPickup) {
      onConfirm();
      return;
    }

    if (deliveryQuoteStatus === "cached" || deliveryQuoteStatus === "ready") {
      onConfirm();
      return;
    }

    void handleCalculateShippingQuote();
  };

  useEffect(() => {
    if (isPickup && billingSameAsShipping) {
      setBillingSameAsShipping(false);
    }
  }, [isPickup, billingSameAsShipping]);

  const showFullBillingFields = isPickup || !billingSameAsShipping;
  const pickupStoreMissing =
    isPickup && !hasWholesalePickupStoreSelected(review);
  const pickupStoreInvalid =
    isPickup &&
    hasWholesalePickupStoreSelected(review) &&
    pickupStores.length > 0 &&
    !pickupStores.some((store) => store.id === review.requested_pick_up_store_id);
  const needsDeliveryQuote = !isPickup;
  const shippingQuoteReady =
    deliveryQuoteStatus === "cached" || deliveryQuoteStatus === "ready";
  const canCalculateShippingQuote =
    needsDeliveryQuote &&
    (deliveryQuoteStatus === "pending" || deliveryQuoteStatus === "error");
  const canConfirmCheckout = isPickup
    ? !pickupStoreMissing && !pickupStoreInvalid
    : shippingQuoteReady;
  const primaryButtonDisabled =
    isCheckingOut ||
    deliveryQuoteStatus === "loading" ||
    (isPickup ? pickupStoreMissing || pickupStoreInvalid : !canConfirmCheckout && !canCalculateShippingQuote);

  const deliveryLineMessage = (() => {
    if (isPickup) return null;
    switch (deliveryQuoteStatus) {
      case "incomplete_address":
        return "Complete shipping address";
      case "no_shipping_origin":
        return "Shipping origin unavailable";
      case "no_shippable_items":
        return "No shippable items in cart";
      case "pending":
        return "To be calculated";
      case "loading":
        return null;
      case "error":
        return "Unavailable";
      case "cached":
      case "ready":
        return null;
      default:
        return null;
    }
  })();

  const footerHelperMessage = (() => {
    if (pickupStoreMissing) {
      return "A pickup location is required before you can pay.";
    }
    if (isPickup) return null;
    if (deliveryQuoteStatus === "incomplete_address") {
      return "Complete your shipping address to request a shipping quote.";
    }
    if (deliveryQuoteStatus === "no_shipping_origin") {
      return "A shipping origin is not configured. Please contact us to complete this order.";
    }
    if (deliveryQuoteStatus === "no_shippable_items") {
      return "This order has no shippable items. Delivery cannot be quoted.";
    }
    if (deliveryQuoteStatus === "loading") {
      return "Calculating shipping quote…";
    }
    if (deliveryQuoteStatus === "error") {
      return deliveryError ?? "Shipping quote could not be calculated. Please review your shipping address and try again.";
    }
    return null;
  })();

  const withAustralia = (
    next: Partial<WholesaleOrderReviewForm>,
  ): Partial<WholesaleOrderReviewForm> => ({
    ...next,
    shipping_country: WHOLESALE_DEFAULT_COUNTRY,
    billing_country: WHOLESALE_DEFAULT_COUNTRY,
  });

  const patch = (next: Partial<WholesaleOrderReviewForm>) => {
    onReviewChange({ ...review, ...withAustralia(next) });
  };

  const patchShipping = (next: Partial<WholesaleOrderReviewForm>) => {
    const merged = { ...review, ...withAustralia(next) };
    onReviewChange(
      billingSameAsShipping ? billingFromShippingForm(merged) : merged,
    );
  };

  const handleBillingSameAsShippingChange = (checked: boolean) => {
    setBillingSameAsShipping(checked);
    if (checked) {
      onReviewChange(billingFromShippingForm(review));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <button
          type="button"
          onClick={onBack}
          disabled={isCheckingOut}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-40"
          aria-label="Back to cart"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="font-serif text-xl font-bold text-white">
            Review order
          </h2>
          <p className="text-xs text-white/45">
            Confirm details before secure payment
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <ReviewSelect
              label="How do you want to receive your order?"
              value={review.requested_fulfillment_method}
              onValueChange={(value) => {
                const method = value as WholesaleOrderReviewForm["requested_fulfillment_method"];
                if (method === "pick_up") {
                  setBillingSameAsShipping(false);
                }
                patch({
                  requested_fulfillment_method: method,
                  requested_pick_up_store_id:
                    method === "pick_up" ? review.requested_pick_up_store_id : null,
                });
              }}
              options={WHOLESALE_FULFILLMENT_OPTIONS}
            />
            <ReviewDatePicker
              label={fulfillmentDateLabel(review.requested_fulfillment_method)}
              value={review.requested_target_date}
              onChange={(value) => patch({ requested_target_date: value })}
            />
          </div>
          {isPickup ? (
            <div className="space-y-2 pt-1">
              <Field label="Pickup store (required)">
                <PickupStorePicker
                  stores={pickupStores}
                  selectedId={review.requested_pick_up_store_id}
                  onSelect={(storeId) =>
                    patch({ requested_pick_up_store_id: storeId })
                  }
                />
              </Field>
              {pickupStoreMissing ? (
                <p className="text-xs font-medium text-amber-400/90">
                  Select a pickup store to continue to payment.
                </p>
              ) : pickupStoreInvalid ? (
                <p className="text-xs font-medium text-destructive">
                  The selected pickup store is no longer available. Please choose
                  another location.
                </p>
              ) : selectedPickupStore ? (
                <p className="text-xs text-white/40">
                  You will collect your order from{" "}
                  <span className="text-white/70">{selectedPickupStore.name}</span>
                  {selectedPickupHours ? ` · ${selectedPickupHours}` : ""}
                </p>
              ) : (
                <p className="text-xs text-white/40">
                  Select the store where you would like to pick up your wholesale order.
                </p>
              )}
            </div>
          ) : null}
        </section>

        {!isPickup ? (
          <section className="space-y-3">
            <SectionTitle title="Shipping address" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="DBA / business name">
                <input
                  className={fieldClass}
                  value={review.shipping_dba_name}
                  onChange={(e) =>
                    patchShipping({ shipping_dba_name: e.target.value })
                  }
                />
              </Field>
              <Field label="Phone">
                <input
                  className={fieldClass}
                  value={review.customer_phone}
                  onChange={(e) => patch({ customer_phone: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Street address">
                  <input
                    className={fieldClass}
                    value={review.shipping_address}
                    onChange={(e) =>
                      patchShipping({ shipping_address: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Street line 2">
                  <input
                    className={fieldClass}
                    value={review.shipping_street_2 ?? ""}
                    onChange={(e) =>
                      patchShipping({
                        shipping_street_2: e.target.value || null,
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="City">
                <input
                  className={fieldClass}
                  value={review.shipping_city}
                  onChange={(e) => patchShipping({ shipping_city: e.target.value })}
                />
              </Field>
              <ReviewSelect
                label="State"
                value={review.shipping_state}
                onValueChange={(value) =>
                  patchShipping({ shipping_state: value as AustralianStateCode })
                }
                options={AUSTRALIAN_STATES.map((state) => ({
                  value: state.value,
                  label: state.label,
                }))}
              />
              <Field label="Postal code">
                <input
                  className={fieldClass}
                  value={review.shipping_postal_code}
                  onChange={(e) =>
                    patchShipping({ shipping_postal_code: e.target.value })
                  }
                />
              </Field>
              <Field label="Preferred delivery window">
                <input
                  className={fieldClass}
                  value={review.shipping_preferred_window ?? ""}
                  onChange={(e) =>
                    patchShipping({
                      shipping_preferred_window: e.target.value || null,
                    })
                  }
                  placeholder="e.g. 06:00 - 09:30"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Delivery instructions">
                  <textarea
                    className={`${fieldClass} min-h-[72px] resize-y`}
                    value={review.shipping_special_instructions ?? ""}
                    onChange={(e) =>
                      patchShipping({
                        shipping_special_instructions: e.target.value || null,
                      })
                    }
                    placeholder="Loading dock, access codes, etc."
                  />
                </Field>
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name">
              <input
                className={fieldClass}
                value={review.customer_name}
                onChange={(e) => patch({ customer_name: e.target.value })}
              />
            </Field>            
            <Field label="Email">
              <input
                type="email"
                className={fieldClass}
                value={review.customer_email}
                onChange={(e) => patch({ customer_email: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle title="Order items" />
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <WholesaleCartItemThumbnail
                  imageUrl={item.imageUrl}
                  alt={item.productName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {item.productName}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {item.qty} × ${Number(item.unitPrice).toFixed(2)} ex GST
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  ${(Number(item.unitPrice) * item.qty).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm">
          <SectionTitle title="Totals" />
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-white/60">
              <span>Subtotal (ex GST)</span>
              <span className="tabular-nums text-white">
                ${review.subtotal.toFixed(2)}
              </span>
            </div>
            {totalDiscount > 0 ? (
              <div className="flex justify-between text-white/60">
                <span>
                  {review.wholesale_discount > 0 && couponDiscount > 0
                    ? "Total discount"
                    : couponDiscount > 0
                      ? review.coupon_code?.trim()
                        ? `Coupon (${review.coupon_code.trim()})`
                        : "Coupon discount"
                      : "Wholesale tier discount"}
                </span>
                <span className="tabular-nums text-green-300">
                  -${totalDiscount.toFixed(2)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-white/60">
              <span>Tax total (GST)</span>
              <span className="tabular-nums text-white">
                ${review.tax_total.toFixed(2)}
              </span>
            </div>
            {!isPickup ? (
              <div className="flex justify-between text-white/60">
                <span>Delivery</span>
                {deliveryQuoteStatus === "loading" ? (
                  <span className="inline-flex items-center gap-2 tabular-nums text-white/70">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Calculating…
                  </span>
                ) : shippingQuoteReady ? (
                  <span className="tabular-nums text-white">
                    ${review.shipping_fee.toFixed(2)}
                  </span>
                ) : deliveryLineMessage ? (
                  <span className="text-right text-xs font-medium text-white/45 max-w-[55%]">
                    {deliveryLineMessage}
                  </span>
                ) : (
                  <span className="text-right text-xs font-medium text-white/45 max-w-[55%]">
                    To be calculated
                  </span>
                )}
              </div>
            ) : null}
            {!isPickup && deliveryQuoteStatus === "pending" ? (
              <p className="text-xs text-white/40">
                Shipping will be recalculated when you request a quote.
              </p>
            ) : null}
            {!isPickup && deliveryQuoteStatus === "error" && deliveryError ? (
              <p className="whitespace-pre-line text-xs text-amber-200/90">
                {deliveryError}
              </p>
            ) : null}
            <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
              <span>Grand total (inc GST)</span>
              <span className="tabular-nums text-primary">
                ${review.grand_total.toFixed(2)}
              </span>
            </div>
          </div>
        </section>        

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle
              title="Billing address"
              description={
                isPickup
                  ? "Required for your invoice and tax records"
                  : undefined
              }
            />
            {!isPickup ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(e) =>
                    handleBillingSameAsShippingChange(e.target.checked)
                  }
                  disabled={isCheckingOut}
                  className="h-4 w-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary/40"
                />
                Same as shipping address
              </label>
            ) : null}
          </div>
          {!isPickup && billingSameAsShipping ? (
            <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/45">
              Billing address matches shipping. Tax ID and payment terms still
              apply below.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {showFullBillingFields ? (
              <>
                <Field label="Legal name">
                  <input
                    className={fieldClass}
                    value={review.billing_legal_name}
                    onChange={(e) =>
                      patch({ billing_legal_name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Tax ID / ABN">
                  <input
                    className={fieldClass}
                    value={review.billing_tax_id ?? ""}
                    onChange={(e) =>
                      patch({ billing_tax_id: e.target.value || null })
                    }
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Street address">
                    <input
                      className={fieldClass}
                      value={review.billing_address}
                      onChange={(e) =>
                        patch({ billing_address: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Street line 2">
                    <input
                      className={fieldClass}
                      value={review.billing_street_2 ?? ""}
                      onChange={(e) =>
                        patch({
                          billing_street_2: e.target.value || null,
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label="City">
                  <input
                    className={fieldClass}
                    value={review.billing_city}
                    onChange={(e) => patch({ billing_city: e.target.value })}
                  />
                </Field>
                <ReviewSelect
                  label="State"
                  value={review.billing_state}
                  onValueChange={(value) =>
                    patch({ billing_state: value as AustralianStateCode })
                  }
                  options={AUSTRALIAN_STATES.map((state) => ({
                    value: state.value,
                    label: state.label,
                  }))}
                />
                <Field label="Postal code">
                  <input
                    className={fieldClass}
                    value={review.billing_postal_code}
                    onChange={(e) =>
                      patch({ billing_postal_code: e.target.value })
                    }
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Legal name">
                  <input
                    className={fieldClass}
                    value={review.billing_legal_name}
                    onChange={(e) => patch({ billing_legal_name: e.target.value })}
                  />
                </Field>
                <Field label="Tax ID / ABN">
                  <input
                    className={fieldClass}
                    value={review.billing_tax_id ?? ""}
                    onChange={(e) =>
                      patch({ billing_tax_id: e.target.value || null })
                    }
                  />
                </Field>
              </>
            )}            
            {/* <ReviewSelect
              label="Payment terms"
              value={review.payment_terms}
              onValueChange={(value) => patch({ payment_terms: value })}
              options={WHOLESALE_PAYMENT_TERMS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />             */}
            <div className="sm:col-span-2">
              <Field label="Order notes">
                <textarea
                  className={`${fieldClass} min-h-[72px] resize-y`}
                  value={review.notes ?? ""}
                  onChange={(e) => patch({ notes: e.target.value || null })}
                  placeholder="Additional instructions for this order"
                />
              </Field>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-white/10 px-6 py-5">
        {needsDeliveryQuote && !shippingQuoteReady && canCalculateShippingQuote ? (
          <p className="mb-3 text-center text-xs text-white/45">
            A shipping quote is required before you can proceed to checkout.
          </p>
        ) : null}
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={primaryButtonDisabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {isCheckingOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : isPickup ? (
            <>
              <CreditCard className="h-4 w-4" />
              Pay ${review.grand_total.toFixed(2)} with Card
            </>
          ) : shippingQuoteReady ? (
            <>
              <CreditCard className="h-4 w-4" />
              Proceed to Checkout · Pay ${review.grand_total.toFixed(2)}
            </>
          ) : deliveryQuoteStatus === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculating Shipping Quote…
            </>
          ) : (
            <>Calculate Shipping Quote</>
          )}
        </button>
        {footerHelperMessage ? (
          <p className="mt-2 whitespace-pre-line text-center text-xs text-amber-400/80">
            {footerHelperMessage}
          </p>
        ) : null}
        <p className="mt-2 text-center text-xs text-white/30">
          Secure payment via Stripe · Card & Apple Pay accepted
        </p>
      </div>
    </div>
  );
}
