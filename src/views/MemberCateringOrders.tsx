"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/link";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import {
  MEMBER_PORTAL_BANNER_CLASS,
  MEMBER_PORTAL_BOX_SURFACE,
  MEMBER_PORTAL_PANEL_CLASS,
} from "@/lib/member-portal-surfaces";
import { useCateringCart } from "@/contexts/CateringCartContext";
import { useSupabase } from "@/hooks/useSupabase";
import {
  ORDER_STATUS_FILTER_OPTIONS,
  cateringOrderNeedsAttention,
  getCateringOrderStatusLabel,
  getOrderTrackingShortLabel,
  memberOrderListPriority,
  orderStatusIsPositive,
} from "@/lib/order-status";
import { resolvePortalType } from "@/lib/privileges";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import {
  cancelMemberCateringOrder,
  fetchCateringOrders,
  formatOrderDate,
  formatOrderDateShort,
  formatRequestedTargetDate,
  formatWholesaleOrderId,
  getOrderItemCount,
  WHOLESALE_ORDERS_PAGE_SIZE,
  type WholesaleOrder,
  type WholesaleOrderStatus,
  type WholesaleOrderStatusFilter,
} from "@/lib/supabase/wholesale-orders";
import {
  formatFlatBillingLines,
  formatFlatShippingLines,
} from "@/lib/wholesale-b2b-order";
import type { UserProfile } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  ExternalLink,
  Loader2,
  CalendarDays,
  MapPin,
  ReceiptText,
  Package,
  CreditCard,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

function buildCateringPaymentFinancialDetails(order: WholesaleOrder) {
  const subtotalExGst = order.items.reduce(
    (sum, item) => sum + item.qty * item.unit_price,
    0,
  );
  const couponDiscount = order.coupon_discount ?? 0;
  const wholesaleDiscount = order.wholesale_discount ?? 0;
  const totalDiscount = couponDiscount + wholesaleDiscount;
  const gstTotal = order.tax_total ?? 0;
  const shippingFee = order.shipping_fee ?? 0;
  const grandTotal = Math.max(
    subtotalExGst - totalDiscount + gstTotal + shippingFee,
    0,
  );

  return {
    subtotal_ex_gst: Number(subtotalExGst.toFixed(2)),
    gst_total: Number(gstTotal.toFixed(2)),
    grand_total_inc_gst: Number(grandTotal.toFixed(2)),
    shipping_fee: Number(shippingFee.toFixed(2)),
    coupon_discount: Number(couponDiscount.toFixed(2)),
    wholesale_discount: Number(wholesaleDiscount.toFixed(2)),
    coupon_code: order.coupon_code ?? null,
    currency: "AUD",
  };
}

