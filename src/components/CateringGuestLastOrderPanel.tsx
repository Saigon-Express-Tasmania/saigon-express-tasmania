"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "@/components/link";
import WholesaleCartItemThumbnail from "@/components/WholesaleCartItemThumbnail";
import { useGuestCateringOrder } from "@/contexts/GuestCateringOrderContext";
import { buildCateringPaymentFinancialDetails } from "@/lib/catering-order-review";
import { useCommerceTax } from "@/contexts/CommerceTaxContext";
import { formatGstRateLabel } from "@/lib/gst";
import {
  formatGuestOrderId,
} from "@/lib/guest-catering-order-session";
import { getCateringOrderStatusLabel } from "@/lib/order-status";
import { formatAud } from "@/lib/catering-price";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import {
  formatTrackedCurrency,
  formatTrackedDate,
  formatTrackingTokenInput,
} from "@/lib/supabase/order-tracking";
import { formatRequestedTargetDate } from "@/lib/supabase/wholesale-orders";
import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Loader2,
  Package,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

const PANEL_ANIMATION_DURATION = 0.24;

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: PANEL_ANIMATION_DURATION, ease: "easeOut" as const },
};

const panelMotion = {
  initial: { x: "100%" },
  animate: { x: 0 },
  exit: { x: "100%" },
  transition: { duration: PANEL_ANIMATION_DURATION, ease: "easeOut" as const },
};

function formatDeliveryTotal(
  status: string,
  shippingFee: number,
): string {
  if (status === "pending") {
    return "Waiting quotation...";
  }
  return formatTrackedCurrency(shippingFee);
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
    case "ready_to_pickup":
    case "packed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "cancelled":
      return "border-white/20 bg-white/5 text-white/45";
    case "awaiting_payment":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
}

