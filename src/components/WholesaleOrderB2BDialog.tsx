"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatWholesalePaymentTerms,
  formatWholesaleStreetAddress,
} from "@/lib/wholesale-b2b-order";
import { formatWholesaleOrderId } from "@/lib/supabase/wholesale-orders";
import type {
  WholesaleOrderB2B,
  WholesaleOrderB2BSection,
  WholesaleOrderBuyer,
  WholesaleBillingAddress,
  WholesaleOrderFinancialDetails,
  WholesaleShippingAddress,
} from "@/types/WholesaleB2BOrder";
import {
  Building2,
  Calculator,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

function Detail({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
        {label}
      </dt>
      <dd className="text-sm text-white/90">{value}</dd>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
  id,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <section
      id={id}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function BuyerSection({ buyer }: { buyer: WholesaleOrderBuyer }) {
  return (
    <SectionCard id="b2b-buyer" icon={<User className="h-4 w-4" />} title="Buyer">
      <Detail label="Name" value={buyer.name} />
      <Detail label="Role" value={buyer.role} />
      <Detail
        label="Phone"
        value={
          buyer.contact_phone ? (
            <a
              href={`tel:${buyer.contact_phone}`}
              className="inline-flex items-center gap-1.5 hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5 opacity-60" />
              {buyer.contact_phone}
            </a>
          ) : null
        }
      />
      <Detail
        label="Email"
        value={
          buyer.contact_email ? (
            <a
              href={`mailto:${buyer.contact_email}`}
              className="inline-flex items-center gap-1.5 break-all hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 opacity-60" />
              {buyer.contact_email}
            </a>
          ) : null
        }
      />
    </SectionCard>
  );
}

function AddressBlock({
  lines,
  label,
}: {
  lines: string[];
  label: string;
}) {
  if (lines.length === 0) return null;
  return (
    <div className="sm:col-span-2">
      <Detail
        label={label}
        value={
          <address className="not-italic leading-relaxed">
            {lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        }
      />
    </div>
  );
}

function ShippingSection({ address }: { address: WholesaleShippingAddress }) {
  return (
    <SectionCard
      id="b2b-shipping"
      icon={<MapPin className="h-4 w-4" />}
      title="Shipping"
    >
      <Detail label="Business / DBA" value={address.dba_name} />
      <AddressBlock
        label="Address"
        lines={formatWholesaleStreetAddress(address)}
      />
      <Detail label="Delivery window" value={address.preferred_window} />
      <div className="sm:col-span-2">
        <Detail label="Special instructions" value={address.special_instructions} />
      </div>
    </SectionCard>
  );
}

function BillingSection({ address }: { address: WholesaleBillingAddress }) {
  return (
    <SectionCard
      id="b2b-billing"
      icon={<Building2 className="h-4 w-4" />}
      title="Billing"
    >
      <Detail label="Legal name" value={address.legal_name} />
      <Detail label="Tax ID / ABN" value={address.tax_id} />
      <Detail
        label="Payment terms"
        value={formatWholesalePaymentTerms(address.payment_terms)}
      />
      <AddressBlock
        label="Address"
        lines={formatWholesaleStreetAddress(address)}
      />
    </SectionCard>
  );
}

function FinancialsSection({
  financials,
  orderTotal,
}: {
  financials: WholesaleOrderFinancialDetails;
  orderTotal: number;
}) {
  const currency = financials.currency ?? "AUD";
  const fmt = (amount: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
    }).format(amount);

  return (
    <SectionCard
      id="b2b-financials"
      icon={<Calculator className="h-4 w-4" />}
      title="Financial summary"
    >
      <Detail label="Subtotal (ex GST)" value={fmt(financials.subtotal_ex_gst)} />
      <Detail label="GST" value={fmt(financials.gst_total)} />
      <div className="sm:col-span-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5">
        <Detail
          label="Grand total (inc GST)"
          value={
            <span className="text-base font-semibold text-primary">
              {fmt(financials.grand_total_inc_gst)}
            </span>
          }
        />
      </div>
      {Math.abs(financials.grand_total_inc_gst - orderTotal) > 0.02 ? (
        <div className="sm:col-span-2">
          <Detail
            label="Order total on record"
            value={fmt(orderTotal)}
          />
        </div>
      ) : null}
    </SectionCard>
  );
}

const SECTION_LABELS: Record<Exclude<WholesaleOrderB2BSection, "all">, string> = {
  buyer: "Buyer",
  shipping: "Shipping",
  billing: "Billing",
  financials: "Totals",
};

export default function WholesaleOrderB2BDialog({
  open,
  onOpenChange,
  orderId,
  orderTotal,
  b2b,
  section,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
  orderTotal: number;
  b2b: WholesaleOrderB2B;
  section: WholesaleOrderB2BSection;
}) {
  const showBuyer = section === "all" || section === "buyer";
  const showShipping = section === "all" || section === "shipping";
  const showBilling = section === "all" || section === "billing";
  const showFinancials = section === "all" || section === "financials";

  const title =
    section === "all"
      ? "Order details"
      : SECTION_LABELS[section];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(88vh,720px)] gap-0 overflow-hidden border-white/10 bg-neutral-950 p-0 text-white sm:max-w-lg">
        <DialogHeader className="border-b border-white/10 px-5 py-4 text-left">
          <DialogTitle className="font-serif text-xl text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="text-white/45">
            {formatWholesaleOrderId(orderId)} · B2B checkout data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {showBuyer && b2b.buyer ? <BuyerSection buyer={b2b.buyer} /> : null}
          {showShipping && b2b.shippingAddress ? (
            <ShippingSection address={b2b.shippingAddress} />
          ) : null}
          {showBilling && b2b.billingAddress ? (
            <BillingSection address={b2b.billingAddress} />
          ) : null}
          {showFinancials && b2b.financialDetails ? (
            <FinancialsSection
              financials={b2b.financialDetails}
              orderTotal={orderTotal}
            />
          ) : null}
          {section !== "all" &&
          ((section === "buyer" && !b2b.buyer) ||
            (section === "shipping" && !b2b.shippingAddress) ||
            (section === "billing" && !b2b.billingAddress) ||
            (section === "financials" && !b2b.financialDetails)) ? (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/45">
              No {SECTION_LABELS[section].toLowerCase()} data was saved for this
              order.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