function statusBadgeClass(status: WholesaleOrderStatus): string {
  if (orderStatusIsPositive(status)) {
    return "bg-emerald-500/15 text-emerald-300 before:bg-emerald-300";
  }
  if (status === "cancelled") {
    return "bg-white/10 text-white/45 before:bg-white/45";
  }
  if (status === "pending") {
    return "bg-white/10 text-white/45 before:bg-white/45";
  }
  if (status === "awaiting_payment") {
    return "bg-yellow-500/15 text-yellow-300 before:bg-yellow-300";
  }
  return "bg-amber-500/15 text-amber-200 before:bg-amber-200";
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/50 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-1 text-sm text-white/35"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={`flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors ${
              item === page
                ? "border-white bg-white text-black"
                : "border-white/15 bg-white/5 text-white/50 hover:border-white/30 hover:text-white"
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/50 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function orderShowsTracking(status: WholesaleOrderStatus): boolean {
  return status !== "pending" && status !== "awaiting_payment";
}

function memberCateringOrderCanBeCancelled(
  status: WholesaleOrderStatus,
): boolean {
  return status === "pending" || status === "awaiting_payment";
}

function OrderRow({
  order,
  expanded,
  onToggle,
  onPayNow,
  onCancel,
  paying,
}: {
  order: WholesaleOrder;
  expanded: boolean;
  onToggle: () => void;
  onPayNow: (order: WholesaleOrder) => void;
  onCancel: (order: WholesaleOrder) => void;
  paying: boolean;
}) {
  const itemCount = getOrderItemCount(order.items);
  const paymentTotals = buildCateringPaymentFinancialDetails(order);
  const trackingLabel = getOrderTrackingShortLabel(order.status);
  const statusLabel = getCateringOrderStatusLabel(order.status);
  const needsAttention = cateringOrderNeedsAttention(order.status);
  const attentionBorderClass =
    order.status === "awaiting_payment"
      ? "ring-2 ring-amber-400/70"
      : order.status === "pending"
        ? "ring-2 ring-white/35"
        : needsAttention
          ? "ring-1 ring-amber-400/35"
          : "";
  const trackingUrl =
    order.tracking_token && orderShowsTracking(order.status)
      ? `/order-tracking/${order.tracking_token}`
      : null;
  const isAlwaysExpanded = order.status === "awaiting_payment";
  const isExpanded = expanded || isAlwaysExpanded;

  const shippingLines = formatFlatShippingLines(order.address);
  const billingLines = formatFlatBillingLines(order.address);
  const totalDiscount =
    paymentTotals.coupon_discount + paymentTotals.wholesale_discount;

  return (
    <article
      className={`overflow-hidden lg:rounded-xl ${MEMBER_PORTAL_PANEL_CLASS} rounded-lg ${
        attentionBorderClass
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full text-left transition-colors hover:bg-white/[0.03] lg:grid lg:grid-cols-[1.1fr_1fr_0.9fr_0.8fr_1fr_1fr] lg:items-center lg:gap-4 lg:border-b lg:border-white/10 lg:px-5 lg:py-4 ${
          trackingUrl ? "" : "border-b border-white/10"
        }`}
      >
        <div className="space-y-1 px-3 py-2.5 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-white transition-transform ${isExpanded ? "rotate-180" : ""} ${isAlwaysExpanded ? "opacity-50" : ""}`}
              />
              <span className="truncate text-sm font-semibold text-white">
                {formatWholesaleOrderId(order.id)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  orderStatusIsPositive(order.status)
                    ? "bg-emerald-500/15 text-emerald-300"
                    : order.status === "cancelled"
                      ? "bg-white/10 text-white/45"
                      : "bg-amber-500/15 text-amber-200"
                }`}
              >
                {trackingLabel ?? statusLabel}
              </span>
              <span className="text-sm font-bold tabular-nums text-white">
                ${order.grand_total.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pl-5 text-[11px] text-white/45">
            <span>{formatOrderDateShort(order.created_at)}</span>
            <span className="tabular-nums">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        <div className="hidden text-sm font-semibold text-white lg:flex gap-2">
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-white transition-transform ${isExpanded ? "rotate-180" : ""} ${isAlwaysExpanded ? "opacity-50" : ""}`}
          />
          <span>{formatWholesaleOrderId(order.id)}</span>
        </div>
        <div className="hidden text-sm text-white/55 lg:block">
          {formatOrderDateShort(order.created_at)}
        </div>
        <div className="hidden lg:block">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium before:inline-block before:h-1.5 before:w-1.5 before:rounded-full ${statusBadgeClass(order.status)}`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="hidden text-sm tabular-nums text-white/55 lg:block">
          {itemCount}
        </div>
        <div className="hidden text-sm font-bold tabular-nums text-white lg:block">
          ${order.grand_total.toFixed(2)}
        </div>
        <div className="hidden lg:flex justify-end">
          {trackingUrl ? (
            <Link
              href={trackingUrl}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:border-primary/50"
            >
              Track order <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="text-xs text-white/30">—</span>
          )}
        </div>
      </button>

      {isExpanded ? (
        <div className="border-t border-white/10 px-4 py-4 lg:px-5">
          <div className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/40">
                Placed
              </p>
              <p className="text-white/80">
                {formatOrderDate(order.created_at)}
              </p>
            </div>
            {order.requested_target_date ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-white/40">
                  Event date
                </p>
                <p className="text-white/80">
                  {formatRequestedTargetDate(order.requested_target_date)}
                </p>
              </div>
            ) : null}
          </div>
          <ul className="space-y-2">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="min-w-0 truncate text-white/80">
                      {item.qty}× {item.item_name}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="text-balance">
                      {item.qty}× {item.item_name}
                    </div>
                  </TooltipContent>
                </Tooltip>
                <span className="shrink-0 font-semibold tabular-nums text-white">
                  ${item.line_total.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          {order.status === "pending" ? (
            <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
              Our team is preparing your quotation. You will be able to pay once
              your order is marked ready to pay.
            </p>
          ) : order.status === "awaiting_payment" ? (
            <div className="mt-4 space-y-3 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-3">
              <p className="text-sm text-emerald-100/90">
                Your quotation is ready. Review the totals below and proceed to
                payment.
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between text-white/80">
                  <span>Subtotal (ex GST)</span>
                  <span className="tabular-nums">
                    ${paymentTotals.subtotal_ex_gst.toFixed(2)}
                  </span>
                </div>
                {paymentTotals.coupon_discount > 0 ||
                paymentTotals.wholesale_discount > 0 ? (
                  <div className="flex items-center justify-between text-emerald-100/90">
                    <span>Discount</span>
                    <span className="tabular-nums">
                      -$
                      {(
                        paymentTotals.coupon_discount +
                        paymentTotals.wholesale_discount
                      ).toFixed(2)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-white/80">
                  <span>GST</span>
                  <span className="tabular-nums">
                    ${paymentTotals.gst_total.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-white/80">
                  <span>Delivery</span>
                  <span className="tabular-nums">
                    ${paymentTotals.shipping_fee.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-white/20 pt-2 font-semibold text-white">
                  <span>Grand total (inc GST)</span>
                  <span className="tabular-nums">
                    ${paymentTotals.grand_total_inc_gst.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          <div
            className="mb-4 mt-4 flex flex-wrap items-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            {trackingUrl ? (
              <div className="lg:hidden">
                <Link
                  href={trackingUrl}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:border-primary/50"
                >
                  Track order <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : null}
            <div className="flex-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Shipping address"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                >
                  <MapPin className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="space-y-1">
                  <div className="font-semibold">Shipping</div>
                  {shippingLines.map((line, idx) => (
                    <div key={`ship-${idx}`}>{line}</div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Billing address"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="space-y-1">
                  <div className="font-semibold">Billing</div>
                  {billingLines.map((line, idx) => (
                    <div key={`bill-${idx}`}>{line}</div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>

            {order.status !== "pending" ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Financial details"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                  >
                    <ReceiptText className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="space-y-1">
                    <div className="font-semibold">Financial details</div>
                    <div>
                      Subtotal (ex GST): $
                      {paymentTotals.subtotal_ex_gst.toFixed(2)}
                    </div>
                    <div>Discount: -${totalDiscount.toFixed(2)}</div>
                    <div>GST: ${paymentTotals.gst_total.toFixed(2)}</div>
                    <div>
                      Delivery: ${paymentTotals.shipping_fee.toFixed(2)}
                    </div>
                    <div className="font-semibold">
                      Grand total: $
                      {paymentTotals.grand_total_inc_gst.toFixed(2)}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : null}

            {order.requested_target_date ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Event date"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white/70 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-balance">
                    Event date:{" "}
                    {formatRequestedTargetDate(order.requested_target_date)}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : null}

            {memberCateringOrderCanBeCancelled(order.status) ? (
              <button
                type="button"
                onClick={() => onCancel(order)}
                disabled={paying}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 transition-colors hover:border-red-400/50 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Cancel order
              </button>
            ) : null}
            {order.status === "awaiting_payment" ? (
              <button
                type="button"
                onClick={() => onPayNow(order)}
                disabled={paying}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Opening payment…
                  </>
                ) : (
                  <>
                    <CreditCard className="h-3.5 w-3.5" />
                    Pay now
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function MemberCateringOrders() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    profile,
    authMetadata,
    isLoading,
    isSignedIn,
    signOut,
    user,
    session,
  } = useSupabase();
  const { clearCart } = useCateringCart();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<WholesaleOrderStatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);
  const cancelingOrderIdsRef = useRef(new Set<number>());

  const me = useMemo(() => {
    if (!profile) return null;
    return {
      businessName: profile.business_name?.trim() || getContactName(profile),
      contactName: getContactName(profile),
      portalType: resolvePortalType(authMetadata.privileges),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (statusFilter !== "all") count += 1;
    if (dateFrom) count += 1;
    if (dateTo) count += 1;
    return count;
  }, [search, statusFilter, dateFrom, dateTo]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const list = !normalizedSearch
      ? orders
      : orders.filter((order) => {
          if (
            formatWholesaleOrderId(order.id)
              .toLowerCase()
              .includes(normalizedSearch)
          ) {
            return true;
          }
          return order.items.some((item) =>
            item.item_name.toLowerCase().includes(normalizedSearch),
          );
        });

    return [...list].sort((a, b) => {
      const priorityDiff =
        memberOrderListPriority(a.status) - memberOrderListPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [orders, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / WHOLESALE_ORDERS_PAGE_SIZE),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isSignedIn) {
      window.localStorage.setItem("lastOrdersPage", "/member/catering-orders");
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.push("/member");
    }
  }, [isLoading, isSignedIn, router]);

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const order of orders) {
        if (order.status === "awaiting_payment" && !next.has(order.id)) {
          next.add(order.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [orders]);

  const loadOrders = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user?.id) return;

      if (!options?.silent) {
        setLoadingOrders(true);
        setLoadError(null);
      }

      try {
        const result = await fetchCateringOrders({
          userId: user.id,
          page,
          status: statusFilter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        setOrders(result.orders);
        setTotalCount(result.totalCount);
      } catch (error) {
        if (!options?.silent) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load orders.",
          );
          setOrders([]);
          setTotalCount(0);
        }
      } finally {
        if (!options?.silent) {
          setLoadingOrders(false);
        }
      }
    },
    [user?.id, page, statusFilter, dateFrom, dateTo],
  );

  useEffect(() => {
    if (!user?.id || !isSignedIn) return;
    void loadOrders();
  }, [loadOrders, user?.id, isSignedIn]);

  useEffect(() => {
    const placed = searchParams.get("placed");
    const checkout = searchParams.get("checkout");
    if (!placed && !checkout) return;
    setPayingOrderId(null);

    if (placed === "success") {
      clearCart();
      toast.success(
        "Catering order submitted. Our team will contact you with a quotation.",
        { id: "catering-order-placed" },
      );
      void loadOrders();
    } else if (checkout === "success") {
      clearCart();
      toast.success("Payment successful! Your catering order has been placed.");
      void loadOrders();
    } else if (checkout === "cancelled") {
      toast.error("Checkout was cancelled. Your cart is unchanged.");
    }

    router.replace(pathname, { scroll: false });
  }, [searchParams, router, pathname, clearCart, loadOrders]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const handlePayNow = useCallback(
    async (order: WholesaleOrder) => {
      if (!session?.access_token || !user?.id) {
        toast.error("Please sign in again to continue.");
        return;
      }
      if (order.status !== "awaiting_payment") {
        toast.error("This order is not ready for payment.");
        return;
      }
      const customerEmail = (profile?.email ?? user.email ?? "").trim();
      if (!customerEmail) {
        toast.error(
          "Please add an email address to your profile before paying.",
        );
        return;
      }

      setPayingOrderId(order.id);
      try {
        const result = await invokeEdgeFunction<{ url?: string | null }>(
          "checkout",
          {
            method: "POST",
            accessToken: session.access_token,
            body: {
              mode: getClientStripeMode(),
              orderType: "catering",
              orderId: order.id,
              customerAccount: user.id,
              customerName:
                order.b2b.buyer?.name ?? me?.contactName ?? "Member",
              customerEmail,
              customerPhone: profile?.phone ?? "N/A",
              fulfillmentType: order.requested_fulfillment_method ?? "delivery",
              origin: window.location.origin,
              returnTo: "/member/catering-orders",
              successReturnTo: "/member/catering-orders",
              financialDetails: buildCateringPaymentFinancialDetails(order),
            },
          },
        );

        if (!result.ok) {
          throw new Error(result.error || "Failed to start payment");
        }

        if (!result.data.url) {
          throw new Error("No checkout URL returned");
        }

        window.location.href = result.data.url;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to start payment";
        toast.error(message);
        setPayingOrderId(null);
      }
    },
    [
      session?.access_token,
      user?.id,
      user?.email,
      me?.contactName,
      profile?.email,
      profile?.phone,
    ],
  );

  const handleCancelOrder = useCallback(
    async (order: WholesaleOrder) => {
      if (!memberCateringOrderCanBeCancelled(order.status)) {
        toast.error("This order cannot be cancelled.");
        return;
      }
      if (cancelingOrderIdsRef.current.has(order.id)) return;

      cancelingOrderIdsRef.current.add(order.id);
      try {
        await cancelMemberCateringOrder(order.id);
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
        setOrders((prev) => prev.filter((item) => item.id !== order.id));
        setTotalCount((prev) => Math.max(0, prev - 1));
        void loadOrders({ silent: true });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to cancel order.";
        toast.error(message);
        void loadOrders({ silent: true });
      } finally {
        cancelingOrderIdsRef.current.delete(order.id);
      }
    },
    [loadOrders],
  );

  if (isLoading || !isSignedIn || !me) {
    return (
      <MemberPortalBackground className="flex items-center justify-center">
        <p className="text-sm text-white/50">Loading catering orders…</p>
      </MemberPortalBackground>
    );
  }

  return (
    <MemberPortalBackground>
      {payingOrderId != null ? (
        <div
          className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-black/55 backdrop-blur-[2px]"
          aria-busy="true"
          aria-live="polite"
          role="alertdialog"
          aria-label="Preparing payment"
        >
          <div className="mx-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/90 px-6 py-4 shadow-2xl">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold text-white">
              Preparing secure payment…
            </p>
          </div>
        </div>
      ) : null}
      <MemberHeader member={me} onLogout={() => void handleLogout()} />

      <div className={`py-6 ${MEMBER_PORTAL_BANNER_CLASS}`}>
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-green-600/40 bg-green-400/20">
              <ClipboardList className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-white">
                Catering Orders
              </h1>
              <p className="text-sm text-white/45">
                Welcome back, {me.contactName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="mb-4 lg:mb-4">
          <button
            type="button"
            className="flex w-full items-center gap-2 text-left lg:pointer-events-none lg:cursor-default"
            onClick={() => setMobileFiltersOpen((open) => !open)}
            aria-expanded={mobileFiltersOpen}
          >
            <ChevronDown
              className={`ml-auto h-5 w-5 shrink-0 text-white/50 transition-transform lg:hidden ${
                mobileFiltersOpen ? "rotate-180" : ""
              }`}
            />
            <h2 className="text-lg font-medium text-white">Filter orders</h2>
            {activeFilterCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        <div
          className={`mb-8 flex-col gap-3 ${
            mobileFiltersOpen ? "flex" : "hidden"
          } lg:flex lg:flex-row lg:flex-wrap lg:items-center`}
        >
          <div className="relative w-full flex-1 lg:max-w-xs">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search orders or items…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/8 py-3 pl-11 pr-4 text-sm text-white placeholder-white/25 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/40 lg:w-auto"
            aria-label="From date"
          />
          <span className="hidden text-white/35 lg:inline">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/40 lg:w-auto"
            aria-label="To date"
          />
          <div className="relative w-full lg:w-auto lg:min-w-[180px]">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as WholesaleOrderStatusFilter,
                )
              }
              className="w-full cursor-pointer appearance-none rounded-xl border border-white/15 bg-white/8 py-3 pl-4 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {ORDER_STATUS_FILTER_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-neutral-900"
                >
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45"
              aria-hidden
            />
          </div>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white lg:w-auto ${MEMBER_PORTAL_BOX_SURFACE}`}
            >
              <X className="h-4 w-4" />
              Clear filters
            </button>
          ) : null}
        </div>

        {loadingOrders ? (
          <div className="flex items-center justify-center py-24 text-white/40">
            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
            Loading orders…
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-6 text-center text-sm text-red-200">
            {loadError}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-white/30">
            <Package className="mx-auto mb-4 h-12 w-12 opacity-30" />
            <p className="font-medium">No catering orders found</p>
            <p className="mt-2 text-sm text-white/25">
              {search.trim()
                ? "Try adjusting your search or filters."
                : "Your catering orders will appear here after you place an order."}
            </p>
            <Link
              href="/member/catering-shop"
              className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Browse catering shop
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-2 lg:mt-5 lg:space-y-4">
            {filteredOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                expanded={expandedIds.has(order.id)}
                onPayNow={handlePayNow}
                onCancel={handleCancelOrder}
                paying={payingOrderId === order.id}
                onToggle={() => {
                  if (order.status === "awaiting_payment") return;
                  setExpandedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(order.id)) next.delete(order.id);
                    else next.add(order.id);
                    return next;
                  });
                }}
              />
            ))}
          </div>
        )}

        {!loadingOrders && !loadError && totalCount > 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-sm text-white/40">
              Showing {(page - 1) * WHOLESALE_ORDERS_PAGE_SIZE + 1}–
              {Math.min(page * WHOLESALE_ORDERS_PAGE_SIZE, totalCount)} of{" "}
              {totalCount} orders
            </p>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>
    </MemberPortalBackground>
  );
}
