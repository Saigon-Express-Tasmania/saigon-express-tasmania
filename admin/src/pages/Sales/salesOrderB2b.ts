import type { OrderType } from './orderType';

export type SalesOrderB2BBuyerForm = {
  name: string;
  role: string;
  contact_phone: string;
  contact_email: string;
};

export type SalesOrderB2BShippingForm = {
  dba_name: string;
  street_1: string;
  street_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  special_instructions: string;
  preferred_window: string;
};

export type SalesOrderB2BBillingForm = {
  legal_name: string;
  street_1: string;
  street_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  tax_id: string;
  payment_terms: string;
};

export type SalesOrderB2BFinancialForm = {
  subtotal_ex_gst: string;
  gst_total: string;
  grand_total_inc_gst: string;
  currency: string;
};

export type SalesOrderB2BForm = {
  buyer: SalesOrderB2BBuyerForm;
  shipping_address: SalesOrderB2BShippingForm;
  billing_address: SalesOrderB2BBillingForm;
  financial_details: SalesOrderB2BFinancialForm;
};

function str(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function nullableTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function parseObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function emptyB2BForm(): SalesOrderB2BForm {
  return {
    buyer: {
      name: '',
      role: '',
      contact_phone: '',
      contact_email: '',
    },
    shipping_address: {
      dba_name: '',
      street_1: '',
      street_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      special_instructions: '',
      preferred_window: '',
    },
    billing_address: {
      legal_name: '',
      street_1: '',
      street_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      tax_id: '',
      payment_terms: '',
    },
    financial_details: {
      subtotal_ex_gst: '',
      gst_total: '',
      grand_total_inc_gst: '',
      currency: 'AUD',
    },
  };
}

export function parseB2BFormFromRow(row: {
  buyer?: unknown;
  shipping_address?: unknown;
  billing_address?: unknown;
  financial_details?: unknown;
}): SalesOrderB2BForm {
  const buyer = parseObject(row.buyer);
  const shipping = parseObject(row.shipping_address);
  const billing = parseObject(row.billing_address);
  const financials = parseObject(row.financial_details);

  return {
    buyer: {
      name: str(buyer.name),
      role: str(buyer.role),
      contact_phone: str(buyer.contact_phone),
      contact_email: str(buyer.contact_email),
    },
    shipping_address: {
      dba_name: str(shipping.dba_name),
      street_1: str(shipping.street_1),
      street_2: str(shipping.street_2),
      city: str(shipping.city),
      state: str(shipping.state),
      postal_code: str(shipping.postal_code),
      country: str(shipping.country),
      special_instructions: str(shipping.special_instructions),
      preferred_window: str(shipping.preferred_window),
    },
    billing_address: {
      legal_name: str(billing.legal_name),
      street_1: str(billing.street_1),
      street_2: str(billing.street_2),
      city: str(billing.city),
      state: str(billing.state),
      postal_code: str(billing.postal_code),
      country: str(billing.country),
      tax_id: str(billing.tax_id),
      payment_terms: str(billing.payment_terms),
    },
    financial_details: {
      subtotal_ex_gst: str(financials.subtotal_ex_gst),
      gst_total: str(financials.gst_total),
      grand_total_inc_gst: str(financials.grand_total_inc_gst),
      currency: str(financials.currency) || 'AUD',
    },
  };
}

function hasText(values: string[]): boolean {
  return values.some((value) => value.trim().length > 0);
}

function parseFinancialField(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function serializeB2BForDb(
  form: SalesOrderB2BForm,
  orderType: OrderType,
): {
  buyer: Record<string, unknown> | null;
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  financial_details: Record<string, unknown> | null;
} {
  if (orderType !== 'wholesale') {
    return {
      buyer: null,
      shipping_address: null,
      billing_address: null,
      financial_details: null,
    };
  }

  const buyer =
    hasText([
      form.buyer.name,
      form.buyer.role,
      form.buyer.contact_phone,
      form.buyer.contact_email,
    ])
      ? {
          name: form.buyer.name.trim(),
          role: nullableTrimmed(form.buyer.role),
          contact_phone: form.buyer.contact_phone.trim(),
          contact_email: nullableTrimmed(form.buyer.contact_email),
        }
      : null;

  const shipping_address = hasText([
    form.shipping_address.dba_name,
    form.shipping_address.street_1,
    form.shipping_address.street_2,
    form.shipping_address.city,
    form.shipping_address.state,
    form.shipping_address.postal_code,
    form.shipping_address.country,
    form.shipping_address.special_instructions,
    form.shipping_address.preferred_window,
  ])
    ? {
        dba_name: form.shipping_address.dba_name.trim(),
        street_1: form.shipping_address.street_1.trim(),
        street_2: nullableTrimmed(form.shipping_address.street_2),
        city: form.shipping_address.city.trim(),
        state: nullableTrimmed(form.shipping_address.state),
        postal_code: form.shipping_address.postal_code.trim(),
        country: nullableTrimmed(form.shipping_address.country),
        special_instructions: nullableTrimmed(
          form.shipping_address.special_instructions,
        ),
        preferred_window: nullableTrimmed(form.shipping_address.preferred_window),
      }
    : null;

  const billing_address = hasText([
    form.billing_address.legal_name,
    form.billing_address.street_1,
    form.billing_address.street_2,
    form.billing_address.city,
    form.billing_address.state,
    form.billing_address.postal_code,
    form.billing_address.country,
    form.billing_address.tax_id,
    form.billing_address.payment_terms,
  ])
    ? {
        legal_name: form.billing_address.legal_name.trim(),
        street_1: form.billing_address.street_1.trim(),
        street_2: nullableTrimmed(form.billing_address.street_2),
        city: form.billing_address.city.trim(),
        state: nullableTrimmed(form.billing_address.state),
        postal_code: form.billing_address.postal_code.trim(),
        country: nullableTrimmed(form.billing_address.country),
        tax_id: nullableTrimmed(form.billing_address.tax_id),
        payment_terms: nullableTrimmed(form.billing_address.payment_terms),
      }
    : null;

  const subtotal = parseFinancialField(form.financial_details.subtotal_ex_gst);
  const gst = parseFinancialField(form.financial_details.gst_total);
  const grand = parseFinancialField(form.financial_details.grand_total_inc_gst);
  const currency = nullableTrimmed(form.financial_details.currency) ?? 'AUD';

  const financial_details =
    subtotal != null || gst != null || grand != null
      ? {
          subtotal_ex_gst: subtotal ?? 0,
          gst_total: gst ?? 0,
          grand_total_inc_gst: grand ?? 0,
          currency,
        }
      : null;

  return {
    buyer,
    shipping_address,
    billing_address,
    financial_details,
  };
}
