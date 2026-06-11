"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppImage from "@/components/AppImage";
import Link from "@/components/link";
import MemberHeader from "@/components/MemberHeader";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useSupabase } from "@/hooks/useSupabase";
import {
  fetchWholesaleOrders,
  formatOrderDate,
  formatWholesaleOrderId,
  getOrderItemCount,
  getOrderTypeLabel,
  WHOLESALE_ORDERS_PAGE_SIZE,
  type WholesaleOrder,
  type WholesaleOrderStatus,
  type WholesaleOrderStatusFilter,
} from "@/lib/supabase/wholesale-orders";
import { resolvePortalType } from "@/lib/privileges";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import type { UserProfile, WholesaleProduct } from "@/types";
import { pickWholesaleImageUrl } from "@/types";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Loader2,
  Package,
  Search,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_FILTER_OPTIONS: { value: WholesaleOrderStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function getContactName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

function getMemberId(profile: UserProfile): string {
  return profile.id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function statusBadgeClass(status: WholesaleOrderStatus): string {
  switch (status) {
    case "completed":
    case "ready":
      return "bg-emerald-500/15 text-emerald-300 before:bg-emerald-300";
    case "cancelled":
      return "bg-white/10 text-white/45 before:bg-white/45";
    default:
      return "bg-amber-500/15 text-amber-200 before:bg-amber-200";
  }
}

function statusLabel(status: WholesaleOrderStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function trackingStatusLabel(status: WholesaleOrderStatus): string | null {
  if (status === "completed") return "Delivered";
  if (status === "ready") return "Ready";
  if (status === "preparing" || status === "confirmed") return "Processing";
  if (status === "pending") return "Pending";
  return null;
}

type StatusBadgeProps = {
  status: WholesaleOrderStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium before:inline-block before:h-1.5 before:w-1.5 before:rounded-full ${statusBadgeClass(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (
      i === 1 ||
      i === totalPages ||
      Math.abs(i - page) <= 1
    ) {
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

type OrderRowProps = {
  order: WholesaleOrder;
  expanded: boolean;
  onToggle: () => void;
  productMap: Map<number, WholesaleProduct>;
  onReorder: (productId: number, productName: string, unitPrice: number) => void;
};

function OrderRow({
  order,
  expanded,
  onToggle,
  productMap,
  onReorder,
}: OrderRowProps) {
  const itemCount = getOrderItemCount(order.items);
  const trackingLabel = trackingStatusLabel(order.status);
  const trackingUrl = order.tracking_token
    ? `/order-tracking/${order.tracking_token}`
    : null;

  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-1 gap-3 border-b border-white/10 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] lg:grid-cols-[1.2fr_1.2fr_0.8fr_0.9fr_1.3fr_0.7fr_0.9fr_1fr] lg:items-center lg:gap-4 lg:px-5"
      >
        <div className="flex items-center gap-2 font-medium text-white">
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          <span>{formatWholesaleOrderId(order.id)}</span>
        </div>
        <div className="text-sm text-white/70 lg:contents">
          <span className="lg:block">{formatOrderDate(order.created_at)}</span>
        </div>
        <div className="text-sm text-white/70 lg:contents">
          <span className="lg:block">{getOrderTypeLabel(order.order_type)}</span>
        </div>
        <div className="lg:contents">
          <StatusBadge status={order.status} />
        </div>
        <div className="min-w-0 text-sm lg:contents">
          {trackingLabel ? (
            <div className="lg:block">
              <span className="text-emerald-300">{trackingLabel}</span>
              {trackingUrl ? (
                <Link
                  href={trackingUrl}
                  onClick={(event) => event.stopPropagation()}
                  className="mt-1 flex items-center gap-1 text-xs text-white/45 underline underline-offset-2 hover:text-white/70"
                >
                  Track order
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          ) : (
            <span className="text-white/35 lg:block">—</span>
          )}
        </div>
        <div className="text-sm text-white/70 lg:contents">
          <span className="lg:block">{itemCount}</span>
        </div>
        <div className="text-sm font-semibold text-white lg:contents">
          <span className="lg:block">${order.total.toFixed(2)}</span>
        </div>
        <div className="lg:contents">
          {trackingUrl ? (
            <Link
              href={trackingUrl}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90 lg:w-auto"
            >
              Track Order
            </Link>
          ) : (
            <span className="hidden text-xs text-white/30 lg:block">—</span>
          )}
        </div>
      </button>

      {expanded ? (
        <div className="bg-black/40 px-4 py-3 lg:px-5">
          <div className="mb-2 hidden grid-cols-[2.5fr_0.7fr_0.8fr_1fr] gap-4 border-b border-white/10 px-2 pb-2 text-xs font-medium uppercase tracking-wide text-white/40 lg:grid">
            <div className="pl-10">Items</div>
            <div>Quantity</div>
            <div>Unit price</div>
            <div>Actions</div>
          </div>

          <div className="space-y-1">
            {order.items.map((item) => {
              const product = productMap.get(item.menu_item_id);
              const imageUrl = product
                ? pickWholesaleImageUrl(product.imageUrls, [512, 256, 1448])
                : null;
              const unitLabel = product?.unit
                ? `per ${product.unit} ex GST`
                : "ex GST";

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 gap-3 border-b border-white/5 py-3 last:border-b-0 lg:grid-cols-[2.5fr_0.7fr_0.8fr_1fr] lg:items-center lg:gap-4"
                >
                  <div className="flex items-center gap-3 lg:pl-2">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
                      {imageUrl ? (
                        <AppImage
                          src={imageUrl}
                          alt={item.item_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg opacity-60">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm text-white">
                        {item.item_name}
                      </h4>
                      <p className="text-xs text-white/40">{unitLabel}</p>
                    </div>
                  </div>
                  <div className="text-sm text-white/70 lg:text-white">
                    <span className="mr-2 text-xs uppercase text-white/35 lg:hidden">
                      Qty
                    </span>
                    {item.qty}
                  </div>
                  <div className="text-sm text-white/70 lg:text-white">
                    <span className="mr-2 text-xs uppercase text-white/35 lg:hidden">
                      Unit
                    </span>
                    ${item.unit_price.toFixed(2)}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        onReorder(
                          item.menu_item_id,
                          item.item_name,
                          item.unit_price,
                        )
                      }
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      Reorder
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function WholesaleOrders({
  products,
}: {
  products: WholesaleProduct[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, authMetadata, user, isLoading, signOut } = useSupabase();
  const { addToCart, clearCart } = useWholesaleCart();

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

  const me = useMemo(() => {
    if (!profile || !isWholesaleMemberConfirmed(profile, authMetadata)) {
      return null;
    }
    return {
      businessName: profile.business_name ?? "Your Business",
      contactName: getContactName(profile),
      memberId: getMemberId(profile),
      portalType: resolvePortalType(authMetadata.privileges),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return orders;

    return orders.filter((order) => {
      if (formatWholesaleOrderId(order.id).toLowerCase().includes(normalizedSearch)) {
        return true;
      }
      return order.items.some((item) =>
        item.item_name.toLowerCase().includes(normalizedSearch),
      );
    });
  }, [orders, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / WHOLESALE_ORDERS_PAGE_SIZE),
  );

  useEffect(() => {
    if (!isLoading && !me) {
      router.push("/member");
    }
  }, [me, isLoading, router]);

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;

    setLoadingOrders(true);
    setLoadError(null);

    try {
      const result = await fetchWholesaleOrders({
        userId: user.id,
        page,
        status: statusFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setOrders(result.orders);
      setTotalCount(result.totalCount);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load orders.",
      );
      setOrders([]);
      setTotalCount(0);
    } finally {
      setLoadingOrders(false);
    }
  }, [user?.id, page, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!user?.id || !me) return;
    void loadOrders();
  }, [loadOrders, user?.id, me]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      clearCart();
      toast.success("Payment successful! Your wholesale order has been placed.");
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

  const handleReorder = (
    productId: number,
    productName: string,
    unitPrice: number,
  ) => {
    addToCart({ productId, productName, unitPrice });
  };

  const toggleExpanded = (orderId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <MemberHeader member={me} onLogout={() => void handleLogout()} />

      <div className="border-b border-white/10 py-6">
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            {me ? (
              <div>
                <h1 className="font-serif text-2xl font-bold text-white">
                  Order History
                </h1>
                <p className="text-sm text-white/45">
                  Welcome back, {me.contactName} | Member ID: {me.memberId}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container py-8">
        <h2 className="mb-4 text-lg font-medium text-white">Filter orders</h2>
        <div className="mb-8 flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search orders or products…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/8 py-3 pl-11 pr-4 text-sm text-white placeholder-white/25 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="From date"
          />
          <span className="hidden text-white/35 xl:inline">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="To date"
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as WholesaleOrderStatusFilter)
            }
            className="min-w-[180px] rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-neutral-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden rounded-xl bg-white/5 px-5 py-4 text-xs font-medium uppercase tracking-wide text-white/40 lg:grid lg:grid-cols-[1.2fr_1.2fr_0.8fr_0.9fr_1.3fr_0.7fr_0.9fr_1fr] lg:gap-4">
          <div>Order ID</div>
          <div>Date</div>
          <div>Order type</div>
          <div>Status</div>
          <div>Tracking</div>
          <div>Total items</div>
          <div>Total amount</div>
          <div>Action</div>
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
            <p className="font-medium">No orders found</p>
            <p className="mt-2 text-sm text-white/25">
              {search.trim()
                ? "Try adjusting your search or filters."
                : "Your wholesale orders will appear here after checkout."}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4 lg:mt-5">
            {filteredOrders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                expanded={expandedIds.has(order.id)}
                onToggle={() => toggleExpanded(order.id)}
                productMap={productMap}
                onReorder={handleReorder}
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
    </div>
  );
}