export default function CateringGuestLastOrderPanel() {
  const commerceTax = useCommerceTax();
  const { isGstInclusive, gstTaxRate } = commerceTax;
  const gstRateLabel = formatGstRateLabel(gstTaxRate);
  const {
    session,
    trackedOrder,
    isLoadingOrder,
    lastOrderOpen,
    setLastOrderOpen,
    refreshTrackedOrder,
    clearGuestOrder,
  } = useGuestCateringOrder();
  const [isPaying, setIsPaying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!lastOrderOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void refreshTrackedOrder();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lastOrderOpen, refreshTrackedOrder]);

  const paymentTotals = useMemo(() => {
    if (!trackedOrder) return null;
    return buildCateringPaymentFinancialDetails(
      {
        subtotal: trackedOrder.subtotal,
        coupon_code: trackedOrder.coupon_code,
        coupon_discount: trackedOrder.coupon_discount,
        wholesale_discount: trackedOrder.wholesale_discount,
        tax_total: trackedOrder.tax_total,
        shipping_fee: trackedOrder.shipping_fee,
        grand_total: trackedOrder.grand_total,
        items: trackedOrder.items,
      },
      commerceTax,
    );
  }, [trackedOrder, commerceTax]);

  const trackingToken = session?.trackingToken ?? "";
  const trackingNumberLabel = formatTrackingTokenInput(trackingToken);
  const trackingPath = trackingToken
    ? `/order-tracking/${encodeURIComponent(trackingToken)}`
    : "/order-tracking";

  const handleCancelOrder = async () => {
    if (!trackedOrder || !session || trackedOrder.status !== "pending") {
      toast.error("Only pending orders can be cancelled.");
      return;
    }

    setIsCancelling(true);
    try {
      const result = await invokeEdgeFunction<{ orderId: number }>("catering-order", {
        method: "POST",
        body: {
          action: "cancel",
          orderId: session.orderId,
          cancelToken: session.cancelToken,
        },
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to cancel order");
      }

      clearGuestOrder();
      toast.success("Your catering order has been cancelled.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel order";
      toast.error(message);
    } finally {
      setIsCancelling(false);
    }
  };

  const isBusy = isPaying || isCancelling;

  const handlePayNow = async () => {
    if (!trackedOrder || !session || trackedOrder.status !== "awaiting_payment") {
      toast.error("This order is not ready for payment yet.");
      return;
    }

    const customerEmail = trackedOrder.b2b.buyer?.contact_email?.trim() ?? "";
    const customerPhone = trackedOrder.b2b.buyer?.contact_phone?.trim() || "N/A";

    if (!customerEmail) {
      toast.error("We need an email address on this order before payment can start.");
      return;
    }

    if (!paymentTotals) return;

    setIsPaying(true);
    try {
      const result = await invokeEdgeFunction<{ url?: string | null }>("checkout", {
        method: "POST",
        body: {
          mode: getClientStripeMode(),
          orderType: "catering",
          orderId: trackedOrder.id,
          trackingToken: session.trackingToken,
          customerName: trackedOrder.b2b.buyer?.name ?? trackedOrder.customer_name,
          customerEmail,
          customerPhone,
          fulfillmentType: trackedOrder.requested_fulfillment_method ?? "delivery",
          origin: window.location.origin,
          returnTo: "/catering",
          successReturnTo: "/catering",
          financialDetails: paymentTotals,
        },
      });

      if (!result.ok) {
        throw new Error(result.error || "Failed to start payment");
      }

      if (!result.data.url) {
        throw new Error("Failed to start payment");
      }

      window.location.href = result.data.url;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start payment";
      toast.error(message);
      setIsPaying(false);
    }
  };

  return (
    <>
      {isPaying ? (
        <div
          className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-black/55 backdrop-blur-[2px]"
          aria-busy="true"
          aria-live="polite"
          role="alertdialog"
          aria-label="Preparing payment"
        >
          <div className="mx-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/90 px-6 py-4 shadow-2xl">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold text-white">Preparing secure payment…</p>
          </div>
        </div>
      ) : isCancelling ? (
        <div
          className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-black/55 backdrop-blur-[2px]"
          aria-busy="true"
          aria-live="polite"
          role="alertdialog"
          aria-label="Cancelling order"
        >
          <div className="mx-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/90 px-6 py-4 shadow-2xl">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-400" />
            <p className="text-sm font-semibold text-white">Cancelling your order…</p>
          </div>
        </div>
      ) : null}
      <AnimatePresence>
        {lastOrderOpen ? (
          <>
            <motion.button
              key="guest-last-order-backdrop"
              type="button"
              aria-label="Close last order panel"
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => {
                if (!isPaying) setLastOrderOpen(false);
              }}
              {...backdropMotion}
            />
            <motion.aside
              key="guest-last-order-panel"
              className="fixed inset-y-0 right-0 z-[51] flex min-h-0 w-full flex-col border-l border-white/10 bg-black shadow-2xl sm:max-w-lg lg:max-w-xl"
              {...panelMotion}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-emerald-400">
                  <ClipboardList className="h-5 w-5" />
                  Last order
                </h2>
                <button
                  type="button"
                  onClick={() => setLastOrderOpen(false)}
                  disabled={isPaying}
                  className="text-2xl leading-none text-white/40 transition-colors hover:text-white disabled:opacity-40"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {isLoadingOrder && !trackedOrder ? (
                  <div className="flex flex-col items-center justify-center py-16 text-white/40">
                    <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-400" />
                    <p className="text-sm">Loading your order…</p>
                  </div>
                ) : trackedOrder && session ? (
                  <>
                    <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
                            Order
                          </p>
                          <p className="text-lg font-bold text-white">
                            {session.invoiceNumber ||
                              formatGuestOrderId(trackedOrder.id)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusBadgeClass(trackedOrder.status)}`}
                        >
                          {getCateringOrderStatusLabel(trackedOrder.status)}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-white/40">Tracking number</p>
                          <p className="font-mono text-sm tracking-wider text-white">
                            {trackingNumberLabel}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/40">Placed</p>
                          <p className="text-sm text-white">
                            {formatTrackedDate(trackedOrder.created_at)}
                          </p>
                        </div>
                        {trackedOrder.requested_target_date ? (
                          <div className="sm:col-span-2">
                            <p className="flex items-center gap-1.5 text-xs text-white/40">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Event date
                            </p>
                            <p className="text-sm text-white">
                              {formatRequestedTargetDate(
                                trackedOrder.requested_target_date,
                              )}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <p className="text-xs leading-relaxed text-white/45">
                        Save your tracking number to return to this order anytime.
                        No account is required.
                      </p>
                    </section>

                    {trackedOrder.status === "pending" ? (
                      <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                        <p>
                          Our team is preparing your quotation. Check back here for
                          updates and payment when your order is ready.
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleCancelOrder()}
                          disabled={isBusy}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/15 py-3 text-sm font-semibold text-red-100 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isCancelling ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Cancelling…
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              Cancel order
                            </>
                          )}
                        </button>
                      </div>
                    ) : null}

                    {trackedOrder.status === "awaiting_payment" && paymentTotals ? (
                      <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                        <p>Your quotation is ready. Review the totals and pay below.</p>
                        <dl className="space-y-1.5">
                          <div className="flex justify-between gap-4">
                            <dt>
                              {isGstInclusive ? "Subtotal" : "Subtotal (ex GST)"}
                            </dt>
                            <dd className="tabular-nums">
                              {formatTrackedCurrency(paymentTotals.subtotal_ex_gst)}
                            </dd>
                          </div>
                          {!isGstInclusive ? (
                            <div className="flex justify-between gap-4">
                              <dt>GST ({gstRateLabel})</dt>
                              <dd className="tabular-nums">
                                {formatTrackedCurrency(paymentTotals.gst_total)}
                              </dd>
                            </div>
                          ) : null}
                          <div className="flex justify-between gap-4">
                            <dt>Delivery</dt>
                            <dd className="tabular-nums">
                              {formatTrackedCurrency(paymentTotals.shipping_fee)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-4 border-t border-white/15 pt-2 font-semibold text-white">
                            <dt>
                              {isGstInclusive ? "Grand total" : "Grand total (inc GST)"}
                            </dt>
                            <dd className="tabular-nums">
                              {formatTrackedCurrency(
                                paymentTotals.grand_total_inc_gst,
                              )}
                            </dd>
                          </div>
                        </dl>
                        <button
                          type="button"
                          onClick={() => void handlePayNow()}
                          disabled={isBusy}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500/90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isPaying ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Opening payment…
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4" />
                              Pay now
                            </>
                          )}
                        </button>
                      </div>
                    ) : null}

                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-white">Items</h3>
                      <ul className="space-y-3">
                        {trackedOrder.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                          >
                            <WholesaleCartItemThumbnail
                              imageUrl={item.imageUrl}
                              alt={item.item_name}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white">
                                {item.item_name}
                              </p>
                              <p className="mt-0.5 text-xs text-white/45">
                                {item.qty} × {formatAud(item.unit_price)}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-bold text-white">
                              {formatTrackedCurrency(item.line_total)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-white">
                        Order totals
                      </h3>
                      <dl className="space-y-1.5 text-sm">
                        <div className="flex justify-between gap-4 text-white/70">
                          <dt>Subtotal</dt>
                          <dd>{formatTrackedCurrency(trackedOrder.subtotal)}</dd>
                        </div>
                        <div className="flex justify-between gap-4 text-white/70">
                          <dt>Delivery</dt>
                          <dd
                            className={
                              trackedOrder.status === "pending"
                                ? "text-right text-xs font-medium text-white/45"
                                : undefined
                            }
                          >
                            {formatDeliveryTotal(
                              trackedOrder.status,
                              trackedOrder.shipping_fee,
                            )}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-white/10 pt-2 font-semibold text-white">
                          <dt>Grand total</dt>
                          <dd className="tabular-nums">
                            {formatTrackedCurrency(trackedOrder.grand_total)}
                            {trackedOrder.status === "pending" ? (
                              <span className="ml-1 text-xs font-normal text-white/45">
                                est.
                              </span>
                            ) : null}
                          </dd>
                        </div>
                        {trackedOrder.status === "pending" ? (
                          <p className="pt-1 text-xs leading-relaxed text-white/45">
                            The total shown is an estimate. Please wait for our
                            formal quotation — we will update this order when
                            your quote is ready for review and payment.
                          </p>
                        ) : null}
                      </dl>
                    </section>
                  </>
                ) : (
                  <div className="py-16 text-center text-white/40">
                    <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
                    <p className="text-sm">We could not load your last order.</p>
                  </div>
                )}
              </div>

              {trackedOrder &&
              trackingToken &&
              trackedOrder.status !== "pending" &&
              trackedOrder.status !== "awaiting_payment" ? (
                <div className="border-t border-white/10 px-6 py-5">
                  <Link
                    href={trackingPath}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Open full tracking page
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
