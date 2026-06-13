"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppImage from "@/components/AppImage";
import WholesaleOrderB2BDialog from "@/components/WholesaleOrderB2BDialog";
import WholesaleOrderB2BIconTooltip from "@/components/WholesaleOrderB2BIconTooltip";
import Link from "@/components/link";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import {
  MEMBER_PORTAL_BANNER_CLASS,
  MEMBER_PORTAL_BOX_SURFACE,
  MEMBER_PORTAL_PANEL_CLASS,
} from "@/lib/member-portal-surfaces";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useSupabase } from "@/hooks/useSupabase";
import {
  ORDER_STATUS_FILTER_OPTIONS,
  getOrderStatusLabel,
  getOrderTrackingShortLabel,
  orderStatusIsPositive,
} from "@/lib/order-status";
import {
  fetchWholesaleOrders,
  formatOrderDate,
  formatOrderDateShort,
  formatWholesaleOrderId,
  formatWholesalePickupStoreSummary,
  getOrderItemCount,
  getOrderTypeLabel,
  isWholesalePickupOrder,
  WHOLESALE_ORDERS_PAGE_SIZE,
  type WholesaleOrder,
  type WholesaleOrderStatus,
  type WholesaleOrderStatusFilter,
} from "@/lib/supabase/wholesale-orders";
import { resolvePortalType } from "@/lib/privileges";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import {
  formatFlatShippingLines,
  getWholesaleOrderB2BSummary,
  hasMeaningfulFlatShippingAddress,
  hasWholesaleOrderB2B,
  parseWholesaleFinancialDetailsFromOrderRow,
} from "@/lib/wholesale-b2b-order";
import type { UserProfile, WholesaleProduct } from "@/types";
import type { WholesaleOrderB2BSection } from "@/types/WholesaleB2BOrder";
import type { LucideIcon } from "lucide-react";
import { pickWholesaleImageUrl } from "@/types";
import {
  Building2,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Package,
  Search,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
  if (orderStatusIsPositive(status)) {
    return "bg-emerald-500/15 text-emerald-300 before:bg-emerald-300";
  }
  if (status === "cancelled") {
    return "bg-white/10 text-white/45 before:bg-white/45";
  }
  return "bg-amber-500/15 text-amber-200 before:bg-amber-200";
}

