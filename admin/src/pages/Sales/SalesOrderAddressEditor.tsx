import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OrderAddressDbFields } from './salesOrderB2b';

type SalesOrderAddressEditorProps = {
  value: OrderAddressDbFields;
  onChange: (value: OrderAddressDbFields) => void;
  idPrefix: string;
  disabled?: boolean;
  readOnly?: boolean;
};

function AddressField({
  id,
  label,
  value,
  onChange,
  disabled,
  readOnly,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <div className="grid gap-2">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{value || '—'}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function SalesOrderAddressEditor({
  value,
  onChange,
  idPrefix,
  disabled = false,
  readOnly = false,
}: SalesOrderAddressEditorProps) {
  const field = (name: keyof OrderAddressDbFields, label: string) => {
    const id = `${idPrefix}-${name}`;
    return (
      <AddressField
        key={name}
        id={id}
        label={label}
        value={value[name]}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(next) => onChange({ ...value, [name]: next })}
      />
    );
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 text-sm font-medium">Shipping address</div>
        {field('shipping_address', 'Street address')}
        {field('shipping_city', 'City')}
        {field('shipping_state', 'State')}
        {field('shipping_postal_code', 'Postal code')}
        {field('shipping_country', 'Country')}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 text-sm font-medium">Billing address</div>
        {field('billing_address', 'Street address')}
        {field('billing_city', 'City')}
        {field('billing_state', 'State')}
        {field('billing_postal_code', 'Postal code')}
        {field('billing_country', 'Country')}
      </div>
    </div>
  );
}
