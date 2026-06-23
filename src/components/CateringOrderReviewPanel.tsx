"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { DayPicker } from "react-day-picker";
import DeliveryCitySelect from "@/components/DeliveryCitySelect";
import WholesaleCartItemThumbnail from "@/components/WholesaleCartItemThumbnail";
import type { CateringCartItem } from "@/contexts/CateringCartContext";
import { withCateringOrderTotals } from "@/lib/catering-order-review";
import type { SelfDeliveryFee } from "@/lib/self-delivery-fee";
import { useCommerceTax } from "@/contexts/CommerceTaxContext";
import { formatGstRateLabel } from "@/lib/gst";
import { AUSTRALIAN_STATES, WHOLESALE_DEFAULT_COUNTRY } from "@/lib/wholesale-b2b-order";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildCateringCartItemsSignature,
  extractPersistableCateringReviewFields,
  writeCateringOrderReviewDraft,
} from "@/lib/catering-order-review-storage";
import { cn } from "@/lib/utils";
import type { DeliveryCity } from "@/types";
import type { UserProfile } from "@/types/UserProfile";
import type { CateringOrderReviewForm } from "@/types/CateringOrderReview";
import {
  DEFAULT_AUSTRALIAN_STATE_CODE,
  type AustralianStateCode,
} from "@/types/WholesaleB2BOrder";
import { ArrowLeft, CalendarIcon, ClipboardCheck, Loader2 } from "lucide-react";
import "react-day-picker/style.css";

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

const selectTriggerClass =
  "h-10 w-full border-white/15 bg-black/40 text-white shadow-none focus-visible:border-emerald-400/50 focus-visible:ring-emerald-400/30 [&>span]:text-white";

const selectIconClass = "text-white/60";

const selectContentClass =
  "z-[60] border-white/15 bg-[#121212] text-white shadow-2xl";

const selectItemClass =
  "text-white focus:bg-white/10 data-[highlighted]:bg-white/10";

function Field({ label, children }: { label: string; children: ReactNode }) {
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

  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 1);
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
                : "Select event date"}
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
            disabled={{ before: tomorrow }}
            onSelect={(date) => {
              if (!date) return;
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }}
            className="text-white"
          />
        </PopoverContent>
      </Popover>
    </Field>
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
        <SelectTrigger
          className={selectTriggerClass}
          iconClassName={selectIconClass}
        >
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

type CateringOrderReviewPanelProps = {
  items: CateringCartItem[];
  review: CateringOrderReviewForm;
  profile: UserProfile | null;
  deliveryCities: DeliveryCity[];
  selfDeliveryFee: SelfDeliveryFee;
  selfDeliveryOrigin: string;
  onReviewChange: (next: CateringOrderReviewForm) => void;
  onBack: () => void;
  onConfirm: () => void;
  isPlacingOrder: boolean;
};

