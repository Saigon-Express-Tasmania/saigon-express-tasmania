import { Label } from '@/components/ui/label';
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
};

export function SalesOrderPickupStoreSection({
  storeId,
  onStoreChange,
  idPrefix,
  disabled = false,
  readOnly = false,
}: SalesOrderPickupStoreSectionProps) {
  const { stores, loading, error } = useSalesOrderStoreLocations();
  const selectedStore =
    storeId != null ? stores.find((store) => store.id === storeId) ?? null : null;
  const selectedStoreHours = formatStoreHours(selectedStore?.hours ?? null);

  if (readOnly) {
    return (
      <div className="grid gap-2">
        <Label>Pickup location</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading store…</p>
        ) : selectedStore ? (
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{selectedStore.name}</p>
            <p className="mt-1">
              {selectedStore.address}
              {selectedStore.suburb ? `, ${selectedStore.suburb}` : ''}
            </p>
            {selectedStore.phone ? <p className="mt-1">{selectedStore.phone}</p> : null}
            {selectedStoreHours ? (
              <p className="mt-1 text-xs">{selectedStoreHours}</p>
            ) : null}
          </div>
        ) : storeId != null ? (
          <p className="text-sm text-muted-foreground">Store #{storeId}</p>
        ) : (
          <p className="text-sm text-muted-foreground">—</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={`${idPrefix}-pickup-store`}>Pickup location</Label>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading stores…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <Select
          value={storeId != null ? String(storeId) : ''}
          disabled={disabled}
          onValueChange={(value) =>
            onStoreChange?.(value ? Number(value) : null)
          }
        >
          <SelectTrigger id={`${idPrefix}-pickup-store`}>
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
        <p className="text-xs text-muted-foreground">
          {selectedStore.address}
          {selectedStore.suburb ? `, ${selectedStore.suburb}` : ''}
          {selectedStoreHours ? ` · ${selectedStoreHours}` : ''}
        </p>
      ) : null}
    </div>
  );
}
