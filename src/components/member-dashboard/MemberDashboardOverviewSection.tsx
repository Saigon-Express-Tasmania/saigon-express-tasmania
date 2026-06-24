import Link from "@/components/link";
import {
  MEMBER_PORTAL_LIGHT_BOX_SURFACE,
  MEMBER_PORTAL_LIGHT_PANEL_CLASS,
} from "@/lib/member-portal-surfaces";
import { getOrderStatusLabel, normalizeOrderStatus } from "@/lib/order-status";
import {
  formatOrderDate,
  formatWholesaleOrderId,
  getOrderTypeLabel,
  type WholesaleOrder,
} from "@/lib/supabase/wholesale-orders";
import type { UserProfile, WholesalePricingTier } from "@/types";
import { formatTierDiscountValue, formatTierMinValue } from "@/types";
import { CreditCard, Loader2, MapPin, Pencil } from "lucide-react";
import { formatAud } from "./format-aud";

function dashboardStatusBadgeClass(status: string): string {
  const normalized = normalizeOrderStatus(status);
  switch (normalized) {
    case "confirmed":
    case "completed":
    case "preparing":
    case "packed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "out_for_delivery":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "ready_to_pickup":
      return "bg-red-50 text-red-700 border-red-200";
    case "cancelled":
      return "bg-gray-100 text-gray-500 border-gray-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
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

export type MemberDashboardOverviewSectionProps = {
  hasPrivileges: boolean;
  loadingData: boolean;
  recentOrders: WholesaleOrder[];
  profile: UserProfile;
  sortedPricingTiers: WholesalePricingTier[];
};

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

export default function MemberDashboardOverviewSection({
  hasPrivileges,
  loadingData,
  recentOrders,
  profile,
  sortedPricingTiers,
}: MemberDashboardOverviewSectionProps) {
  const address = formatAddress(profile);
  return (
    <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
      <div className={`${MEMBER_PORTAL_LIGHT_PANEL_CLASS} p-5`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-900">
            Recent Activity & Orders
          </h2>
          {hasPrivileges ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/wholesale/shop"
                className="rounded-md border border-primary/50 bg-primary px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-primary/90"
              >
                Place New Order
              </Link>
              <Link
                href="/wholesale/orders"
                className={`inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700 transition-colors hover:bg-gray-50 ${MEMBER_PORTAL_LIGHT_BOX_SURFACE}`}
              >
                <CreditCard className="h-4 w-4" />
                View All Orders
              </Link>
            </div>
          ) : null}
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading orders…
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">
            No wholesale orders yet.{" "}
            {hasPrivileges ? (
              <Link
                href="/wholesale/shop"
                className="text-primary underline underline-offset-2"
              >
                Start shopping
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
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
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-4 text-gray-600">
                        {formatWholesaleOrderId(order.id)}
                      </td>
                      <td className="py-4 text-gray-600">
                        {formatOrderDate(order.created_at)}
                      </td>
                      <td className="py-4 text-gray-600">
                        {getOrderTypeLabel(order.order_type)}
                      </td>
                      <td className="py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-4 font-medium text-gray-900">
                        {formatAud(order.grand_total)}
                      </td>
                      <td className="py-4 text-right">
                        <Link
                          href={viewHref}
                          className="text-primary underline underline-offset-2"
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
        <div className={`relative ${MEMBER_PORTAL_LIGHT_PANEL_CLASS} p-4`}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-900">
            Personal Information
          </h2>
          <Link
            href="/member/profile"
            className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-700"
            aria-label="Edit profile"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <div className="space-y-1 text-[13px] leading-relaxed text-gray-600">
            <div>
              Email: <span className="text-gray-900">{profile.email}</span>
            </div>
            <div>
              Phone: <span className="text-gray-900">{profile.phone}</span>
            </div>
            {profile.business_name ? (
              <div>
                Business:{" "}
                <span className="text-gray-900">{profile.business_name}</span>
              </div>
            ) : null}
            {profile.abn ? (
              <div>
                ABN: <span className="text-gray-900">{profile.abn}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={`${MEMBER_PORTAL_LIGHT_PANEL_CLASS} p-4`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-gray-900">
              Delivery Addresses
            </h2>
            <Link
              href="/member/profile"
              className="px-3 absolute right-1 top-4 text-gray-400 transition-colors hover:text-gray-700"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          </div>
          {address ? (
            <div className="flex gap-2 text-[13px] text-gray-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span>{address}</span>
            </div>
          ) : (
            <p className="text-[13px] text-gray-500">
              No delivery address on file.{" "}
              <Link href="/member/profile" className="text-primary underline">
                Add one in your profile
              </Link>
              .
            </p>
          )}
        </div>

        <div className={`flex-1 ${MEMBER_PORTAL_LIGHT_PANEL_CLASS} p-4`}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-900">
            Wholesale Pricing Tiers
          </h2>
          {sortedPricingTiers.length === 0 ? (
            <p className="text-[13px] text-gray-500">
              No pricing tiers configured.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-2 pr-2 font-normal">Tier</th>
                    <th className="pb-2 pr-2 font-normal">Min. spend</th>
                    <th className="pb-2 font-normal">Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPricingTiers.map((tier) => (
                    <tr
                      key={tier.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-2.5 pr-2 text-gray-800">
                        {tier.label}
                        {tier.popular ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Popular
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-2 text-gray-600">
                        {formatTierMinValue(tier.minValue)}
                      </td>
                      <td className="py-2.5 font-medium text-cyan-700">
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
  );
}
