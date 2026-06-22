"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppImage from "@/components/AppImage";
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
import { getOrderStatusLabel, normalizeOrderStatus } from "@/lib/order-status";
import { hasPortalPrivilege, hasPrivilege } from "@/lib/privileges";
import { WHOLESALE_REGISTRATION_MESSAGES } from "@/lib/wholesale-registration-status";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { supabase } from "@/lib/supabase/client";
import {
  fetchWholesaleOrders,
  formatOrderDate,
  formatWholesaleOrderId,
  getOrderTypeLabel,
  type WholesaleOrder,
} from "@/lib/supabase/wholesale-orders";
import type {
  UserProfile,
  WholesalePricingTier,
  WholesaleProduct,
} from "@/types";
import {
  formatTierDiscountValue,
  formatTierMinValue,
  pickWholesaleImageUrl,
} from "@/types";
import {
  CreditCard,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  RotateCcw,
  TrendingUp,
  Truck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

const ACTIVE_STATUSES = new Set([
  "pending",
  "awaiting_payment",
  "confirmed",
  "preparing",
  "packed",
  "ready_to_pickup",
  "out_for_delivery",
]);

type MemberDashboardProps = {
  locale: string;
  products?: WholesaleProduct[];
  pricingTiers?: WholesalePricingTier[];
};

type OrderSummaryRow = {
  id: number;
  grand_total: number;
  subtotal: number;
  status: string;
  created_at: string;
};

type RecentReorderItem = {
  key: string;
  productId: number;
  itemName: string;
  category: string;
  qty: number;
  unitPrice: number;
  imageUrl: string | null;
  unit: string | null;
  isAvailable: boolean;
};

const MAX_REORDER_ITEMS = 8;

function getDisplayName(profile: UserProfile): string {
  if (profile.display_name?.trim()) return profile.display_name.trim();
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return profile.email ?? "Member";
}

function getMemberId(profile: UserProfile): string {
  return profile.id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function formatAud(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain || !local) return "***";
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 3) return "***";
  return `***${digits.slice(-3)}`;
}

function isTestingOrders(): boolean {
  return getClientStripeMode() === "test";
}

function dashboardStatusBadgeClass(status: string): string {
  const normalized = normalizeOrderStatus(status);
  switch (normalized) {
    case "confirmed":
    case "completed":
    case "preparing":
    case "packed":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "out_for_delivery":
      return "bg-orange-500/10 text-orange-400 border-orange-500/30";
    case "ready_to_pickup":
      return "bg-red-500/10 text-red-400 border-red-500/30";
    case "cancelled":
      return "bg-white/10 text-white/45 border-white/20";
    default:
      return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  }
}

