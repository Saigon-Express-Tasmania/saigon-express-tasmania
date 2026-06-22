"use client";

import { useEffect, useMemo, useState } from "react";
import OrderInvoiceDialog from "@/components/OrderInvoiceDialog";
import Link from "@/components/link";
import AppImage from "@/components/AppImage";
import MemberHeader, {
  type MemberHeaderMember,
} from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import {
  MEMBER_PORTAL_BOX_SURFACE,
  MEMBER_PORTAL_ROUNDED_PANEL_CLASS,
} from "@/lib/member-portal-surfaces";
import { useSupabase } from "@/hooks/useSupabase";
import { buildCateringPaymentFinancialDetails } from "@/lib/catering-order-review";
import { clearCateringOrderRateLimit } from "@/lib/catering-order-rate-limit";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import {
  buildOrderTimeline,
  formatTrackedCurrency,
  formatTrackedDate,
  formatTrackedOrderId,
  formatTrackingTokenInput,
  getActiveTimelineStep,
  getCurrentTimelineNotice,
  getExpectedDeliveryLabel,
  getOrderStatusLabel,
  isItemPacked,
  isPickupFulfillment,
  timelineNoticeRequiresAction,
  type TrackedOrder,
} from "@/lib/supabase/order-tracking";
import {
  formatOrderDate,
  getOrderTypeLabel,
} from "@/lib/supabase/wholesale-orders";
import type { OrderStatus } from "@/lib/order-status";
import {
  formatFlatBillingLines,
  formatFlatShippingLines,
  formatWholesaleStreetAddress,
  hasMeaningfulFlatBillingAddress,
  hasMeaningfulFlatShippingAddress,
} from "@/lib/wholesale-b2b-order";
import { resolveOrderTrackingMapEmbedUrl } from "@/lib/google-maps-embed";
import { getInvoiceTotalDiscount } from "@/lib/order-invoice";
import { useTranslations } from "next-intl";
import {
  Check,
  ClipboardList,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { StoreLocation } from "@/types";

type OrderTrackingDetailsProps = {
  order: TrackedOrder;
  trackingToken: string;
  pickupStore?: StoreLocation | null;
  invoiceCreatorStore?: StoreLocation | null;
};

function statusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case "completed":
    case "ready_to_pickup":
    case "packed":
    case "ready":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "cancelled":
      return "border-white/20 bg-white/5 text-white/45";
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
}

function statusLabel(
  status: OrderStatus,
  labels: Partial<Record<OrderStatus, string>>,
): string {
  return labels[status] ?? getOrderStatusLabel(status);
}

function timelineStepClass(state: "completed" | "in_progress" | "upcoming"): string {
  switch (state) {
    case "completed":
      return "border-emerald-900/60 bg-emerald-950/40";
    case "in_progress":
      return "border-blue-500/60 bg-slate-900 shadow-[0_0_10px_rgba(77,166,255,0.2)]";
    default:
      return `border-white/10 ${MEMBER_PORTAL_BOX_SURFACE}`;
  }
}

function timelineIconForStep(key: string) {
  switch (key) {
    case "confirmed":
      return ShieldCheck;
    case "preparing":
      return Check;
    case "packed":
      return Package;
    case "ready_to_pickup":
      return MapPin;
    case "out_for_delivery":
      return Truck;
    case "completed":
      return Check;
    default:
      return Truck;
  }
}

