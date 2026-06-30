import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { SalesOrderB2BForm } from './salesOrderB2b';
import { SalesOrderFormField, SalesOrderFormSection, salesOrderFormGridClass } from './SalesOrderFormField';
import { SalesOrderPickupStoreSection } from './SalesOrderPickupStoreSection';
import { SalesOrderStateField } from './SalesOrderStateField';
import type { FulfillmentType } from './salesOrderShared';

type SalesOrderB2BEditorProps = {
  b2b: SalesOrderB2BForm;
  onB2bChange: (b2b: SalesOrderB2BForm) => void;
  idPrefix: string;
  disabled?: boolean;
  readOnly?: boolean;
  fulfillmentMethod?: FulfillmentType;
  requestedPickUpStoreId?: number | null;
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
      className={cn(fullWidth && 'md:col-span-2')}
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
  fulfillmentMethod = 'delivery',
  requestedPickUpStoreId = null,
}: SalesOrderB2BEditorProps) {
  const fieldId = (name: string) => `${idPrefix}-b2b-${name}`;
  const isPickup = fulfillmentMethod === 'pick_up';

  const updateBuyer = (patch: Partial<SalesOrderB2BForm['buyer']>) => {
    onB2bChange(patchB2B(b2b, 'buyer', patch));
  };

  const updateShipping = (patch: Partial<SalesOrderB2BForm['shipping_address']>) => {
    onB2bChange(patchB2B(b2b, 'shipping_address', patch));
  };

  const updateBilling = (patch: Partial<SalesOrderB2BForm['billing_address']>) => {
    onB2bChange(patchB2B(b2b, 'billing_address', patch));
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <Label>B2B order data</Label>
        <p className="text-xs text-muted-foreground">
          Buyer and address fields for wholesale orders. Order totals are edited on
          the Order tab (subtotal, tax, shipping fee, grand total).
        </p>
      </div>

      <SalesOrderFormSection title="Buyer" accent="rose">
        <div className={salesOrderFormGridClass}>
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
        </div>
      </SalesOrderFormSection>

      {isPickup ? (
        <SalesOrderFormSection title="Pickup location" accent="sky">
          <SalesOrderPickupStoreSection
            storeId={requestedPickUpStoreId}
            idPrefix={`${idPrefix}-b2b`}
            disabled={disabled}
            readOnly
            hideLabel
          />
        </SalesOrderFormSection>
      ) : (
        <SalesOrderFormSection title="Shipping address" accent="sky">
          <div className={salesOrderFormGridClass}>
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
          <SalesOrderStateField
            id={fieldId('shipping-state')}
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
          </div>
        </SalesOrderFormSection>
      )}

      <SalesOrderFormSection title="Billing address" accent="amber">
        <div className={salesOrderFormGridClass}>
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
        <SalesOrderStateField
          id={fieldId('billing-state')}
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
        </div>
      </SalesOrderFormSection>
    </div>
  );
}
