import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { OrderAddressDbFields } from './salesOrderB2b';
import {
  SalesOrderFormField,
  SalesOrderFormSection,
  salesOrderFormGridClass,
} from './SalesOrderFormField';
import { SalesOrderPickupStoreSection } from './SalesOrderPickupStoreSection';
import { SalesOrderStateField } from './SalesOrderStateField';
import type { FulfillmentType } from './salesOrderShared';

type SalesOrderAddressEditorProps = {
  value: OrderAddressDbFields;
  onChange: (value: OrderAddressDbFields) => void;
  idPrefix: string;
  disabled?: boolean;
  readOnly?: boolean;
  fulfillmentMethod: FulfillmentType;
  requestedPickUpStoreId: number | null;
  onPickupStoreChange?: (storeId: number | null) => void;
};

export function SalesOrderAddressEditor({
  value,
  onChange,
  idPrefix,
  disabled = false,
  readOnly = false,
  fulfillmentMethod,
  requestedPickUpStoreId,
  onPickupStoreChange,
}: SalesOrderAddressEditorProps) {
  const isPickup = fulfillmentMethod === 'pick_up';

  const nullableFields: Array<keyof OrderAddressDbFields> = [
    'shipping_dba_name',
    'shipping_special_instructions',
    'shipping_preferred_window',
    'billing_legal_name',
    'billing_tax_id',
  ];

  const field = (
    name: keyof OrderAddressDbFields,
    label: string,
    options?: { multiline?: boolean; fullWidth?: boolean },
  ) => {
    const fieldId = `${idPrefix}-${name}`;
    const fieldValue = value[name] ?? '';

    return (
      <SalesOrderFormField
        key={name}
        label={label}
        htmlFor={fieldId}
        readOnly={readOnly}
        value={options?.multiline ? <span className="whitespace-pre-wrap">{fieldValue}</span> : fieldValue}
        className={options?.fullWidth ? 'md:col-span-2' : undefined}
        valueClassName={options?.multiline ? 'min-h-[4.5rem] whitespace-pre-wrap' : undefined}
      >
        {options?.multiline ? (
          <Textarea
            id={fieldId}
            rows={3}
            value={fieldValue}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                [name]: nullableFields.includes(name) ? event.target.value || null : event.target.value,
              })
            }
          />
        ) : (
          <Input
            id={fieldId}
            value={fieldValue}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                [name]: nullableFields.includes(name) ? event.target.value || null : event.target.value,
              })
            }
          />
        )}
      </SalesOrderFormField>
    );
  };

  const stateField = (name: 'shipping_state' | 'billing_state') => (
    <SalesOrderStateField
      key={name}
      id={`${idPrefix}-${name}`}
      value={value[name] ?? ''}
      disabled={disabled}
      readOnly={readOnly}
      onChange={(next) => onChange({ ...value, [name]: next })}
    />
  );

  return (
    <div className="space-y-6">
      {isPickup ? (
        <SalesOrderFormSection title="Pickup location">
          <SalesOrderPickupStoreSection
            storeId={requestedPickUpStoreId}
            onStoreChange={onPickupStoreChange}
            idPrefix={idPrefix}
            disabled={disabled}
            readOnly={readOnly}
            hideLabel
          />
        </SalesOrderFormSection>
      ) : (
        <SalesOrderFormSection title="Shipping address">
          <div className={salesOrderFormGridClass}>
            {field('shipping_dba_name', 'DBA / business name')}
            {field('shipping_address', 'Street address', { fullWidth: true })}
            {field('shipping_city', 'City')}
            {stateField('shipping_state')}
            {field('shipping_postal_code', 'Postal code')}
            {field('shipping_country', 'Country')}
            {field('shipping_preferred_window', 'Preferred delivery window')}
            {field('shipping_special_instructions', 'Delivery instructions', {
              multiline: true,
              fullWidth: true,
            })}
          </div>
        </SalesOrderFormSection>
      )}

      <SalesOrderFormSection title="Billing address">
        <div className={salesOrderFormGridClass}>
          {field('billing_legal_name', 'Legal name')}
          {field('billing_tax_id', 'Tax ID / ABN')}
          {field('billing_address', 'Street address', { fullWidth: true })}
          {field('billing_city', 'City')}
          {stateField('billing_state')}
          {field('billing_postal_code', 'Postal code')}
          {field('billing_country', 'Country')}
        </div>
      </SalesOrderFormSection>
    </div>
  );
}
