import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import type { SalesOrderB2BForm } from './salesOrderB2b';
import { SalesOrderFormField } from './SalesOrderFormField';

type SalesOrderB2BEditorProps = {
  b2b: SalesOrderB2BForm;
  onB2bChange: (b2b: SalesOrderB2BForm) => void;
  idPrefix: string;
  disabled?: boolean;
  readOnly?: boolean;
};

type B2BSectionProps = {
  title: string;
  children: ReactNode;
};

type B2BFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  type?: 'text' | 'email' | 'number';
  fullWidth?: boolean;
  multiline?: boolean;
};

function B2BSection({ title, children }: B2BSectionProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function B2BField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  type = 'text',
  fullWidth = false,
  multiline = false,
}: B2BFieldProps) {
  const displayValue =
    type === 'number' && value.trim() !== '' && Number.isFinite(Number(value))
      ? Number(value).toFixed(2)
      : value;

  return (
    <SalesOrderFormField
      label={label}
      htmlFor={id}
      readOnly={readOnly}
      value={multiline ? <span className="whitespace-pre-wrap">{displayValue}</span> : displayValue}
      className={cn(fullWidth && 'sm:col-span-2')}
      valueClassName={multiline ? undefined : type === 'number' ? 'tabular-nums' : undefined}
    >
      {multiline ? (
        <Textarea
          id={id}
          rows={3}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          min={type === 'number' ? '0' : undefined}
          step={type === 'number' ? '0.01' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </SalesOrderFormField>
  );
}

function patchB2B<K extends keyof SalesOrderB2BForm>(
  b2b: SalesOrderB2BForm,
  section: K,
  patch: Partial<SalesOrderB2BForm[K]>,
): SalesOrderB2BForm {
  return {
    ...b2b,
    [section]: { ...b2b[section], ...patch },
  };
}

export function SalesOrderB2BEditor({
  b2b,
  onB2bChange,
  idPrefix,
  disabled = false,
  readOnly = false,
}: SalesOrderB2BEditorProps) {
  const fieldId = (name: string) => `${idPrefix}-b2b-${name}`;

  const updateBuyer = (patch: Partial<SalesOrderB2BForm['buyer']>) => {
    onB2bChange(patchB2B(b2b, 'buyer', patch));
  };

  const updateShipping = (patch: Partial<SalesOrderB2BForm['shipping_address']>) => {
    onB2bChange(patchB2B(b2b, 'shipping_address', patch));
  };

  const updateBilling = (patch: Partial<SalesOrderB2BForm['billing_address']>) => {
    onB2bChange(patchB2B(b2b, 'billing_address', patch));
  };

  const updateFinancials = (patch: Partial<SalesOrderB2BForm['financial_details']>) => {
    onB2bChange(patchB2B(b2b, 'financial_details', patch));
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <Label>B2B order data</Label>
        <p className="text-xs text-muted-foreground">
          Wholesale checkout fields stored as JSON on the order.
        </p>
      </div>

      <B2BSection title="Buyer">
        <B2BField
          id={fieldId('buyer-name')}
          label="Name"
          value={b2b.buyer.name}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBuyer({ name: value })}
        />
        <B2BField
          id={fieldId('buyer-role')}
          label="Role"
          value={b2b.buyer.role}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBuyer({ role: value })}
        />
        <B2BField
          id={fieldId('buyer-contact-phone')}
          label="Contact phone"
          value={b2b.buyer.contact_phone}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBuyer({ contact_phone: value })}
        />
        <B2BField
          id={fieldId('buyer-contact-email')}
          label="Contact email"
          type="email"
          value={b2b.buyer.contact_email}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBuyer({ contact_email: value })}
        />
      </B2BSection>

      <B2BSection title="Shipping address">
        <B2BField
          id={fieldId('shipping-dba-name')}
          label="DBA name"
          value={b2b.shipping_address.dba_name}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateShipping({ dba_name: value })}
        />
        <B2BField
          id={fieldId('shipping-preferred-window')}
          label="Preferred window"
          value={b2b.shipping_address.preferred_window}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateShipping({ preferred_window: value })}
        />
        <B2BField
          id={fieldId('shipping-street-1')}
          label="Street 1"
          value={b2b.shipping_address.street_1}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateShipping({ street_1: value })}
        />
        <B2BField
          id={fieldId('shipping-street-2')}
          label="Street 2"
          value={b2b.shipping_address.street_2}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateShipping({ street_2: value })}
        />
        <B2BField
          id={fieldId('shipping-city')}
          label="City"
          value={b2b.shipping_address.city}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateShipping({ city: value })}
        />
        <B2BField
          id={fieldId('shipping-state')}
          label="State"
          value={b2b.shipping_address.state}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateShipping({ state: value })}
        />
        <B2BField
          id={fieldId('shipping-postal-code')}
          label="Postal code"
          value={b2b.shipping_address.postal_code}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateShipping({ postal_code: value })}
        />
        <B2BField
          id={fieldId('shipping-country')}
          label="Country"
          value={b2b.shipping_address.country}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateShipping({ country: value })}
        />
        <B2BField
          id={fieldId('shipping-special-instructions')}
          label="Special instructions"
          value={b2b.shipping_address.special_instructions}
          disabled={disabled}
          fullWidth
          multiline
          onChange={(value) => updateShipping({ special_instructions: value })}
        />
      </B2BSection>

      <B2BSection title="Billing address">
        <B2BField
          id={fieldId('billing-legal-name')}
          label="Legal name"
          value={b2b.billing_address.legal_name}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBilling({ legal_name: value })}
        />
        <B2BField
          id={fieldId('billing-tax-id')}
          label="Tax ID"
          value={b2b.billing_address.tax_id}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBilling({ tax_id: value })}
        />
        <B2BField
          id={fieldId('billing-street-1')}
          label="Street 1"
          value={b2b.billing_address.street_1}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBilling({ street_1: value })}
        />
        <B2BField
          id={fieldId('billing-street-2')}
          label="Street 2"
          value={b2b.billing_address.street_2}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBilling({ street_2: value })}
        />
        <B2BField
          id={fieldId('billing-city')}
          label="City"
          value={b2b.billing_address.city}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBilling({ city: value })}
        />
        <B2BField
          id={fieldId('billing-state')}
          label="State"
          value={b2b.billing_address.state}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBilling({ state: value })}
        />
        <B2BField
          id={fieldId('billing-postal-code')}
          label="Postal code"
          value={b2b.billing_address.postal_code}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBilling({ postal_code: value })}
        />
        <B2BField
          id={fieldId('billing-country')}
          label="Country"
          value={b2b.billing_address.country}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateBilling({ country: value })}
        />
        <B2BField
          id={fieldId('billing-payment-terms')}
          label="Payment terms"
          value={b2b.billing_address.payment_terms}
          disabled={disabled}
          fullWidth
          onChange={(value) => updateBilling({ payment_terms: value })}
        />
      </B2BSection>

      <B2BSection title="Financial details">
        <B2BField
          id={fieldId('financial-subtotal-ex-gst')}
          label="Subtotal (ex GST)"
          type="number"
          value={b2b.financial_details.subtotal_ex_gst}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateFinancials({ subtotal_ex_gst: value })}
        />
        <B2BField
          id={fieldId('financial-gst-total')}
          label="GST total"
          type="number"
          value={b2b.financial_details.gst_total}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateFinancials({ gst_total: value })}
        />
        <B2BField
          id={fieldId('financial-grand-total-inc-gst')}
          label="Grand total (inc GST)"
          type="number"
          value={b2b.financial_details.grand_total_inc_gst}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateFinancials({ grand_total_inc_gst: value })}
        />
        <B2BField
          id={fieldId('financial-currency')}
          label="Currency"
          value={b2b.financial_details.currency}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(value) => updateFinancials({ currency: value })}
        />
      </B2BSection>
    </div>
  );
}
