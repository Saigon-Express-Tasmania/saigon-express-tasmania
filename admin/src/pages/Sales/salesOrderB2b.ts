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

export type OrderAddressDbFields = {
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: string;
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

function formatStreetLine(street1: string, street2: string): string {
  return [street1, street2].map((part) => part.trim()).filter(Boolean).join(', ');
}

export function defaultOrderAddressFields(): OrderAddressDbFields {
  return {
    shipping_address: 'N/A',
    shipping_city: 'N/A',
    shipping_state: 'N/A',
    shipping_postal_code: '0000',
    shipping_country: 'Australia',
    billing_address: 'N/A',
    billing_city: 'N/A',
    billing_state: 'N/A',
    billing_postal_code: '0000',
    billing_country: 'Australia',
  };
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
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  payment_terms?: string | null;
  shipping_address?: unknown;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  billing_address?: unknown;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
  financial_details?: unknown;
}): SalesOrderB2BForm {
  const financials = parseObject(row.financial_details);
  const hasFlatColumns =
    row.shipping_city != null ||
    row.billing_city != null ||
    row.shipping_postal_code != null ||
    row.billing_postal_code != null;

  if (hasFlatColumns) {
    return {
      buyer: {
        name: str(row.customer_name),
        role: '',
        contact_phone: str(row.customer_phone),
        contact_email: str(row.customer_email),
      },
      shipping_address: {
        dba_name: str(financials.shipping_dba_name) || str(row.customer_name),
        street_1: str(row.shipping_address),
        street_2: str(financials.shipping_street_2),
        city: str(row.shipping_city),
        state: str(row.shipping_state),
        postal_code: str(row.shipping_postal_code),
        country: str(row.shipping_country),
        special_instructions: str(financials.shipping_special_instructions),
        preferred_window: str(financials.shipping_preferred_window),
      },
      billing_address: {
        legal_name: str(financials.billing_legal_name) || str(row.customer_name),
        street_1: str(row.billing_address),
        street_2: str(financials.billing_street_2),
        city: str(row.billing_city),
        state: str(row.billing_state),
        postal_code: str(row.billing_postal_code),
        country: str(row.billing_country),
        tax_id: str(financials.billing_tax_id),
        payment_terms: str(row.payment_terms),
      },
      financial_details: {
        subtotal_ex_gst: str(financials.subtotal_ex_gst),
        gst_total: str(financials.gst_total),
        grand_total_inc_gst: str(financials.grand_total_inc_gst),
        currency: str(financials.currency) || 'AUD',
      },
    };
  }

  const shipping = parseObject(row.shipping_address);
  const billing = parseObject(row.billing_address);

  return {
    buyer: {
      name: str(row.customer_name),
      role: '',
      contact_phone: str(row.customer_phone),
      contact_email: str(row.customer_email),
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
): OrderAddressDbFields & {
  financial_details: Record<string, unknown> | null;
} {
  if (orderType !== 'wholesale') {
    return {
      ...defaultOrderAddressFields(),
      financial_details: null,
    };
  }

  const shippingHasData = hasText([
    form.shipping_address.dba_name,
    form.shipping_address.street_1,
    form.shipping_address.street_2,
    form.shipping_address.city,
    form.shipping_address.state,
    form.shipping_address.postal_code,
    form.shipping_address.country,
    form.shipping_address.special_instructions,
    form.shipping_address.preferred_window,
  ]);

  const billingHasData = hasText([
    form.billing_address.legal_name,
    form.billing_address.street_1,
    form.billing_address.street_2,
    form.billing_address.city,
    form.billing_address.state,
    form.billing_address.postal_code,
    form.billing_address.country,
    form.billing_address.tax_id,
    form.billing_address.payment_terms,
  ]);

  const addressFields: OrderAddressDbFields = shippingHasData || billingHasData
    ? {
        shipping_address: shippingHasData
          ? formatStreetLine(
              form.shipping_address.street_1,
              form.shipping_address.street_2,
            ) || 'N/A'
          : 'N/A',
        shipping_city: form.shipping_address.city.trim() || 'N/A',
        shipping_state: form.shipping_address.state.trim() || 'N/A',
        shipping_postal_code: form.shipping_address.postal_code.trim() || '0000',
        shipping_country: form.shipping_address.country.trim() || 'Australia',
        billing_address: billingHasData
          ? formatStreetLine(
              form.billing_address.street_1,
              form.billing_address.street_2,
            ) || 'N/A'
          : 'N/A',
        billing_city: form.billing_address.city.trim() || 'N/A',
        billing_state: form.billing_address.state.trim() || 'N/A',
        billing_postal_code: form.billing_address.postal_code.trim() || '0000',
        billing_country: form.billing_address.country.trim() || 'Australia',
      }
    : defaultOrderAddressFields();

  const subtotal = parseFinancialField(form.financial_details.subtotal_ex_gst);
  const gst = parseFinancialField(form.financial_details.gst_total);
  const grand = parseFinancialField(form.financial_details.grand_total_inc_gst);
  const currency = nullableTrimmed(form.financial_details.currency) ?? 'AUD';

  const financialPayload: Record<string, unknown> = {};
  if (subtotal != null) financialPayload.subtotal_ex_gst = subtotal;
  if (gst != null) financialPayload.gst_total = gst;
  if (grand != null) financialPayload.grand_total_inc_gst = grand;
  financialPayload.currency = currency;

  if (form.shipping_address.dba_name.trim()) {
    financialPayload.shipping_dba_name = form.shipping_address.dba_name.trim();
  }
  if (form.shipping_address.street_2.trim()) {
    financialPayload.shipping_street_2 = form.shipping_address.street_2.trim();
  }
  if (form.shipping_address.special_instructions.trim()) {
    financialPayload.shipping_special_instructions =
      form.shipping_address.special_instructions.trim();
  }
  if (form.shipping_address.preferred_window.trim()) {
    financialPayload.shipping_preferred_window =
      form.shipping_address.preferred_window.trim();
  }
  if (form.billing_address.legal_name.trim()) {
    financialPayload.billing_legal_name = form.billing_address.legal_name.trim();
  }
  if (form.billing_address.street_2.trim()) {
    financialPayload.billing_street_2 = form.billing_address.street_2.trim();
  }
  if (form.billing_address.tax_id.trim()) {
    financialPayload.billing_tax_id = form.billing_address.tax_id.trim();
  }

  return {
    ...addressFields,
    financial_details: Object.keys(financialPayload).length > 0 ? financialPayload : null,
  };
}
