import {
  formatInvoiceDueDate,
  formatInvoiceNumber,
  INVOICE_COMPANY,
  type InvoiceAddressBlock,
  type InvoiceCompanyInfo,
  type InvoiceContactDefaults,
} from "@/lib/order-invoice";
import {
  formatTrackedDateLong,
  formatTrackedOrderId,
  isPickupFulfillment,
  type TrackedOrder,
} from "@/lib/supabase/order-tracking";
import type { OrderPaymentTerms } from "@/types/WholesaleB2BOrder";
import type { StoreLocation } from "@/types";

export function getInvoicePaymentNoteKey(
  paymentTerms: OrderPaymentTerms | null | undefined,
): string {
  switch (paymentTerms) {
    case "prepaid":
      return "paymentNotePrepaid";
    case "due_on_receipt":
      return "paymentNoteDueOnReceipt";
    case "net_60":
      return "paymentNoteNet60";
    case "net_90":
      return "paymentNoteNet90";
    case "deposit_required":
      return "paymentNoteDeposit";
    default:
      return "paymentNoteNet30";
  }
}

export function resolveInvoiceCompanyInfo(
  contactDefaults: InvoiceContactDefaults,
  invoiceCreatorStore?: StoreLocation | null,
): InvoiceCompanyInfo {
  if (invoiceCreatorStore) {
    return {
      name: invoiceCreatorStore.name,
      lines: invoiceCreatorStore.address.split(",").filter(Boolean) as string[],
      phone: invoiceCreatorStore.phone?.trim() || contactDefaults.phone,
      email: invoiceCreatorStore.email?.trim() || contactDefaults.email,
    };
  }

  return {
    name: INVOICE_COMPANY.name,
    lines: [INVOICE_COMPANY.address, INVOICE_COMPANY.locality],
    phone: contactDefaults.phone,
    email: contactDefaults.email,
  };
}

export function resolveInvoiceBillingBlock(order: TrackedOrder): InvoiceAddressBlock {
  const name =
    order.b2b.billingAddress?.legal_name?.trim() ||
    order.customer_name.trim() ||
    "—";

  const structured = order.b2b.billingAddress;
  if (structured) {
    const lines = [
      structured.street_1,
      structured.street_2,
      [structured.city, structured.state, structured.postal_code]
        .filter(Boolean)
        .join(" "),
      structured.country,
    ].filter((line): line is string => Boolean(line?.trim()));

    if (lines.length > 0) {
      return { name, lines };
    }
  }

  const flatLines = [
    order.address.billing_address,
    [
      order.address.billing_city,
      order.address.billing_state,
      order.address.billing_postal_code,
      order.address.billing_country,
    ]
      .filter(Boolean)
      .join(" "),
  ].filter((line) => line.trim());

  return { name, lines: flatLines.length > 0 ? flatLines : ["—"] };
}

export function resolveInvoiceShippingBlock(
  order: TrackedOrder,
  pickupStore?: StoreLocation | null,
  isPickup?: boolean,
): InvoiceAddressBlock {
  if (isPickup && pickupStore) {
    return {
      name:
        order.b2b.shippingAddress?.dba_name?.trim() ||
        order.customer_name.trim() ||
        pickupStore.name,
      lines: pickupStore.address.split(",").filter(Boolean) as string[],
    };
  }

  const name =
    order.b2b.shippingAddress?.dba_name?.trim() ||
    order.customer_name.trim() ||
    "—";

  const structured = order.b2b.shippingAddress;
  if (structured) {
    const lines = [
      structured.street_1,
      structured.street_2,
      [structured.city, structured.state, structured.postal_code]
        .filter(Boolean)
        .join(" "),
      structured.country,
    ].filter((line): line is string => Boolean(line?.trim()));

    if (lines.length > 0) {
      return { name, lines };
    }
  }

  const flatLines = [
    order.address.shipping_address,
    [
      order.address.shipping_city,
      order.address.shipping_state,
      order.address.shipping_postal_code,
      order.address.shipping_country,
    ]
      .filter(Boolean)
      .join(" "),
  ].filter((line) => line.trim());

  return { name, lines: flatLines.length > 0 ? flatLines : ["—"] };
}

export type OrderInvoiceViewModel = {
  invoiceNumber: string;
  orderReference: string;
  issueDate: string;
  dueDate: string;
  company: InvoiceCompanyInfo;
  billing: InvoiceAddressBlock;
  shipping: InvoiceAddressBlock;
  hasCatchWeight: boolean;
  paymentNoteKey: string;
};

export type OrderInvoiceStoreContext = {
  pickupStore?: StoreLocation | null;
  invoiceCreatorStore?: StoreLocation | null;
  contactDefaults: InvoiceContactDefaults;
};

export function buildOrderInvoiceViewModel(
  order: TrackedOrder,
  stores: OrderInvoiceStoreContext,
): OrderInvoiceViewModel {
  const paymentTerms = order.b2b.billingAddress?.payment_terms;
  const isPickup = isPickupFulfillment(order);
  const { pickupStore = null, invoiceCreatorStore = null, contactDefaults } =
    stores;

  return {
    invoiceNumber:
      order.invoice_number?.trim() ||
      formatInvoiceNumber(order.id, order.created_at),
    orderReference: formatTrackedOrderId(order.id),
    issueDate: formatTrackedDateLong(order.created_at),
    dueDate: formatInvoiceDueDate(order.created_at, paymentTerms),
    company: resolveInvoiceCompanyInfo(contactDefaults, invoiceCreatorStore),
    billing: resolveInvoiceBillingBlock(order),
    shipping: resolveInvoiceShippingBlock(order, pickupStore, isPickup),
    hasCatchWeight: order.items.some((item) => item.is_catch_weight),
    paymentNoteKey: getInvoicePaymentNoteKey(paymentTerms),
  };
}