function getMemberId(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export default function OrderTrackingDetails({
  order,
  trackingToken,
  pickupStore = null,
  invoiceCreatorStore = null,
}: OrderTrackingDetailsProps) {
  const t = useTranslations("OrderTrackingDetails");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, authMetadata, isSignedIn, signOut, session, user } = useSupabase();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [lastOrdersPage, setLastOrdersPage] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const member = useMemo<MemberHeaderMember | null>(() => {
    if (!profile || !isWholesaleMemberConfirmed(profile, authMetadata)) {
      return null;
    }

    return {
      businessName: profile.business_name ?? "Your Business",
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  const statusLabels = useMemo<Partial<Record<OrderStatus, string>>>(
    () => ({
      pending: t("status.pending"),
      awaiting_payment: t("status.pending"),
      confirmed: t("status.confirmed"),
      preparing: t("status.preparing"),
      packed: t("status.packed"),
      ready_to_pickup: t("status.readyToPickup"),
      out_for_delivery: t("status.outForDelivery"),
      ready: t("status.readyToPickup"),
      completed: t("status.completed"),
      cancelled: t("status.cancelled"),
    }),
    [t],
  );

  const timeline = useMemo(
    () =>
      buildOrderTimeline(order, {
        confirmed: t("timeline.confirmed"),
        preparing: t("timeline.preparing"),
        packed: t("timeline.packed"),
        readyToPickup: t("timeline.readyToPickup"),
        outForDelivery: t("timeline.outForDelivery"),
        completed: t("timeline.completed"),
        confirmedNotice: t("timeline.confirmedNotice"),
        preparingNotice: t("timeline.preparingNotice"),
        packedNoticePickup: t("timeline.packedNoticePickup"),
        packedNoticeDelivery: t("timeline.packedNoticeDelivery"),
        pickupNotice: t("timeline.pickupNotice"),
        deliveryNotice: t("timeline.deliveryNotice"),
        completedNotice: t("timeline.completedNotice"),
      }),
    [order, t],
  );

  const activeTimelineStep = useMemo(
    () => getActiveTimelineStep(timeline, order.status),
    [timeline, order.status],
  );

  const currentStatusNotice = useMemo(
    () => getCurrentTimelineNotice(timeline, order.status),
    [timeline, order.status],
  );

  const statusNoticeIsUrgent = activeTimelineStep
    ? timelineNoticeRequiresAction(activeTimelineStep.key)
    : false;

  const isPickup = isPickupFulfillment(order);
  const expectedDelivery = getExpectedDeliveryLabel(order);
  const orderLabel = formatTrackedOrderId(order.id);
  const packed = isItemPacked(order.status);

  const deliveryLines = !isPickup
    ? hasMeaningfulFlatShippingAddress(order.address)
      ? formatFlatShippingLines(order.address)
      : order.b2b.shippingAddress
        ? formatWholesaleStreetAddress(order.b2b.shippingAddress)
        : []
    : [];

  const billingLines = hasMeaningfulFlatBillingAddress(order.address)
    ? formatFlatBillingLines(order.address)
    : order.b2b.billingAddress
      ? formatWholesaleStreetAddress(order.b2b.billingAddress)
      : [];

  const deliveryInstructions =
    order.b2b.shippingAddress?.special_instructions?.trim() ||
    order.notes?.trim() ||
    null;

  const mapEmbedUrl = useMemo(
    () => resolveOrderTrackingMapEmbedUrl(order, pickupStore),
    [order, pickupStore],
  );

  const mapEmbedTitle = isPickup
    ? t("deliveryMap.pickupMapTitle")
    : t("deliveryMap.deliveryMapTitle");

  const welcomeLine = member
    ? t("welcomeMember", {
        name: profile?.display_name?.trim() || order.customer_name
      })
    : t("welcomeGuest", { name: order.customer_name });

  const lastUpdate = order.status_updated_at ?? order.created_at;
  const totalDiscount = getInvoiceTotalDiscount(order);
  const isCateringOrder = order.order_type === "catering";
  const paymentTotals = useMemo(
    () =>
      buildCateringPaymentFinancialDetails({
        subtotal: order.subtotal,
        coupon_code: order.coupon_code,
        coupon_discount: order.coupon_discount,
        wholesale_discount: order.wholesale_discount,
        tax_total: order.tax_total,
        shipping_fee: order.shipping_fee,
        grand_total: order.grand_total,
        items: order.items,
      }),
    [order],
  );
  const trackingNumberLabel = formatTrackingTokenInput(trackingToken);
  const trackingPath = `/order-tracking/${encodeURIComponent(trackingToken)}`;

  useEffect(() => {
    if (searchParams.get("placed") === "success") {
      toast.success(t("placedSuccess", { trackingNumber: trackingNumberLabel }), {
        id: "catering-order-placed",
        duration: 8000,
      });
      router.replace(trackingPath, { scroll: false });
    }
  }, [searchParams, router, trackingPath, trackingNumberLabel, t]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      if (isCateringOrder) {
        clearCateringOrderRateLimit();
      }
      toast.success(t("paymentSuccess"));
    } else if (checkout === "cancelled") {
      toast.error(t("paymentCancelled"));
    }

    router.replace(trackingPath, { scroll: false });
  }, [searchParams, router, trackingPath, t, isCateringOrder]);

  const handlePayNow = async () => {
    if (order.status !== "awaiting_payment") {
      toast.error(t("paymentNotReady"));
      return;
    }

    const customerEmail =
      order.b2b.buyer?.contact_email?.trim() ||
      profile?.email?.trim() ||
      user?.email?.trim() ||
      "";
    const customerPhone = order.b2b.buyer?.contact_phone?.trim() || "N/A";

    if (!customerEmail) {
      toast.error(t("paymentEmailRequired"));
      return;
    }

    setIsPaying(true);
    try {
      const result = await invokeEdgeFunction<{ url?: string | null }>("checkout", {
        method: "POST",
        accessToken: session?.access_token ?? null,
        body: {
          mode: getClientStripeMode(),
          orderType: "catering",
          orderId: order.id,
          ...(user?.id ? { customerAccount: user.id } : { trackingToken }),
          customerName: order.b2b.buyer?.name ?? order.customer_name,
          customerEmail,
          customerPhone,
          fulfillmentType: order.requested_fulfillment_method ?? "delivery",
          origin: window.location.origin,
          returnTo: trackingPath,
          successReturnTo: trackingPath,
          financialDetails: paymentTotals,
        },
      });

      if (!result.ok) {
        throw new Error(result.error || t("paymentFailed"));
      }

      if (!result.data.url) {
        throw new Error(t("paymentFailed"));
      }

      window.location.href = result.data.url;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("paymentFailed");
      toast.error(message);
      setIsPaying(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("lastOrdersPage");
    setLastOrdersPage(stored || null);
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast.success(t("signedOut"));
    router.push("/member");
  };

  const canViewWholesaleOrders = Boolean(member);
  const canViewCateringOrders = Boolean(isSignedIn);

  const backHref = useMemo(() => {
    // Respect the last visited orders page first, if user can access it.
    if (lastOrdersPage === "/wholesale/orders" && canViewWholesaleOrders) {
      return "/wholesale/orders";
    }
    if (lastOrdersPage === "/member/catering-orders" && canViewCateringOrders) {
      return "/member/catering-orders";
    }

    // Fallback priority when there is no valid stored location.
    if (canViewWholesaleOrders) return "/wholesale/orders";
    if (canViewCateringOrders) return "/member/catering-orders";
    return "/order-tracking";
  }, [lastOrdersPage, canViewWholesaleOrders, canViewCateringOrders]);

  return (
    <MemberPortalBackground className="pb-8">
      {isPaying ? (
        <div
          className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-black/55 backdrop-blur-[2px]"
          aria-busy="true"
          aria-live="polite"
          role="alertdialog"
          aria-label={t("preparingPayment")}
        >
          <div className="mx-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/90 px-6 py-4 shadow-2xl">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold text-white">{t("preparingPayment")}</p>
          </div>
        </div>
      ) : null}
      <MemberHeader
        member={member}
        onLogout={() => void handleLogout()}
      />

      <div className="container max-w-[1400px] py-5">
        <div className={`mb-8 flex overflow-hidden ${MEMBER_PORTAL_ROUNDED_PANEL_CLASS}`}>
          <div className="flex w-10 shrink-0 items-center justify-center self-stretch text-primary sm:pl-5">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-4 p-4 pl-0 sm:p-5 lg:flex lg:flex-row lg:items-center lg:justify-between">
            <SummaryField label={t("summary.order")} value={orderLabel} />
            <SummaryField
              label={t("summary.orderDate")}
              value={formatTrackedDate(order.created_at)}
            />
            <SummaryField
              label={t("summary.orderType")}
              value={getOrderTypeLabel(order.order_type)}
            />
            <SummaryField
              label={t("summary.totalAmount")}
              value={formatTrackedCurrency(order.grand_total)}
            />
            <SummaryField
              label={t("summary.trackingNumber")}
              value={trackingNumberLabel}
            />
            <div className="col-span-2 lg:col-span-1 lg:text-right">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium ${statusBadgeClass(order.status)}`}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                {statusLabel(order.status, statusLabels)}
              </span>
            </div>
          </div>
        </div>

        <section className="mb-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-medium">{t("timeline.title")}</h2>
            {expectedDelivery ? (
              <p className="text-sm text-zinc-300">
                {t("timeline.expectedDelivery", { window: expectedDelivery })}
              </p>
            ) : null}
          </div>

          {currentStatusNotice ? (
            <div
              className={`mb-4 rounded-lg border px-4 py-3 text-sm leading-relaxed ${
                statusNoticeIsUrgent
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                  : order.status === "completed"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                    : "border-sky-500/40 bg-sky-500/10 text-sky-100"
              }`}
              role="status"
            >
              {currentStatusNotice}
            </div>
          ) : null}

          {isCateringOrder && order.status === "pending" ? (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
              {t("catering.pendingNotice")}
            </div>
          ) : null}

          {isCateringOrder && order.status === "awaiting_payment" ? (
            <div className="mb-4 space-y-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
              <p>{t("catering.awaitingPaymentNotice")}</p>
              <dl className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt>{t("invoice.subtotal")}</dt>
                  <dd className="tabular-nums">
                    {formatTrackedCurrency(paymentTotals.subtotal_ex_gst)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>{t("invoice.gst")}</dt>
                  <dd className="tabular-nums">
                    {formatTrackedCurrency(paymentTotals.gst_total)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>{t("invoice.shippingFee")}</dt>
                  <dd className="tabular-nums">
                    {formatTrackedCurrency(paymentTotals.shipping_fee)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-white/15 pt-2 font-semibold text-white">
                  <dt>{t("invoice.grandTotal")}</dt>
                  <dd className="tabular-nums">
                    {formatTrackedCurrency(paymentTotals.grand_total_inc_gst)}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => void handlePayNow()}
                disabled={isPaying}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("payNowLoading")}
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    {t("payNow")}
                  </>
                )}
              </button>
            </div>
          ) : null}

          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 hidden h-0.5 -translate-y-1/2 bg-zinc-800 lg:block" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {timeline.map((step, index) => {
                const Icon = timelineIconForStep(step.key);
                return (
                  <div
                    key={step.key}
                    className={`relative z-[1] flex items-start gap-2.5 rounded-lg border p-4 ${timelineStepClass(step.state)}`}
                  >
                    <Icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        step.state === "in_progress"
                          ? "text-blue-400"
                          : step.state === "completed"
                            ? "text-emerald-400"
                            : "text-zinc-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">
                        {index + 1}. {step.label}
                      </div>
                      {step.dateLabel ? (
                        <div className="mt-0.5 text-[11px] text-zinc-500">
                          {step.dateLabel}
                        </div>
                      ) : null}
                     
                      <div className="mt-2">
                        <TimelineStateBadge
                          state={step.state}
                          labels={{
                            completed: t("timeline.completed"),
                            inProgress: t("timeline.inProgress"),
                            upcoming: t("timeline.upcoming"),
                          }}
                        />
                      </div>
                    </div>
                    {step.state === "completed" ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-6 xl:flex-row xl:gap-8">
          <section className="flex-1">
            <h2 className="mb-4 text-lg font-medium">{t("deliveryMap.title")}</h2>
            <div className={`overflow-hidden ${MEMBER_PORTAL_ROUNDED_PANEL_CLASS}`}>
              <div className="relative h-[250px] border-b border-white/10 bg-black/60">
                {mapEmbedUrl ? (
                  <iframe
                    title={mapEmbedTitle}
                    src={mapEmbedUrl}
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center">
                    <span className="text-sm text-white/30">
                      {t("deliveryMap.placeholder")}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-6">
                <div
                  className={`min-w-0 ${billingLines.length === 0 ? "sm:col-span-2" : ""}`}
                >
                  <div className="mb-1 text-[13px] font-bold">
                    {isPickup
                      ? t("deliveryMap.pickupLocationTitle")
                      : t("deliveryMap.addressTitle")}
                  </div>
                  {isPickup ? (
                    pickupStore ? (
                      <div className="text-[13px] leading-relaxed text-zinc-400">
                        <div className="font-medium text-zinc-300">
                          {pickupStore.name}
                        </div>
                        <div>{pickupStore.address}</div>                        
                        {pickupStore.phone ? (
                          <div className="mt-1">{pickupStore.phone}</div>
                        ) : null}                                                
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-[13px] text-zinc-400">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{order.pickup_time || t("deliveryMap.noAddress")}</span>
                      </div>
                    )
                  ) : deliveryLines.length > 0 ? (
                    <div className="text-[13px] leading-relaxed text-zinc-400">
                      {order.b2b.shippingAddress?.dba_name ? (
                        <div className="font-medium text-zinc-300">
                          {order.b2b.shippingAddress.dba_name}
                        </div>
                      ) : null}
                      {deliveryLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                      {deliveryInstructions ? (
                        <div className="mt-1">{deliveryInstructions}</div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-[13px] text-zinc-400">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{order.pickup_time || t("deliveryMap.noAddress")}</span>
                    </div>
                  )}
                </div>
                {billingLines.length > 0 ? (
                  <div className="min-w-0">
                    <div className="mb-1 text-[13px] font-bold">
                      {t("deliveryMap.billingTitle")}
                    </div>
                    <div className="text-[13px] leading-relaxed text-zinc-400">
                      {order.b2b.billingAddress?.legal_name ? (
                        <div className="font-medium text-zinc-300">
                          {order.b2b.billingAddress.legal_name}
                        </div>
                      ) : null}
                      {billingLines.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="flex flex-[1.2] flex-col">
            <h2 className="mb-4 text-lg font-medium">{t("items.title")}</h2>
            <div className={`flex flex-1 flex-col justify-between p-5 ${MEMBER_PORTAL_ROUNDED_PANEL_CLASS}`}>
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-zinc-700 text-zinc-500">
                        <th className="pb-2.5 font-normal">{t("items.sku")}</th>
                        <th className="pb-2.5 font-normal">{t("items.name")}</th>
                        <th className="pb-2.5 font-normal">{t("items.qty")}</th>
                        <th className="pb-2.5 font-normal">{t("items.unit")}</th>
                        <th className="pb-2.5 font-normal">{t("items.total")}</th>                        
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-zinc-800 last:border-0"
                        >
                          <td className="py-4">{item.sku || item.menu_item_id}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-white/10">
                                {item.imageUrl ? (
                                  <AppImage
                                    src={item.imageUrl}
                                    alt={item.item_name}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-base opacity-60">
                                    <Package className="h-4 w-4 text-zinc-500" />
                                  </div>
                                )}
                              </div>
                              <span className="min-w-0">{item.item_name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-zinc-300">{item.qty}</td>
                          <td className="py-4">
                            {formatTrackedCurrency(item.unit_price)}
                          </td>
                          <td className="py-4 font-bold">
                            {formatTrackedCurrency(item.line_total)}
                          </td>                          
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 border-t border-zinc-800 pt-5">
                  <div className="ml-auto w-full max-w-sm">
                    <h3 className="mb-3 text-lg font-medium">
                      {t("items.totalsTitle")}
                    </h3>
                    <dl className="space-y-2 text-[13px]">
                      <FinancialSummaryRow
                        label={t("invoice.subtotal")}
                        value={formatTrackedCurrency(order.subtotal)}
                      />
                      {totalDiscount > 0 ? (
                        <FinancialSummaryRow
                          label={t("invoice.totalDiscount")}
                          value={`−${formatTrackedCurrency(totalDiscount)}`}
                          valueClassName="text-emerald-400"
                        />
                      ) : null}
                      <FinancialSummaryRow
                        label={t("invoice.gst")}
                        value={formatTrackedCurrency(order.tax_total)}
                      />
                      <FinancialSummaryRow
                        label={t("invoice.shippingFee")}
                        value={formatTrackedCurrency(order.shipping_fee)}
                      />
                      <FinancialSummaryRow
                        label={t("invoice.grandTotal")}
                        value={formatTrackedCurrency(order.grand_total)}
                        emphasize
                      />
                    </dl>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-2.5 md:grid-cols-2">
                {order.status !== "pending" ? (
                  <ActionButton
                    label={t("actions.viewInvoice")}
                    onClick={() => setInvoiceOpen(true)}
                    variant="primary"
                  />
                ) : null}
                <ActionButton label={t("actions.reportIssue")} href="/contact" variant="default" />
              </div>
            </div>
          </section>
        </div>

        <OrderInvoiceDialog
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          order={order}
          pickupStore={pickupStore}
          invoiceCreatorStore={invoiceCreatorStore}
          statusLabel={statusLabel(order.status, statusLabels)}
        />

        <div className="mt-8 flex justify-flex-start">
          <Link
            href={backHref}
            className={`inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-zinc-100 shadow-sm transition-colors hover:border-white/35 hover:bg-white/10 bg-white/10 backdrop-blur-sm`}
          >
            {canViewWholesaleOrders || canViewCateringOrders
              ? t("backToOrders")
              : t("backToTracking")}
          </Link>
        </div>
      </div>
    </MemberPortalBackground>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-xs text-zinc-500">{label}</div>
      <div className="text-base font-medium">{value}</div>
    </div>
  );
}

function FinancialSummaryRow({
  label,
  value,
  valueClassName = "text-zinc-100",
  emphasize = false,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${
        emphasize ? "border-t border-zinc-700 pt-2" : ""
      }`}
    >
      <dt className={emphasize ? "font-semibold text-lg text-zinc-200" : "text-zinc-500"}>
        {label}
      </dt>
      <dd
        className={`tabular-nums ${emphasize ? "text-base font-bold text-zinc-200" : `font-medium ${valueClassName}`}`}
      >
        {value}
      </dd>
    </div>
  );
}

function TimelineStateBadge({
  state,
  labels,
}: {
  state: "completed" | "in_progress" | "upcoming";
  labels: {
    completed: string;
    inProgress: string;
    upcoming: string;
  };
}) {
  const label =
    state === "completed"
      ? labels.completed
      : state === "in_progress"
        ? labels.inProgress
        : labels.upcoming;

  const className =
    state === "completed"
      ? "bg-emerald-500/10 text-emerald-400"
      : state === "in_progress"
        ? "bg-amber-500/10 text-amber-300"
        : "bg-zinc-800 text-zinc-500";

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] ${className}`}>
      {label}
    </span>
  );
}

function ActionButton({
  label,
  disabled,
  href,
  onClick,
  variant = "default",
}: {
  label: string;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "border-red-900 bg-red-950 text-red-400 hover:bg-red-900/80"
      : variant === "secondary"
        ? "border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-950/70"
      : "border-zinc-700/60 bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800/70";

  if (href && !disabled) {
    return (
      <Link
        href={href}
        className={`rounded-md border px-3 py-3 text-center text-[13px] transition-colors ${className}`}
      >
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-3 py-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
}
