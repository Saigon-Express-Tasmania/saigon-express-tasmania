import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import type { OrderType } from './orderType';
import { SalesOrderItemPicker } from './SalesOrderItemPicker';
import {
  getOrderItemIdColumnLabel,
  useSalesOrderCatalog,
} from './salesOrderCatalog';
import { emptyOrderItem, type SalesOrderItemForm } from './salesOrderShared';

type SalesOrderItemsEditorProps = {
  orderType: OrderType;
  items: SalesOrderItemForm[];
  onItemsChange: (items: SalesOrderItemForm[]) => void;
  idPrefix: string;
  disabled?: boolean;
};

function updateItem(
  items: SalesOrderItemForm[],
  index: number,
  patch: Partial<SalesOrderItemForm>,
): SalesOrderItemForm[] {
  return items.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

export function SalesOrderItemsEditor({
  orderType,
  items,
  onItemsChange,
  idPrefix,
  disabled = false,
}: SalesOrderItemsEditorProps) {
  const { options, loading, error } = useSalesOrderCatalog(orderType);
  const itemIdLabel = getOrderItemIdColumnLabel(orderType);

  const itemsTotal = items.reduce((sum, item) => {
    const qty = Number(item.qty);
    const unitPrice = Number(item.unit_price);
    if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return sum;
    return sum + qty * unitPrice;
  }, 0);

  return (
    <div className="grid gap-3 md:col-span-2">
      <div className="flex items-center justify-between gap-4">
        <Label>Line items</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onItemsChange([...items, emptyOrderItem()])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add line item
        </Button>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No line items yet. Add one to continue.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide w-36">
                  {itemIdLabel}
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                  Item name
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide w-24">
                  Qty
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide w-32">
                  Unit price
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide w-28">
                  Line total
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide w-16">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const qty = Number(item.qty);
                const unitPrice = Number(item.unit_price);
                const lineTotal =
                  Number.isFinite(qty) && Number.isFinite(unitPrice) ? qty * unitPrice : 0;

                return (
                  <tr key={`${idPrefix}-item-${index}`} className="border-b last:border-b-0">
                    <td className="px-3 py-2 align-top">
                      <div className="flex h-9 items-center font-mono text-sm text-muted-foreground">
                        {item.menu_item_id > 0 ? item.menu_item_id : '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <SalesOrderItemPicker
                        id={`${idPrefix}-item-${index}-name`}
                        options={options}
                        selectedId={item.menu_item_id}
                        selectedName={item.item_name}
                        disabled={disabled}
                        loading={loading}
                        onSelect={(option) =>
                          onItemsChange(
                            updateItem(items, index, {
                              menu_item_id: option.id,
                              item_name: option.name,
                              unit_price: option.unitPrice,
                            }),
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        id={`${idPrefix}-item-${index}-qty`}
                        type="number"
                        min="1"
                        value={item.qty}
                        disabled={disabled}
                        onChange={(e) =>
                          onItemsChange(
                            updateItem(items, index, {
                              qty: e.target.value ? Number(e.target.value) : 0,
                            }),
                          )
                        }
                        className="h-9"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        id={`${idPrefix}-item-${index}-price`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        disabled={disabled}
                        onChange={(e) =>
                          onItemsChange(
                            updateItem(items, index, {
                              unit_price: e.target.value ? Number(e.target.value) : 0,
                            }),
                          )
                        }
                        className="h-9"
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-right text-sm font-medium tabular-nums">
                      ${lineTotal.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        disabled={disabled}
                        onClick={() =>
                          onItemsChange(items.filter((_, itemIndex) => itemIndex !== index))
                        }
                        aria-label={`Remove line item ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30">
                <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold">
                  Items subtotal
                </td>
                <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums">
                  ${itemsTotal.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