export default function CateringOrderReviewPanel({
  items,
  review,
  profile,
  deliveryCities,
  selfDeliveryFee,
  selfDeliveryOrigin,
  onReviewChange,
  onBack,
  onConfirm,
  isPlacingOrder,
}: CateringOrderReviewPanelProps) {
  const commerceTax = useCommerceTax();
  const { isGstInclusive, gstTaxRate } = commerceTax;
  const gstRateLabel = formatGstRateLabel(gstTaxRate);
  const totalsOptions = useMemo(
    () => ({
      tax: commerceTax,
      deliveryCities,
      selfDeliveryFee,
    }),
    [commerceTax, deliveryCities, selfDeliveryFee],
  );
  const totalsReview = useMemo(
    () => withCateringOrderTotals(review, items, totalsOptions),
    [review, items, totalsOptions],
  );
  const couponDiscount = totalsReview.coupon_discount ?? 0;
  const totalDiscount =
    totalsReview.wholesale_discount + couponDiscount;

  const patch = (next: Partial<CateringOrderReviewForm>) => {
    onReviewChange(
      withCateringOrderTotals(
        {
          ...review,
          ...next,
          shipping_country: WHOLESALE_DEFAULT_COUNTRY,
        },
        items,
        totalsOptions,
      ),
    );
  };

  useEffect(() => {
    if (!profile) return;

    const maybeFill = (
      current: string,
      fromProfile: string | null | undefined,
    ) => (current.trim() ? current : String(fromProfile ?? "").trim() || current);

    const next: CateringOrderReviewForm = {
      ...review,
      customer_phone: maybeFill(review.customer_phone, profile.phone),
      shipping_dba_name: maybeFill(
        review.shipping_dba_name,
        profile.shipping_dba_name || profile.business_name,
      ),
      shipping_address: maybeFill(review.shipping_address, profile.shipping_address),
      shipping_city: maybeFill(review.shipping_city, profile.shipping_city),
      shipping_postal_code: maybeFill(
        review.shipping_postal_code,
        profile.shipping_postal_code,
      ),
      shipping_preferred_window: maybeFill(
        review.shipping_preferred_window,
        profile.shipping_preferred_window,
      ),
      shipping_state:
        review.shipping_state ||
        (profile.shipping_state as AustralianStateCode | null) ||
        DEFAULT_AUSTRALIAN_STATE_CODE,
    };

    const changed =
      next.customer_phone !== review.customer_phone ||
      next.shipping_dba_name !== review.shipping_dba_name ||
      next.shipping_address !== review.shipping_address ||
      next.shipping_city !== review.shipping_city ||
      next.shipping_postal_code !== review.shipping_postal_code ||
      next.shipping_preferred_window !== review.shipping_preferred_window ||
      next.shipping_state !== review.shipping_state;

    if (changed) {
      onReviewChange(withCateringOrderTotals(next, items, totalsOptions));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- profile backfill only
  }, [profile]);

  const handleBack = () => {
    writeCateringOrderReviewDraft({
      version: 1,
      cartItemsSignature: buildCateringCartItemsSignature(items),
      form: extractPersistableCateringReviewFields(review),
    });
    onBack();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <button
          type="button"
          onClick={handleBack}
          disabled={isPlacingOrder}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
          aria-label="Back to cart"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="font-serif text-xl font-bold text-emerald-400">
            Review catering order
          </h2>
          <p className="text-xs text-white/45">
            Confirm event and delivery details before payment
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <SectionTitle
            title="Contact"
            description="We will use these details for order updates."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name">
              <input
                className={fieldClass}
                value={review.customer_name}
                onChange={(event) => patch({ customer_name: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={fieldClass}
                value={review.customer_email}
                onChange={(event) => patch({ customer_email: event.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                className={fieldClass}
                value={review.customer_phone}
                onChange={(event) => patch({ customer_phone: event.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <SectionTitle
            title="Event details"
            description="When and how many guests you are catering for."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ReviewDatePicker
              label="Event date"
              value={review.event_date}
              onChange={(value) => patch({ event_date: value })}
            />
            <Field label="Guest count">
              <input
                type="number"
                min="1"
                className={fieldClass}
                value={review.guest_count}
                onChange={(event) => patch({ guest_count: event.target.value })}
                placeholder="Approximate guests"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <SectionTitle
            title="Delivery"
            description="Where the catering should be delivered."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Venue / business name">
              <input
                className={fieldClass}
                value={review.shipping_dba_name}
                onChange={(event) => patch({ shipping_dba_name: event.target.value })}
              />
            </Field>
            <Field label="Delivery window">
              <input
                className={fieldClass}
                value={review.shipping_preferred_window}
                onChange={(event) =>
                  patch({ shipping_preferred_window: event.target.value })
                }
                placeholder="e.g. 11:30am – 12:00pm"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Street address">
                <input
                  className={fieldClass}
                  value={review.shipping_address}
                  onChange={(event) => patch({ shipping_address: event.target.value })}
                />
              </Field>
            </div>
            <DeliveryCitySelect
              label="City / postal code"
              cities={deliveryCities}
              deliveryOrigin={selfDeliveryOrigin}
              cityName={review.shipping_city}
              postalCode={review.shipping_postal_code}
              onChange={({ name, postalCode }) =>
                patch({
                  shipping_city: name,
                  shipping_postal_code: postalCode,
                })
              }
              triggerClassName="focus:ring-emerald-400/40"
            />
            <ReviewSelect
              label="State"
              value={review.shipping_state}
              onValueChange={(value) =>
                patch({ shipping_state: value as AustralianStateCode })
              }
              options={AUSTRALIAN_STATES.filter((state) => state.active).map((state) => ({
                value: state.value,
                label: state.label,
              }))}
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle title="Order items" />
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.lineKey}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <WholesaleCartItemThumbnail
                  imageUrl={item.imageUrl}
                  alt={item.productName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{item.productName}</p>
                  {item.variantLabel ? (
                    <p className="mt-0.5 text-xs text-white/45">{item.variantLabel}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-white/40">
                    {item.qty} × ${Number(item.unitPrice).toFixed(2)}
                    {!isGstInclusive ? " ex GST" : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  ${(Number(item.unitPrice) * item.qty).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
          <SectionTitle title="Totals" />
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-white/60">
              <span>{isGstInclusive ? "Subtotal" : "Subtotal (ex GST)"}</span>
              <span className="tabular-nums text-white">
                ${totalsReview.subtotal.toFixed(2)}
              </span>
            </div>
            {totalDiscount > 0 ? (
              <div className="flex justify-between text-white/60">
                <span>
                  {totalsReview.wholesale_discount > 0 && couponDiscount > 0
                    ? "Total discount"
                    : couponDiscount > 0
                      ? totalsReview.coupon_code?.trim()
                        ? `Coupon (${totalsReview.coupon_code.trim()})`
                        : "Coupon discount"
                      : "Discount"}
                </span>
                <span className="tabular-nums text-green-300">
                  -${totalDiscount.toFixed(2)}
                </span>
              </div>
            ) : null}
            {!isGstInclusive ? (
              <div className="flex justify-between text-white/60">
                <span>Tax total (GST {gstRateLabel})</span>
                <span className="tabular-nums text-white">
                  ${totalsReview.tax_total.toFixed(2)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-white/60">
              <span>Delivery</span>
              <span className="tabular-nums text-white">
                {totalsReview.shipping_fee > 0
                  ? `$${totalsReview.shipping_fee.toFixed(2)}`
                  : review.shipping_city.trim() && review.shipping_postal_code.trim()
                    ? "Distance unavailable"
                    : "Select delivery city"}
              </span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
              <span>{isGstInclusive ? "Grand total" : "Grand total (inc GST)"}</span>
              <span className="tabular-nums text-emerald-400">
                ${totalsReview.grand_total.toFixed(2)} est
              </span>
            </div>
          </div>
        </section>

        <section>
          <Field label="Special requests">
            <textarea
              className={`${fieldClass} min-h-[72px] resize-y`}
              value={review.notes ?? ""}
              onChange={(event) => patch({ notes: event.target.value || null })}
              placeholder="Dietary requirements, setup notes, etc."
            />
          </Field>
        </section>
      </div>

      <div className="border-t border-white/10 px-6 py-5">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPlacingOrder}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-sm font-bold text-white transition-colors hover:bg-emerald-500/90 disabled:opacity-60"
        >
          {isPlacingOrder ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Placing order…
            </>
          ) : (
            <>
              <ClipboardCheck className="h-4 w-4" />
              Place order (${totalsReview.grand_total.toFixed(2)} est.)
            </>
          )}
        </button>
        <p className="mt-2 text-center text-xs text-white/30">
          No payment now — our team will send you a quotation to review and pay later
        </p>
      </div>
    </div>
  );
}
