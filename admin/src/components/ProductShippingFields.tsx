import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductShippingInput } from '@/lib/product-shipping';

type ProductShippingFieldsProps = {
  idPrefix: string;
  value: ProductShippingInput;
  onChange: (next: ProductShippingInput) => void;
  disabled?: boolean;
};

export function ProductShippingFields({
  idPrefix,
  value,
  onChange,
  disabled = false,
}: ProductShippingFieldsProps) {
  const setField = <K extends keyof ProductShippingInput>(
    key: K,
    fieldValue: ProductShippingInput[K],
  ) => {
    onChange({ ...value, [key]: fieldValue });
  };

  return (
    <div className="md:col-span-2 grid gap-4 rounded-lg border p-4">
      <div>
        <h4 className="text-sm font-semibold">Shipping / freight</h4>
        <p className="text-xs text-muted-foreground">
          Per sellable unit dimensions used for courier freight quotes.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id={`${idPrefix}-shippable`}
          type="checkbox"
          checked={value.is_shippable}
          onChange={(e) => setField('is_shippable', e.target.checked)}
          disabled={disabled}
          className="h-4 w-4"
        />
        <Label htmlFor={`${idPrefix}-shippable`}>Shippable</Label>
      </div>

      {value.is_shippable ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-ship-weight`}>Weight (kg)</Label>
            <Input
              id={`${idPrefix}-ship-weight`}
              type="number"
              min="0"
              step="0.001"
              value={value.ship_weight_kg}
              onChange={(e) => setField('ship_weight_kg', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-ship-length`}>Length (cm)</Label>
            <Input
              id={`${idPrefix}-ship-length`}
              type="number"
              min="0"
              step="0.01"
              value={value.ship_length_cm}
              onChange={(e) => setField('ship_length_cm', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-ship-width`}>Width (cm)</Label>
            <Input
              id={`${idPrefix}-ship-width`}
              type="number"
              min="0"
              step="0.01"
              value={value.ship_width_cm}
              onChange={(e) => setField('ship_width_cm', e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-ship-height`}>Height (cm)</Label>
            <Input
              id={`${idPrefix}-ship-height`}
              type="number"
              min="0"
              step="0.01"
              value={value.ship_height_cm}
              onChange={(e) => setField('ship_height_cm', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
