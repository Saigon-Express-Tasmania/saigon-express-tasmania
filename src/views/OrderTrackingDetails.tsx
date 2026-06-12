"use client";

import { useMemo } from "react";
import Link from "@/components/link";
import MemberHeader, {
  type MemberHeaderMember,
} from "@/components/MemberHeader";
import { useSupabase } from "@/hooks/useSupabase";
import { isWholesaleMemberConfirmed } from "@/lib/wholesale-registration-status";
import {
  buildOrderTimeline,
  formatTrackedCurrency,
  formatTrackedDate,
  formatTrackedOrderId,
  getExpectedDeliveryLabel,
  getOrderStatusLabel,
  isItemPacked,
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
import { useTranslations } from "next-intl";
import {
  Check,
  ClipboardList,
  FileText,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type OrderTrackingDetailsProps = {
  order: TrackedOrder;
  storeName?: string | null;
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
      return "border-zinc-800 bg-[#161616]";
  }
}

function timelineIconForStep(key: string) {
  switch (key) {
    case "placed":
      return FileText;
    case "processing":
      return Check;
    case "quality":
      return ShieldCheck;
    case "packed":
      return Package;
    default:
      return Truck;
  }
}

function getMemberId(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export default function OrderTrackingDetails({
  order,
  storeName,
}: OrderTrackingDetailsProps) {
  const t = useTranslations("OrderTrackingDetails");
  const router = useRouter();
  const { profile, authMetadata, signOut } = useSupabase();

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
      packed: t("status.preparing"),
      ready_to_pickup: t("status.ready"),
      out_for_delivery: t("status.ready"),
      ready: t("status.ready"),
      completed: t("status.completed"),
      cancelled: t("status.cancelled"),
    }),
    [t],
  );

  const timeline = useMemo(
    () =>
      buildOrderTimeline(order, {
        placed: t("timeline.placed"),
        processing: t("timeline.processing"),
        qualityChecked: t("timeline.qualityChecked"),
        packed: t("timeline.packed"),
        delivery: t("timeline.delivery"),
        pickupReady: t("timeline.pickupReady"),
      }),
    [order, t],
  );

  const expectedDelivery = getExpectedDeliveryLabel(order);
  const orderLabel = formatTrackedOrderId(order.id);
  const packed = isItemPacked(order.status);

  const deliveryLines = hasMeaningfulFlatShippingAddress(order.address)
    ? formatFlatShippingLines(order.address)
    : order.b2b.shippingAddress
      ? formatWholesaleStreetAddress(order.b2b.shippingAddress)
      : storeName
        ? [storeName]
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

  const welcomeLine = member
    ? t("welcomeMember", {
        name: profile?.display_name?.trim() || order.customer_name
      })
    : t("welcomeGuest", { name: order.customer_name });

  const lastUpdate = order.status_updated_at ?? order.created_at;

  const handleLogout = async () => {
    await signOut();
    toast.success(t("signedOut"));
    router.push("/member");
  };

  return (
    <div className="pb-8 bg-[#0b0b0b] text-white">
      <MemberHeader
        member={member}
        onLogout={() => void handleLogout()}
        showCart={Boolean(member)}
      />

      <div className="container max-w-[1400px] py-5">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold sm:text-[22px]">
              {t("title", { orderId: orderLabel })}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{welcomeLine}</p>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-4 rounded-[10px] border border-zinc-800 bg-[#161616] p-5 lg:flex-row lg:items-center lg:justify-between">
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
          <div className="lg:text-right">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium ${statusBadgeClass(order.status)}`}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel(order.status, statusLabels)}
            </span>
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
            <div className="overflow-hidden rounded-[10px] border border-zinc-800 bg-[#161616]">
              <div className="relative flex h-[250px] items-center justify-center border-b border-zinc-800 bg-[#212c3d]">
                <div className="absolute left-[20%] top-[60%] h-4 w-4 rounded-full border-[3px] border-white bg-blue-500" />
                <div className="absolute right-[25%] top-[35%] flex h-5 w-5 items-center justify-center rounded-full border-[3px] border-white bg-red-500">
                  <Truck className="h-2.5 w-2.5 text-white" />
                </div>
                <div className="absolute left-[20%] top-1/2 h-1 w-[60%] -translate-y-1/2 rotate-[-15deg] rounded bg-blue-500" />
                <span className="relative z-[2] text-2xl font-bold text-white/20">
                  {t("deliveryMap.placeholder")}
                </span>
              </div>

              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <div className="mb-1 text-[13px] font-bold">
                      {t("deliveryMap.addressTitle")}
                    </div>
                    {deliveryLines.length > 0 ? (
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
                    <div>
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
                <div>
                  <div className="mb-1 text-[13px] font-bold">
                    {t("deliveryMap.carrierTitle")}
                  </div>
                  <div className="text-[13px] text-zinc-400">
                    {t("deliveryMap.lastUpdate", {
                      date: formatOrderDate(lastUpdate),
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-[1.2] flex-col">
            <h2 className="mb-4 text-lg font-medium">{t("items.title")}</h2>
            <div className="flex flex-1 flex-col justify-between rounded-[10px] border border-zinc-800 bg-[#161616] p-5">
              <div>
                <div className="mb-4 font-medium">{t("items.shipmentTitle")}</div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-zinc-700 text-zinc-500">
                        <th className="pb-2.5 font-normal">{t("items.sku")}</th>
                        <th className="pb-2.5 font-normal">{t("items.name")}</th>
                        <th className="pb-2.5 font-normal">{t("items.qty")}</th>
                        <th className="pb-2.5 font-normal">{t("items.unit")}</th>
                        <th className="pb-2.5 font-normal">{t("items.total")}</th>
                        <th className="pb-2.5 text-right font-normal">
                          {t("items.packed")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-zinc-800 last:border-0"
                        >
                          <td className="py-4">{item.sku || item.menu_item_id}</td>
                          <td className="py-4">{item.item_name}</td>
                          <td className="py-4 text-zinc-300">{item.qty}</td>
                          <td className="py-4">
                            {formatTrackedCurrency(item.unit_price)}
                          </td>
                          <td className="py-4 font-bold">
                            {formatTrackedCurrency(item.line_total)}
                          </td>
                          <td className="py-4 text-right">
                            <span
                              className={`inline-block rounded border px-2 py-1 text-xs ${
                                packed
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                  : "border-zinc-700 bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              {packed ? t("items.packedYes") : t("items.packedNo")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                <ActionButton label={t("actions.viewInvoice")} disabled />
                <ActionButton label={t("actions.downloadPackingSlip")} disabled />
                <ActionButton label={t("actions.reportIssue")} href="/contact" />
                <ActionButton
                  label={t("actions.contactSupplier")}
                  href="/contact"
                  variant="primary"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/order-tracking"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            {t("backToTracking")}
          </Link>
        </div>
      </div>
    </div>
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
  variant = "default",
}: {
  label: string;
  disabled?: boolean;
  href?: string;
  variant?: "default" | "primary";
}) {
  const className =
    variant === "primary"
      ? "border-red-900 bg-red-950 text-red-400 hover:bg-red-900/80"
      : "border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-950/70";

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
      className={`rounded-md border px-3 py-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
}