type StatusBadgeProps = {
  status: WholesaleOrderStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium before:inline-block before:h-1.5 before:w-1.5 before:rounded-full ${statusBadgeClass(status)}`}
    >
      {getOrderStatusLabel(status)}
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
  onReorder: (
    productId: number,
    productName: string,
    unitPrice: number,
    imageUrl?: string | null,
  ) => void;
};

type B2BIconTooltip = {
  section: Exclude<WholesaleOrderB2BSection, "all">;
  label: string;
  icon: LucideIcon;
};

const B2B_ICON_TOOLTIPS: B2BIconTooltip[] = [
  { section: "buyer", label: "Buyer details", icon: User },
  { section: "shipping", label: "Shipping details", icon: MapPin },
  { section: "billing", label: "Billing details", icon: Building2 },
  { section: "financials", label: "Order totals", icon: Calculator },
];

function getB2BIconTooltips(isPickup: boolean): B2BIconTooltip[] {
  return B2B_ICON_TOOLTIPS.map((tooltip) =>
    tooltip.section === "shipping" && isPickup
      ? { ...tooltip, label: "Pickup location" }
      : tooltip,
  );
}

function OrderRow({
  order,
  expanded,
  onToggle,
  productMap,
  onReorder,
}: OrderRowProps) {
  const [b2bDialogOpen, setB2bDialogOpen] = useState(false);

  const itemCount = getOrderItemCount(order.items);
  const trackingLabel = getOrderTrackingShortLabel(order.status);
  const trackingUrl = order.tracking_token
    ? `/order-tracking/${order.tracking_token}`
    : null;
  const b2bForDisplay = useMemo(
    () => ({
      ...order.b2b,
      financialDetails:
        parseWholesaleFinancialDetailsFromOrderRow(order) ??
        order.b2b.financialDetails,
    }),
    [order],
  );
  const hasB2B = hasWholesaleOrderB2B(b2bForDisplay);
  const isPickup = isWholesalePickupOrder(order);
  const pickupSummary = formatWholesalePickupStoreSummary(
    order.pickup_store,
    order.requested_pick_up_store_id,
  );
  const b2bSummary = isPickup
    ? pickupSummary
    : getWholesaleOrderB2BSummary(b2bForDisplay) ??
      (hasMeaningfulFlatShippingAddress(order.address)
        ? formatFlatShippingLines(order.address).join(" · ")
        : null);
  const b2bIconTooltips = getB2BIconTooltips(isPickup);

  const openB2BDialog = (event: MouseEvent) => {
    event.stopPropagation();
    setB2bDialogOpen(true);
  };

  return (
    <article className={`overflow-hidden lg:rounded-xl ${MEMBER_PORTAL_PANEL_CLASS} rounded-lg`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full text-left transition-colors hover:bg-white/[0.03] lg:grid lg:grid-cols-[1.2fr_1.2fr_0.8fr_0.9fr_1.3fr_0.7fr_0.9fr_1fr] lg:items-center lg:gap-4 lg:border-b lg:border-white/10 lg:px-5 lg:py-4 ${
          trackingUrl ? "" : "border-b border-white/10"
        }`}
      >
        <div className="space-y-1 px-3 py-2.5 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
              <span className="truncate text-sm font-semibold text-white">
                {formatWholesaleOrderId(order.id)}
              </span>
              {hasB2B ? (
                <span className="shrink-0 rounded border border-white/10 bg-white/5 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-white/40">
                  B2B
                </span>
              ) : null}
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
                {trackingLabel ?? getOrderStatusLabel(order.status)}
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

        <div className="hidden items-center gap-2 font-medium text-white lg:flex">
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          <span>{formatWholesaleOrderId(order.id)}</span>
          {hasB2B ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/40">
              B2B
            </span>
          ) : null}
        </div>
        <div className="hidden text-sm text-white/70 lg:block">
          {formatOrderDate(order.created_at)}
        </div>
        <div className="hidden text-sm text-white/70 lg:block">
          {getOrderTypeLabel(order.order_type)}
        </div>
        <div className="hidden lg:block">
          <StatusBadge status={order.status} />
        </div>
        <div className="hidden min-w-0 text-sm lg:block">
          {trackingLabel ? (
            <div>
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
            <span className="text-white/35">—</span>
          )}
        </div>
        <div className="hidden text-sm text-white/70 lg:block">{itemCount}</div>
        <div className="hidden text-sm font-semibold text-white lg:block">
          ${order.grand_total.toFixed(2)}
        </div>
        <div className="hidden lg:block">
          {trackingUrl ? (
            <Link
              href={trackingUrl}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Track Order
            </Link>
          ) : (
            <span className="text-xs text-white/30">—</span>
          )}
        </div>
      </button>

      {trackingUrl ? (
        <div className="flex justify-end border-b border-white/10 px-3 py-1.5 lg:hidden">
          <Link
            href={trackingUrl}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold text-primary transition-colors hover:border-primary/45 hover:bg-primary/15 active:bg-primary/20"
          >
            Track
            <ExternalLink className="h-3 w-3 opacity-70" />
          </Link>
        </div>
      ) : null}

      {expanded ? (
        <div className={`px-3 py-2 lg:px-5 lg:py-3 ${MEMBER_PORTAL_BOX_SURFACE}`}>
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
                  className="border-b border-white/5 py-2 last:border-b-0 lg:grid lg:grid-cols-[2.5fr_0.7fr_0.8fr_1fr] lg:items-center lg:gap-4 lg:py-3"
                >
                  <div className="flex items-center gap-2.5 lg:gap-3 lg:pl-2">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-white/10 lg:h-12 lg:w-12 lg:rounded-lg">
                      {imageUrl ? (
                        <AppImage
                          src={imageUrl}
                          alt={item.item_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-base opacity-60 lg:text-lg">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm text-white">
                        {item.item_name}
                      </h4>
                      <p className="text-[11px] text-white/40 lg:text-xs">
                        <span className="lg:hidden">
                          {item.qty} × ${item.unit_price.toFixed(2)} ·{" "}
                        </span>
                        {unitLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onReorder(
                          item.menu_item_id,
                          item.item_name,
                          item.unit_price,
                          imageUrl,
                        )
                      }
                      className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-primary/90 lg:hidden"
                    >
                      Reorder
                    </button>
                  </div>
                  <div className="hidden text-sm text-white lg:block">{item.qty}</div>
                  <div className="hidden text-sm text-white lg:block">
                    ${item.unit_price.toFixed(2)}
                  </div>
                  <div className="hidden lg:block">
                    <button
                      type="button"
                      onClick={() =>
                        onReorder(
                          item.menu_item_id,
                          item.item_name,
                          item.unit_price,
                          imageUrl,
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

          {hasB2B ? (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2 lg:mt-4 lg:pt-4">
              {b2bSummary ? (
                <p className="hidden min-w-0 truncate text-xs text-white/50 lg:block">
                  {b2bSummary}
                </p>
              ) : (
                <span className="hidden lg:block" />
              )}
              <div
                className="ml-auto flex shrink-0 items-center gap-1.5 lg:gap-2"
                onClick={(event) => event.stopPropagation()}
              >
                {b2bIconTooltips.map(({ section, label, icon }) => (
                  <WholesaleOrderB2BIconTooltip
                    key={section}
                    section={section}
                    label={label}
                    icon={icon}
                    b2b={b2bForDisplay}
                    isPickup={isPickup}
                    pickupStore={order.pickup_store}
                    pickupStoreId={order.requested_pick_up_store_id}
                  />
                ))}
                <button
                  type="button"
                  onClick={openB2BDialog}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20 lg:gap-1.5 lg:rounded-lg lg:px-3 lg:py-1.5 lg:text-xs"
                >
                  <FileText className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                  Details
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <WholesaleOrderB2BDialog
        open={b2bDialogOpen}
        onOpenChange={setB2bDialogOpen}
        orderId={order.id}
        orderTotal={order.grand_total}
        b2b={b2bForDisplay}
        section="all"
        isPickup={isPickup}
        pickupStore={order.pickup_store}
        pickupStoreId={order.requested_pick_up_store_id}
      />
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (statusFilter !== "all") count += 1;
    if (dateFrom) count += 1;
    if (dateTo) count += 1;
    return count;
  }, [search, statusFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

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
    imageUrl?: string | null,
  ) => {
    addToCart({ productId, productName, unitPrice, imageUrl });
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
    <MemberPortalBackground>
      <MemberHeader member={me} onLogout={() => void handleLogout()} />

      <div className={`py-6 ${MEMBER_PORTAL_BANNER_CLASS}`}>
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
                  Welcome back, {me.contactName} | Email: {profile?.email}
                </p>
              </div>
            ) : null}
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
            aria-controls="wholesale-order-filters"
          >
            <h2 className="text-lg font-medium text-white">Filter orders</h2>
            {activeFilterCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-white">
                {activeFilterCount}
              </span>
            ) : null}
            <ChevronDown
              className={`ml-auto h-5 w-5 shrink-0 text-white/50 transition-transform lg:hidden ${
                mobileFiltersOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        <div
          id="wholesale-order-filters"
          className={`mb-8 flex-col gap-3 ${
            mobileFiltersOpen ? "flex" : "hidden"
          } lg:flex lg:flex-row lg:flex-wrap lg:items-center`}
        >
          <div className="relative w-full flex-1 lg:max-w-xs">
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
                setStatusFilter(event.target.value as WholesaleOrderStatusFilter)
              }
              className="w-full cursor-pointer appearance-none rounded-xl border border-white/15 bg-white/8 py-3 pl-4 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {ORDER_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-neutral-900">
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

        <div className={`hidden rounded-xl px-5 py-4 text-xs font-medium uppercase tracking-wide text-white/40 lg:grid lg:grid-cols-[1.2fr_1.2fr_0.8fr_0.9fr_1.3fr_0.7fr_0.9fr_1fr] lg:gap-4 ${MEMBER_PORTAL_BOX_SURFACE}`}>
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
          <div className="mt-3 space-y-2 lg:mt-5 lg:space-y-4">
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
    </MemberPortalBackground>
  );
}
