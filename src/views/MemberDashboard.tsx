"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/link";
import MemberHeader from "@/components/MemberHeader";
import MemberPortalBackground from "@/components/MemberPortalBackground";
import MemberDashboardOverviewSection from "@/components/member-dashboard/MemberDashboardOverviewSection";
import MemberDashboardReorderSection, {
  type RecentReorderItem,
} from "@/components/member-dashboard/MemberDashboardReorderSection";
import FranchiseAnnouncementsSection from "@/components/member-dashboard/FranchiseAnnouncementsSection";
import { formatAud } from "@/components/member-dashboard/format-aud";
import {
  MEMBER_PORTAL_LIGHT_BANNER_CLASS,
  MEMBER_PORTAL_LIGHT_BOX_SURFACE,
} from "@/lib/member-portal-surfaces";
import { useWholesaleCart } from "@/contexts/WholesaleCartContext";
import { useSupabase } from "@/hooks/useSupabase";
import { normalizeOrderStatus } from "@/lib/order-status";
import { hasPrivilege } from "@/lib/privileges";
import { WHOLESALE_REGISTRATION_MESSAGES } from "@/lib/wholesale-registration-status";
import { getClientStripeMode } from "@/lib/stripe-mode";
import { supabase } from "@/lib/supabase/client";
import {
  fetchWholesaleOrders,
  type WholesaleOrder,
} from "@/lib/supabase/wholesale-orders";
import type {
  UserProfile,
  WholesalePricingTier,
  WholesaleProduct,
} from "@/types";
import { pickWholesaleImageUrl } from "@/types";
import { Clock, TrendingUp, Truck, UserRound } from "lucide-react";
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

function isTestingOrders(): boolean {
  return getClientStripeMode() === "test";
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
    red: `border-primary/40 ${MEMBER_PORTAL_LIGHT_BOX_SURFACE} shadow-sm`,
    cyan: `border-cyan-500/40 ${MEMBER_PORTAL_LIGHT_BOX_SURFACE} shadow-sm`,
  };
  const valueStyles = {
    red: "text-primary",
    cyan: "text-cyan-700",
  };
  const iconStyles = {
    red: "text-primary",
    cyan: "text-cyan-600",
  };

  return (
    <div className={`relative rounded-lg border p-4 ${accentStyles[accent]}`}>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
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

  const hasAllPrivileges =
    hasPrivilege(authMetadata.privileges, "wholesale") ||
    hasPrivilege(authMetadata.privileges, "franchise");
  const hasWholesale = hasPrivilege(authMetadata.privileges, "wholesale");
  const hasFranchise = hasPrivilege(authMetadata.privileges, "franchise");
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
      <MemberPortalBackground
        variant="light"
        className="flex items-center justify-center"
      >
        <p className="text-gray-500 text-sm">Loading your account…</p>
      </MemberPortalBackground>
    );
  }

  return (
    <MemberPortalBackground variant="light">
      <MemberHeader
        member={me}
        onLogout={() => void handleLogout()}
        theme="light"
      />

      <div className={`py-6 ${MEMBER_PORTAL_LIGHT_BANNER_CLASS}`}>
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <UserRound className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-gray-900">
                Welcome back, {me.displayName}
              </h1>
              <p className="text-sm text-gray-500">
                {me.businessName} · {profile?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!hasAllPrivileges ? (
        <div className="container py-4">
          <div className="flex items-start gap-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-amber-900">
                Access pending approval
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-800/90">
                {WHOLESALE_REGISTRATION_MESSAGES.pending_approval_banner}
              </p>
              <p className="mt-3 text-sm text-amber-900">
                <span className="font-semibold">What you can do now:</span>{" "}
                <Link
                  href="/member/profile"
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Update your profile
                </Link>{" "}
                with your latest business and delivery details while you wait.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {hasFranchise ? (
        <div
          className={`container py-8 ${hasWholesale ? "pb-8" : "pb-16"}`}
        >
          <FranchiseAnnouncementsSection />
        </div>
      ) : null}

      {hasWholesale ? (
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

          <MemberDashboardOverviewSection
            hasPrivileges={hasAllPrivileges}
            loadingData={loadingData}
            recentOrders={recentOrders}
            profile={profile}
            sortedPricingTiers={sortedPricingTiers}
          />

          <MemberDashboardReorderSection
            loadingData={loadingData}
            items={recentReorderItems}
            onReorderItem={handleReorderItem}
          />
        </div>
      ) : null}
    </MemberPortalBackground>
  );
}