function formatAddress(profile: UserProfile): string | null {
  const lines = [
    profile.address_line1,
    profile.address_line2,
    [profile.suburb, profile.state, profile.postal_code]
      .filter(Boolean)
      .join(" "),
    profile.city,
  ].filter((part) => part?.trim());

  return lines.length > 0 ? lines.join(", ") : null;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-current ${dashboardStatusBadgeClass(status)}`}
    >
      {getOrderStatusLabel(status)}
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: "red" | "cyan";
  icon?: React.ReactNode;
}) {
  const accentStyles = {
    red: `border-primary/80 ${MEMBER_PORTAL_BOX_SURFACE}`,
    cyan: `border-cyan-500/80 ${MEMBER_PORTAL_BOX_SURFACE}`,
  };
  const valueStyles = {
    red: "text-[#ff9999]",
    cyan: "text-cyan-200",
  };
  const iconStyles = {
    red: "text-primary",
    cyan: "text-cyan-400",
  };

  return (
    <div className={`relative rounded-lg border p-4 ${accentStyles[accent]}`}>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-white/70">
        {label}
      </div>
      <div
        className={`text-[28px] font-bold leading-tight ${valueStyles[accent]}`}
      >
        {value}
      </div>
      {icon ? (
        <div
          className={`absolute bottom-4 right-4 text-2xl opacity-80 ${iconStyles[accent]}`}
        >
          {icon}
        </div>
      ) : null}
    </div>
  );
}

export default function MemberDashboard({
  locale: _locale,
  products = [],
  pricingTiers = [],
}: MemberDashboardProps) {
  const router = useRouter();
  const { profile, authMetadata, user, isLoading, isSignedIn, signOut } =
    useSupabase();
  const { addToCart, setCartOpen } = useWholesaleCart();

  const [recentOrders, setRecentOrders] = useState<WholesaleOrder[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummaryRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const hasWholesale = hasPrivilege(authMetadata.privileges, "wholesale");
  const me = useMemo(() => {
    if (!profile) return null;
    return {
      businessName: profile.business_name?.trim() || getDisplayName(profile),
      displayName: getDisplayName(profile),
      memberId: getMemberId(profile),
      privileges: authMetadata.privileges,
      avatarUrl: profile.avatar_url?.trim() || null,
    };
  }, [profile, authMetadata]);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    setLoadingData(true);
    try {
      const [ordersResult, summaryResult] = await Promise.all([
        fetchWholesaleOrders({ userId: user.id, page: 1 }),
        supabase
          .from("orders")
          .select("id, grand_total, subtotal, status, created_at")
          .eq("customer_account", user.id)
          .eq("order_type", "wholesale")
          .eq("is_testing", isTestingOrders())
          .order("created_at", { ascending: false }),
      ]);

      setRecentOrders(ordersResult.orders.slice(0, 5));
      setOrderSummary((summaryResult.data ?? []) as OrderSummaryRow[]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard data.",
      );
    } finally {
      setLoadingData(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !isSignedIn) return;
    void loadDashboardData();
  }, [user?.id, isSignedIn, loadDashboardData]);

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.push("/member");
    }
  }, [isLoading, isSignedIn, router]);

  const stats = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const activeOrders = orderSummary.filter((order) =>
      ACTIVE_STATUSES.has(normalizeOrderStatus(order.status)),
    );
    const activeTotal = activeOrders.reduce(
      (sum, order) => sum + Number(order.grand_total ?? 0),
      0,
    );

    const completedYtd = orderSummary.filter((order) => {
      const created = new Date(order.created_at);
      return (
        normalizeOrderStatus(order.status) === "completed" &&
        created >= yearStart
      );
    });
    const ytdSpend = completedYtd.reduce(
      (sum, order) => sum + Number(order.subtotal ?? 0),
      0,
    );

    const bestDiscount = pricingTiers.reduce((max, tier) => {
      return Math.max(max, tier.discountValue);
    }, 0);
    const ytdSavings = ytdSpend * (bestDiscount / 100);

    return {
      activeCount: activeOrders.length,
      activeTotal,
      ytdSavings,
    };
  }, [orderSummary, pricingTiers]);

  const activeOrdersWithItems = useMemo(
    () =>
      recentOrders.filter((order) =>
        ACTIVE_STATUSES.has(normalizeOrderStatus(order.status)),
      ),
    [recentOrders],
  );

  const recentReorderItems = useMemo((): RecentReorderItem[] => {
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const items: RecentReorderItem[] = [];

    for (const order of activeOrdersWithItems) {
      for (const item of order.items) {
        if (items.length >= MAX_REORDER_ITEMS) return items;

        const product = productById.get(item.menu_item_id);
        items.push({
          key: `${order.id}-${item.id}`,
          productId: item.menu_item_id,
          itemName: item.item_name,
          category: product?.category ?? "",
          qty: item.qty,
          unitPrice: item.unit_price,
          imageUrl: product ? pickWholesaleImageUrl(product.imageUrls) : null,
          unit: product?.unit ?? null,
          isAvailable: product?.isAvailable ?? false,
        });
      }
    }

    return items;
  }, [activeOrdersWithItems, products]);

  const sortedPricingTiers = useMemo(
    () => [...pricingTiers].sort((a, b) => a.sortOrder - b.sortOrder),
    [pricingTiers],
  );

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out.");
    router.push("/member");
  };

  const handleReorderItem = (item: RecentReorderItem) => {
    if (!item.isAvailable) {
      toast.error(`${item.itemName} is not available today.`);
      return;
    }

    const product = products.find((p) => p.id === item.productId);
    if (!product) return;

    const imageUrl = pickWholesaleImageUrl(product.imageUrls);
    const unitPrice = Number(product.unitPrice);

    for (let i = 0; i < item.qty; i += 1) {
      addToCart(
        {
          productId: product.id,
          productName: product.name,
          unitPrice,
          imageUrl,
        },
        { silent: true },
      );
    }

    toast.success(`Added ${item.qty}× ${item.itemName} to your cart.`);
    setCartOpen(true);
  };

  const handleReorderAllActive = () => {
    if (activeOrdersWithItems.length === 0) {
      toast.message("No active orders to re-order.");
      router.push("/wholesale/shop");
      return;
    }

    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    let added = 0;

    for (const order of activeOrdersWithItems) {
      for (const item of order.items) {
        const product = productById.get(item.menu_item_id);
        if (!product?.isAvailable) continue;
        for (let i = 0; i < item.qty; i += 1) {
          addToCart(
            {
              productId: product.id,
              productName: product.name,
              unitPrice: Number(product.unitPrice),
              imageUrl: pickWholesaleImageUrl(product.imageUrls),
            },
            { silent: true },
          );
          added += 1;
        }
      }
    }

    if (added > 0) {
      toast.success(
        `Added items from ${activeOrdersWithItems.length} active order${
          activeOrdersWithItems.length === 1 ? "" : "s"
        } to your cart.`,
      );
      setCartOpen(true);
    } else {
      toast.message(
        "Active order items are unavailable today. Browse the shop instead.",
      );
      router.push("/wholesale/shop");
    }
  };

  if (isLoading || !me || !profile) {
    return (
      <MemberPortalBackground className="flex items-center justify-center">
        <p className="text-white/50 text-sm">Loading your account…</p>
      </MemberPortalBackground>
    );
  }

  const address = formatAddress(profile);

  return (
    <MemberPortalBackground>
      <MemberHeader
        member={me}
        onLogout={() => void handleLogout()}
      />

      <div className={`py-6 ${MEMBER_PORTAL_BANNER_CLASS}`}>
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20">
              <UserRound className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-white">
                Welcome back, {me.displayName}
              </h1>
              <p className="text-sm text-white/45">
                {me.businessName} · {profile?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!hasWholesale ? (
        <div className="container py-4">
          <div className="flex items-start gap-4 rounded-xl border border-amber-400/55 bg-amber-500/20 px-5 py-4 shadow-[0_0_24px_rgba(251,191,36,0.12)] backdrop-blur-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-400/25">
              <Clock className="h-5 w-5 text-amber-200" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-amber-50">
                Wholesale access pending approval
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-100/85">
                {WHOLESALE_REGISTRATION_MESSAGES.pending_approval_banner}
              </p>
              <p className="mt-3 text-sm text-amber-50">
                <span className="font-semibold">What you can do now:</span>{" "}
                <Link
                  href="/member/profile"
                  className="font-semibold text-white underline underline-offset-2 hover:text-amber-50"
                >
                  Update your profile
                </Link>{" "}
                with your latest business and delivery details while you wait.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="container py-8 pb-16">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label={`Active Orders (${stats.activeCount})`}
            value={formatAud(stats.activeTotal)}
            accent="red"
            icon={<Truck className="h-6 w-6" />}
          />
          <StatCard
            label="Total Wholesale Savings YTD"
            value={formatAud(stats.ytdSavings)}
            accent="cyan"
            icon={<TrendingUp className="h-6 w-6" />}
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <div className={`${MEMBER_PORTAL_PANEL_CLASS} p-5`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-white/90">
                Recent Activity & Orders
              </h2>
              {hasWholesale ? (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/wholesale/shop"
                    className="rounded-md border border-primary/50 bg-primary/85 px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-white shadow-[0_0_10px_rgba(200,16,46,0.3)] transition-colors hover:bg-primary"
                  >
                    Place New Order
                  </Link>
                  <Link
                    href="/wholesale/orders"
                    className={`inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/75 transition-colors hover:bg-white/10 ${MEMBER_PORTAL_BOX_SURFACE}`}
                  >
                    <CreditCard className="h-4 w-4" />
                    View All Orders
                  </Link>
                </div>
              ) : null}
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/45">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading orders…
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-10 text-center text-sm text-white/45">
                No wholesale orders yet.{" "}
                {hasWholesale ? (
                  <Link
                    href="/wholesale/shop"
                    className="text-sky-400 underline underline-offset-2"
                  >
                    Start shopping
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-white/10 text-white/45">
                      <th className="pb-3 font-normal">Order ID</th>
                      <th className="pb-3 font-normal">Date</th>
                      <th className="pb-3 font-normal">Type</th>
                      <th className="pb-3 font-normal">Status</th>
                      <th className="pb-3 font-normal">Amount</th>
                      <th className="pb-3 font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const viewHref = order.tracking_token
                        ? `/order-tracking/${order.tracking_token}`
                        : "/wholesale/orders";
                      return (
                        <tr
                          key={order.id}
                          className="border-b border-white/5 last:border-0"
                        >
                          <td className="py-4 text-white/70">
                            {formatWholesaleOrderId(order.id)}
                          </td>
                          <td className="py-4 text-white/70">
                            {formatOrderDate(order.created_at)}
                          </td>
                          <td className="py-4 text-white/70">
                            {getOrderTypeLabel(order.order_type)}
                          </td>
                          <td className="py-4">
                            <StatusBadge status={order.status} />
                          </td>
                          <td className="py-4 text-white/90">
                            {formatAud(order.grand_total)}
                          </td>
                          <td className="py-4 text-right">
                            <Link
                              href={viewHref}
                              className="text-sky-400 underline underline-offset-2"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className={`relative ${MEMBER_PORTAL_PANEL_CLASS} p-4`}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-white/90">
                Personal Information
              </h2>
              <Link
                href="/member/profile"
                className="absolute right-4 top-4 text-white/35 transition-colors hover:text-white/70"
                aria-label="Edit profile"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <div className="space-y-1 text-[13px] leading-relaxed text-white/65">
                <div>
                  Email: <span className="text-white">{profile.email}</span>
                </div>
                <div>
                  Phone: <span className="text-white">{profile.phone}</span>
                </div>
                {profile.business_name ? (
                  <div>
                    Business:{" "}
                    <span className="text-white">{profile.business_name}</span>
                  </div>
                ) : null}
                {profile.abn ? (
                  <div>
                    ABN: <span className="text-white">{profile.abn}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={`${MEMBER_PORTAL_PANEL_CLASS} p-4`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xs font-medium uppercase tracking-wide text-white/90">
                  Delivery Addresses
                </h2>
                <Link
                  href="/member/profile"
                  className="px-3 absolute right-1 top-4 text-white/35 transition-colors hover:text-white/70"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </div>
              {address ? (
                <div className="flex gap-2 text-[13px] text-white/65">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
                  <span>{address}</span>
                </div>
              ) : (
                <p className="text-[13px] text-white/45">
                  No delivery address on file.{" "}
                  <Link
                    href="/member/profile"
                    className="text-sky-400 underline"
                  >
                    Add one in your profile
                  </Link>
                  .
                </p>
              )}
            </div>

            <div className={`flex-1 ${MEMBER_PORTAL_PANEL_CLASS} p-4`}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-white/90">
                Wholesale Pricing Tiers
              </h2>
              {sortedPricingTiers.length === 0 ? (
                <p className="text-[13px] text-white/45">
                  No pricing tiers configured.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-white/10 text-white/45">
                        <th className="pb-2 pr-2 font-normal">Tier</th>
                        <th className="pb-2 pr-2 font-normal">Min. spend</th>
                        <th className="pb-2 font-normal">Discount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPricingTiers.map((tier) => (
                        <tr
                          key={tier.id}
                          className="border-b border-white/5 last:border-0"
                        >
                          <td className="py-2.5 pr-2 text-white/80">
                            {tier.label}
                            {tier.popular ? (
                              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                Popular
                              </span>
                            ) : null}
                          </td>
                          <td className="py-2.5 pr-2 text-white/65">
                            {formatTierMinValue(tier.minValue)}
                          </td>
                          <td className="py-2.5 font-medium text-cyan-200">
                            {formatTierDiscountValue(tier.discountValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasWholesale ? (
          <div className={`${MEMBER_PORTAL_PANEL_CLASS} p-5`}>
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-white/90">
                Reorder Recent Items
              </h2>
            </div>

            {loadingData ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/45">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading recent items…
              </div>
            ) : recentReorderItems.length === 0 ? (
              <p className="text-sm text-white/45">
                No recent orders to reorder.{" "}
                <Link
                  href="/wholesale/shop"
                  className="text-sky-400 underline underline-offset-2"
                >
                  Browse the shop
                </Link>
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recentReorderItems.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-xl border border-white/10 p-3 ${MEMBER_PORTAL_BOX_SURFACE}`}
                  >
                    <div className="mb-3 flex gap-2.5">
                      <div className="h-[50px] w-[50px] shrink-0 overflow-hidden rounded bg-white/10">
                        {item.imageUrl ? (
                          <AppImage
                            src={item.imageUrl}
                            alt={item.itemName}
                            width={50}
                            height={50}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">
                          {item.itemName}
                        </div>
                        <div className="text-[11px] leading-snug text-white/45">
                          {item.category}
                          <br />
                          {item.unit ? `Unit: ${item.unit}` : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-white/45">
                        Priced{" "}
                        <span className="font-bold text-primary">
                          {formatAud(item.unitPrice)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReorderItem(item)}
                        disabled={!item.isAvailable}
                        className="rounded bg-[#cc0000] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#aa0000] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </MemberPortalBackground>
  );
}
