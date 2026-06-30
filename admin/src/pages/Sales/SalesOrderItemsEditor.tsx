import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProductCustomizationsCatalog } from '@/hooks/useProductCustomizationsCatalog';
import { ImageIcon, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import type { OrderType } from './orderType';
import { SalesOrderItemCustomisationSummary } from './SalesOrderItemCustomisationSummary';
import { SalesOrderItemPicker } from './SalesOrderItemPicker';
import {
  getOrderItemIdColumnLabel,
  useSalesOrderCatalog,
} from './salesOrderCatalog';
import {
  emptyOrderItem,
  ITEM_UOM_OPTIONS,
  type ItemUom,
  type SalesOrderItemForm,
} from './salesOrderShared';

type SalesOrderItemsEditorProps = {
  orderType: OrderType;
  items: SalesOrderItemForm[];
  onItemsChange: (items: SalesOrderItemForm[]) => void;
  idPrefix: string;
  disabled?: boolean;
  readOnly?: boolean;
  showHeader?: boolean;
  compact?: boolean;
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
  readOnly = false,
  showHeader = true,
  compact = false,
}: SalesOrderItemsEditorProps) {
  const { options, loading, error } = useSalesOrderCatalog(orderType);
  const { catalog: customizationsCatalog } = useProductCustomizationsCatalog();
  const itemIdLabel = getOrderItemIdColumnLabel(orderType);
  const fieldsDisabled = disabled || readOnly;
  const cellClass = compact ? 'px-2 py-1.5' : 'px-3 py-2';
  const imageSizeClass = compact ? 'size-10' : 'size-12';
  const iconSizeClass = compact ? 'size-4' : 'size-5';
  const inputClass = compact ? 'h-8 text-xs' : 'h-9';
  const imageByProductId = useMemo(() => {
    const map = new Map<number, string>();
    for (const option of options) {
      if (option.imageUrl) map.set(option.id, option.imageUrl);
    }
    return map;
  }, [options]);

  const itemsTotal = items.reduce((sum, item) => {
    const qty = Number(item.qty);
    const unitPrice = Number(item.unit_price);
    if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return sum;
    return sum + qty * unitPrice;
  }, 0);

  return (
    <div className="grid w-full min-w-0 gap-3">
      {showHeader ? (
        <div className="flex items-center justify-between gap-4">
          <Label>Line items</Label>
          {!readOnly ? (
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
          ) : null}
        </div>
      ) : !readOnly ? (
        <div className="flex justify-end">
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
      ) : null}

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No line items yet.{readOnly ? '' : ' Add one to continue.'}
        </p>
      ) : (
        <div className="min-w-0 rounded-md border">
          <table className="w-full table-fixed">
            <colgroup>
              <col className={compact ? 'w-11' : 'w-14'} />
              <col className="w-[4.5rem]" />
              <col className="w-[5.5rem]" />
              <col />
              <col className="w-14" />
              <col className="w-16" />
              <col className="w-[5.25rem]" />
              <col className="w-[5.25rem]" />
              {!readOnly ? <col className="w-11" /> : null}
            </colgroup>
            <thead>
              <tr className="border-b bg-muted/50">
                <th className={`${cellClass} text-left text-xs font-semibold uppercase tracking-wide`}>
                  <span className="sr-only">Image</span>
                </th>
                <th className={`${cellClass} text-left text-xs font-semibold uppercase tracking-wide`}>
                  {itemIdLabel}
                </th>
                <th className={`${cellClass} text-left text-xs font-semibold uppercase tracking-wide`}>
                  SKU
                </th>
                <th className={`${cellClass} text-left text-xs font-semibold uppercase tracking-wide`}>
                  Item name
                </th>
                <th className={`${cellClass} text-left text-xs font-semibold uppercase tracking-wide`}>
                  UOM
                </th>
                <th className={`${cellClass} text-left text-xs font-semibold uppercase tracking-wide`}>
                  Qty
                </th>
                <th className={`${cellClass} text-left text-xs font-semibold uppercase tracking-wide`}>
                  Unit price
                </th>
                <th className={`${cellClass} text-right text-xs font-semibold uppercase tracking-wide`}>
                  Line total
                </th>
                {!readOnly ? (
                  <th className={`${cellClass} text-right text-xs font-semibold uppercase tracking-wide`}>
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const qty = Number(item.qty);
                const unitPrice = Number(item.unit_price);
                const lineTotal =
                  Number.isFinite(qty) && Number.isFinite(unitPrice) ? qty * unitPrice : 0;
                const imageUrl =
                  item.menu_item_id > 0 ? imageByProductId.get(item.menu_item_id) : undefined;

                return (
                  <tr key={`${idPrefix}-item-${index}`} className="border-b last:border-b-0">
                    <td className={`${cellClass} align-top`}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className={`${imageSizeClass} shrink-0 rounded border object-cover bg-muted`}
                        />
                      ) : (
                        <div
                          className={`flex ${imageSizeClass} shrink-0 items-center justify-center rounded border bg-muted text-muted-foreground`}
                          aria-hidden
                        >
                          <ImageIcon className={iconSizeClass} />
                        </div>
                      )}
                    </td>
                    <td className={`${cellClass} align-top font-mono text-xs text-muted-foreground`}>
                      {item.menu_item_id > 0 ? item.menu_item_id : '—'}
                    </td>
                    <td className={`${cellClass} align-top text-sm`}>
                      {readOnly ? (
                        <span className="block truncate" title={item.sku || undefined}>
                          {item.sku || '—'}
                        </span>
                      ) : (
                        <Input
                          id={`${idPrefix}-item-${index}-sku`}
                          value={item.sku}
                          disabled={fieldsDisabled}
                          onChange={(e) =>
                            onItemsChange(
                              updateItem(items, index, { sku: e.target.value }),
                            )
                          }
                          className={`${inputClass} font-mono text-xs`}
                        />
                      )}
                    </td>
                    <td className={`${cellClass} min-w-0 align-top text-sm`}>
                      {readOnly ? (
                        <div className="min-w-0">
                          <span className="block truncate" title={item.item_name || undefined}>
                            {item.item_name || '—'}
                          </span>
                          {item.customisation ? (
                            <SalesOrderItemCustomisationSummary
                              customisation={item.customisation}
                              catalog={customizationsCatalog}
                            />
                          ) : null}
                        </div>
                      ) : (
                        <div className="min-w-0 space-y-1">
                          <SalesOrderItemPicker
                            id={`${idPrefix}-item-${index}-name`}
                            options={options}
                            selectedId={item.menu_item_id}
                            selectedName={item.item_name}
                            disabled={fieldsDisabled}
                            loading={loading}
                            onSelect={(option) =>
                              onItemsChange(
                                updateItem(items, index, {
                                  menu_item_id: option.id,
                                  item_name: option.name,
                                  unit_price: option.unitPrice,
                                  sku: item.sku || String(option.id),
                                }),
                              )
                            }
                          />
                          {item.customisation ? (
                            <SalesOrderItemCustomisationSummary
                              customisation={item.customisation}
                              catalog={customizationsCatalog}
                            />
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className={`${cellClass} align-top text-sm`}>
                      {readOnly ? (
                        item.uom
                      ) : (
                        <Select
                          value={item.uom}
                          disabled={fieldsDisabled}
                          onValueChange={(value) =>
                            onItemsChange(
                              updateItem(items, index, { uom: value as ItemUom }),
                            )
                          }
                        >
                          <SelectTrigger className={`${inputClass} w-full min-w-0`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ITEM_UOM_OPTIONS.map((uom) => (
                              <SelectItem key={uom} value={uom}>
                                {uom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className={`${cellClass} align-top text-sm tabular-nums`}>
                      {readOnly ? (
                        qty
                      ) : (
                        <Input
                          id={`${idPrefix}-item-${index}-qty`}
                          type="number"
                          min="1"
                          value={item.qty}
                          disabled={fieldsDisabled}
                          onChange={(e) =>
                            onItemsChange(
                              updateItem(items, index, {
                                qty: e.target.value ? Number(e.target.value) : 0,
                              }),
                            )
                          }
                          className={inputClass}
                        />
                      )}
                    </td>
                    <td className={`${cellClass} align-top text-sm tabular-nums`}>
                      {readOnly ? (
                        `$${unitPrice.toFixed(2)}`
                      ) : (
                        <Input
                          id={`${idPrefix}-item-${index}-price`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          disabled={fieldsDisabled}
                          onChange={(e) =>
                            onItemsChange(
                              updateItem(items, index, {
                                unit_price: e.target.value ? Number(e.target.value) : 0,
                              }),
                            )
                          }
                          className={inputClass}
                        />
                      )}
                    </td>
                    <td className={`${cellClass} align-top text-right text-sm font-medium tabular-nums`}>
                      ${lineTotal.toFixed(2)}
                    </td>
                    {!readOnly ? (
                      <td className={`${cellClass} align-top text-right`}>
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
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30">
                <td colSpan={readOnly ? 7 : 7} className={`${cellClass} text-right text-sm font-semibold`}>
                  Items subtotal
                </td>
                <td className={`${cellClass} text-right text-sm font-semibold tabular-nums`}>
                  ${itemsTotal.toFixed(2)}
                </td>
                {!readOnly ? <td className={cellClass} /> : null}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
