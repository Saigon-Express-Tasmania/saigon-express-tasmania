import { SalesOrderFormField } from './SalesOrderFormField';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  formatSalesOrderStoreLocation,
  useSalesOrderStoreLocations,
} from './salesOrderStores';
import { formatStoreHours } from '@/lib/store-hours';

type SalesOrderPickupStoreSectionProps = {
  storeId: number | null;
  onStoreChange?: (storeId: number | null) => void;
  idPrefix: string;
  disabled?: boolean;
  readOnly?: boolean;
  hideLabel?: boolean;
};

export function SalesOrderPickupStoreSection({
  storeId,
  onStoreChange,
  idPrefix,
  disabled = false,
  readOnly = false,
  hideLabel = false,
}: SalesOrderPickupStoreSectionProps) {
  const { stores, loading, error } = useSalesOrderStoreLocations();
  const selectedStore =
    storeId != null ? stores.find((store) => store.id === storeId) ?? null : null;
  const selectedStoreHours = formatStoreHours(selectedStore?.hours ?? null);
  const fieldId = `${idPrefix}-pickup-store`;

  const selectedStoreSummary = loading ? (
    <p className="text-sm text-muted-foreground">Loading store…</p>
  ) : selectedStore ? (
    <div className="space-y-1">
      <p className="font-medium text-foreground">{selectedStore.name}</p>
      <p>
        {selectedStore.address}
        {selectedStore.suburb ? `, ${selectedStore.suburb}` : ''}
      </p>
      {selectedStore.phone ? <p>{selectedStore.phone}</p> : null}
      {selectedStoreHours ? <p className="text-xs">{selectedStoreHours}</p> : null}
    </div>
  ) : storeId != null ? (
    <p>Store #{storeId}</p>
  ) : (
    '—'
  );

  if (readOnly) {
    return (
      <SalesOrderFormField
        label={hideLabel ? undefined : 'Pickup location'}
        readOnly
        value={selectedStoreSummary}
      />
    );
  }

  return (
    <SalesOrderFormField
      label={hideLabel ? undefined : 'Pickup location'}
      htmlFor={fieldId}
    >
      {loading ? (
        <div className="flex min-h-9 items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading stores…
        </div>
      ) : error ? (
        <p className="min-h-9 text-sm text-destructive">{error}</p>
      ) : (
        <Select
          value={storeId != null ? String(storeId) : ''}
          disabled={disabled}
          onValueChange={(value) => onStoreChange?.(value ? Number(value) : null)}
        >
          <SelectTrigger id={fieldId}>
            <SelectValue placeholder="Select pickup store" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((store) => (
              <SelectItem key={store.id} value={String(store.id)}>
                {formatSalesOrderStoreLocation(store)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {selectedStore && !loading ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {selectedStore.address}
          {selectedStore.suburb ? `, ${selectedStore.suburb}` : ''}
          {selectedStoreHours ? ` · ${selectedStoreHours}` : ''}
        </p>
      ) : null}
    </SalesOrderFormField>
  );
}
