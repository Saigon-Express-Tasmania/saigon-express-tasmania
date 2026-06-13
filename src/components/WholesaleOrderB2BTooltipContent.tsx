import type { ReactNode } from "react";
import type { WholesalePickupStore } from "@/lib/supabase/wholesale-orders";
import { formatStoreHours } from "@/lib/store-hours";
import {
  formatWholesaleStreetAddress,
  WHOLESALE_PAYMENT_TERMS_OPTIONS,
} from "@/lib/wholesale-b2b-order";
import type {
  WholesaleOrderB2B,
  WholesaleOrderB2BSection,
  WholesaleOrderFinancialDetails,
} from "@/types/WholesaleB2BOrder";

function TooltipRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-0.5 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
        {label}
      </p>
      <p className="text-xs leading-snug text-white/90">{value}</p>
    </div>
  );
}

function TooltipBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-white">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function formatMoney(financials: WholesaleOrderFinancialDetails, amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: financials.currency ?? "AUD",
  }).format(amount);
}

export function WholesaleOrderB2BTooltipContent({
  section,
  b2b,
  isPickup = false,
  pickupStore = null,
  pickupStoreId = null,
}: {
  section: Exclude<WholesaleOrderB2BSection, "all">;
  b2b: WholesaleOrderB2B;
  isPickup?: boolean;
  pickupStore?: WholesalePickupStore | null;
  pickupStoreId?: number | null;
}) {
  if (section === "buyer") {
    if (!b2b.buyer) {
      return <p className="text-xs text-white/50">No buyer data saved.</p>;
    }
    return (
      <TooltipBlock title="Buyer">
        <TooltipRow label="Name" value={b2b.buyer.name} />
        <TooltipRow label="Role" value={b2b.buyer.role} />
        <TooltipRow label="Phone" value={b2b.buyer.contact_phone} />
        <TooltipRow label="Email" value={b2b.buyer.contact_email} />
      </TooltipBlock>
    );
  }

  if (section === "shipping") {
    if (isPickup) {
      if (!pickupStore && pickupStoreId == null) {
        return <p className="text-xs text-white/50">No pickup location saved.</p>;
      }
      return (
        <TooltipBlock title="Pickup location">
          <TooltipRow label="Store" value={pickupStore?.name} />
          <TooltipRow
            label="Address"
            value={
              pickupStore
                ? [pickupStore.address, pickupStore.suburb].filter(Boolean).join(", ")
                : null
            }
          />
          <TooltipRow label="Phone" value={pickupStore?.phone} />
          <TooltipRow
            label="Hours"
            value={formatStoreHours(pickupStore?.hours)}
          />
        </TooltipBlock>
      );
    }
    if (!b2b.shippingAddress) {
      return <p className="text-xs text-white/50">No shipping data saved.</p>;
    }
    const address = b2b.shippingAddress;
    const lines = formatWholesaleStreetAddress(address);
    return (
      <TooltipBlock title="Shipping">
        <TooltipRow label="Business / DBA" value={address.dba_name} />
        {lines.length > 0 ? (
          <TooltipRow label="Address" value={lines.join(", ")} />
        ) : null}
        <TooltipRow label="Delivery window" value={address.preferred_window} />
        <TooltipRow
          label="Instructions"
          value={address.special_instructions}
        />
      </TooltipBlock>
    );
  }

  if (section === "billing") {
    if (!b2b.billingAddress) {
      return <p className="text-xs text-white/50">No billing data saved.</p>;
    }
    const address = b2b.billingAddress;
    const lines = formatWholesaleStreetAddress(address);
    return (
      <TooltipBlock title="Billing">
        <TooltipRow label="Legal name" value={address.legal_name} />
        <TooltipRow label="Tax ID / ABN" value={address.tax_id} />
        <TooltipRow
          label="Payment terms"
          value={
            address.payment_terms
              ? WHOLESALE_PAYMENT_TERMS_OPTIONS.find(
                  (option) => option.value === address.payment_terms,
                )?.label ?? address.payment_terms
              : "—"
          }
        />
        {lines.length > 0 ? (
          <TooltipRow label="Address" value={lines.join(", ")} />
        ) : null}
      </TooltipBlock>
    );
  }

  if (!b2b.financialDetails) {
    return <p className="text-xs text-white/50">No totals saved.</p>;
  }
  const financials = b2b.financialDetails;
  return (
    <TooltipBlock title="Totals">
      <TooltipRow
        label="Subtotal (ex GST)"
        value={formatMoney(financials, financials.subtotal_ex_gst)}
      />
      <TooltipRow label="GST" value={formatMoney(financials, financials.gst_total)} />
      {financials.shipping_fee != null && financials.shipping_fee > 0 ? (
        <TooltipRow
          label="Shipping fee"
          value={formatMoney(financials, financials.shipping_fee)}
        />
      ) : null}
      <div className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1.5">
        <TooltipRow
          label="Grand total (inc GST)"
          value={formatMoney(financials, financials.grand_total_inc_gst)}
        />
      </div>
    </TooltipBlock>
  );
}
