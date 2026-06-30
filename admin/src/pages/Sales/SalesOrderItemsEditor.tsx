import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SalesOrderItemCustomisationSummary } from './SalesOrderItemCustomisationSummary';
import { applyItemSpecialNote } from '@/lib/order-item-customisation';
import {
  isSalesOrderItemPickerTarget,
  SalesOrderItemPicker,
} from './SalesOrderItemPicker';
import { SalesOrderSectionHeading } from './SalesOrderFormField';
import { ImageIcon, Maximize2, Minimize2, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { OrderType } from './orderType';
import {
  getOrderItemIdColumnLabel,
  useSalesOrderLineItemImages,
} from './salesOrderCatalog';
import {
  emptyOrderItem,
  ITEM_UOM_OPTIONS,
  type ItemUom,
  type SalesOrderItemForm,
} from './salesOrderShared';
import { SALES_ORDER_FULLSCREEN_DIALOG_CLASS } from './salesOrderUi';
import { cn } from '@/lib/utils';

type SalesOrderItemsEditorProps = {
  orderType: OrderType;
  items: SalesOrderItemForm[];
  onItemsChange: (items: SalesOrderItemForm[]) => void;
  idPrefix: string;
  disabled?: boolean;
  readOnly?: boolean;
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
};

function updateItem(
  items: SalesOrderItemForm[],
  index: number,
  patch: Partial<SalesOrderItemForm>,
): SalesOrderItemForm[] {
  return items.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

function LineItemFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function SalesOrderLineItemCard({
  item,
  itemIdLabel,
  imageUrl,
  compact,
}: {
  item: SalesOrderItemForm;
  itemIdLabel: string;
  imageUrl?: string;
  compact?: boolean;
}) {
  const qty = Number(item.qty);
  const unitPrice = Number(item.unit_price);
  const lineTotal =
    Number.isFinite(qty) && Number.isFinite(unitPrice) ? qty * unitPrice : 0;
  const imageSizeClass = compact ? 'size-10' : 'size-12';
  const iconSizeClass = compact ? 'size-4' : 'size-5';

  return (
    <article className="rounded-lg border border-border/60 bg-card p-3.5">
      <div className="flex items-start gap-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className={cn(
              imageSizeClass,
              'shrink-0 rounded-md border border-border/50 object-cover bg-muted',
            )}
          />
        ) : (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted text-muted-foreground',
              imageSizeClass,
            )}
            aria-hidden
          >
            <ImageIcon className={iconSizeClass} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-sm font-semibold leading-snug text-foreground">
              {item.item_name || '—'}
            </h4>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              ${lineTotal.toFixed(2)}
            </p>
          </div>

          {item.customisation ? (
            <SalesOrderItemCustomisationSummary customisation={item.customisation} />
          ) : null}

          <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {itemIdLabel}
              </dt>
              <dd className="mt-0.5 font-mono text-foreground/80">
                {item.menu_item_id > 0 ? item.menu_item_id : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                SKU
              </dt>
              <dd className="mt-0.5 truncate font-mono text-foreground/80" title={item.sku}>
                {item.sku || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Qty
              </dt>
              <dd className="mt-0.5 tabular-nums text-foreground/80">
                {qty} {item.uom}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Unit
              </dt>
              <dd className="mt-0.5 tabular-nums text-foreground/80">
                ${Number.isFinite(unitPrice) ? unitPrice.toFixed(2) : '0.00'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}

function SalesOrderLineItemEditCard({
  item,
  index,
  itemIdLabel,
  imageUrl,
  idPrefix,
  options,
  loading,
  fieldsDisabled,
  disabled,
  compact,
  onItemsChange,
  items,
}: {
  item: SalesOrderItemForm;
  index: number;
  itemIdLabel: string;
  imageUrl?: string;
  idPrefix: string;
  options: ReturnType<typeof useSalesOrderLineItemImages>['options'];
  loading: boolean;
  fieldsDisabled: boolean;
  disabled: boolean;
  compact?: boolean;
  onItemsChange: (items: SalesOrderItemForm[]) => void;
  items: SalesOrderItemForm[];
}) {
  const qty = Number(item.qty);
  const unitPrice = Number(item.unit_price);
  const lineTotal =
    Number.isFinite(qty) && Number.isFinite(unitPrice) ? qty * unitPrice : 0;
  const imageSizeClass = compact ? 'size-12' : 'size-16';
  const iconSizeClass = compact ? 'size-4' : 'size-5';
  const inputClass = compact ? 'h-8 text-xs' : 'h-9';
  const cardPadding = compact ? 'p-3.5' : 'p-4';

  return (
    <article
      className={cn(
        'rounded-xl border border-border/60 bg-card shadow-sm',
        cardPadding,
      )}
    >
      <div className="flex gap-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className={cn(
              imageSizeClass,
              'shrink-0 rounded-lg border border-border/50 object-cover bg-muted',
            )}
          />
        ) : (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted text-muted-foreground',
              imageSizeClass,
            )}
            aria-hidden
          >
            <ImageIcon className={iconSizeClass} />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1">
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
                  hideNote
                />
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <p className="text-sm font-semibold tabular-nums text-foreground">
                ${lineTotal.toFixed(2)}
              </p>
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
            </div>
          </div>

          <div
            className={cn(
              'grid gap-3',
              compact
                ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5'
                : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
            )}
          >
            <label className="grid gap-1.5">
              <LineItemFieldLabel>{itemIdLabel}</LineItemFieldLabel>
              <div
                className={cn(
                  'flex items-center rounded-md border border-border/60 bg-muted/30 px-3 font-mono text-xs text-muted-foreground',
                  inputClass,
                )}
              >
                {item.menu_item_id > 0 ? item.menu_item_id : '—'}
              </div>
            </label>

            <label className="grid gap-1.5">
              <LineItemFieldLabel>SKU</LineItemFieldLabel>
              <Input
                id={`${idPrefix}-item-${index}-sku`}
                value={item.sku}
                disabled={fieldsDisabled}
                onChange={(e) =>
                  onItemsChange(updateItem(items, index, { sku: e.target.value }))
                }
                className={cn(inputClass, 'font-mono text-xs')}
              />
            </label>

            <label className="grid gap-1.5">
              <LineItemFieldLabel>UOM</LineItemFieldLabel>
              <Select
                value={item.uom}
                disabled={fieldsDisabled}
                onValueChange={(value) =>
                  onItemsChange(updateItem(items, index, { uom: value as ItemUom }))
                }
              >
                <SelectTrigger className={cn(inputClass, 'w-full min-w-0')}>
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
            </label>

            <label className="grid gap-1.5">
              <LineItemFieldLabel>Qty</LineItemFieldLabel>
              <Input
                id={`${idPrefix}-item-${index}-qty`}
                type="number"
                min="1"
                value={item.qty}
                disabled={fieldsDisabled}
                onChange={(e) => {
                  const nextQty = e.target.value ? Number(e.target.value) : 0;
                  const patch: Partial<SalesOrderItemForm> = { qty: nextQty };
                  if (item.customisation) {
                    patch.customisation = {
                      ...item.customisation,
                      qty: nextQty > 0 ? nextQty : 1,
                    };
                  }
                  onItemsChange(updateItem(items, index, patch));
                }}
                className={cn(inputClass, 'tabular-nums')}
              />
            </label>

            <label className="grid gap-1.5">
              <LineItemFieldLabel>Unit price</LineItemFieldLabel>
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
                className={cn(inputClass, 'tabular-nums')}
              />
            </label>
          </div>

          <label className="grid gap-1.5">
            <LineItemFieldLabel>Special instructions</LineItemFieldLabel>
            <Textarea
              id={`${idPrefix}-item-${index}-note`}
              value={item.customisation?.note ?? ''}
              disabled={fieldsDisabled}
              rows={compact ? 2 : 3}
              maxLength={200}
              placeholder="Optional notes for this item (e.g. allergies, preparation requests)"
              onChange={(e) =>
                onItemsChange(
                  updateItem(items, index, {
                    customisation: applyItemSpecialNote(
                      item.customisation,
                      e.target.value,
                      qty,
                    ),
                  }),
                )
              }
              className={cn(
                'min-h-0 resize-none text-sm',
                compact ? 'text-xs' : undefined,
              )}
            />
          </label>
        </div>
      </div>
    </article>
  );
}

function ItemsSubtotalBar({
  itemsTotal,
  className,
}: {
  itemsTotal: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3',
        className,
      )}
    >
      <span className="text-sm font-medium">Items subtotal</span>
      <span className="text-sm font-semibold tabular-nums">${itemsTotal.toFixed(2)}</span>
    </div>
  );
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
  className,
}: SalesOrderItemsEditorProps) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const { options, loading, error, resolveLineItemImageUrl } =
    useSalesOrderLineItemImages(orderType, items);
  const itemIdLabel = getOrderItemIdColumnLabel(orderType);
  const fieldsDisabled = disabled || readOnly;

  const itemsTotal = items.reduce((sum, item) => {
    const qty = Number(item.qty);
    const unitPrice = Number(item.unit_price);
    if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return sum;
    return sum + qty * unitPrice;
  }, 0);

  const addLineItem = () => onItemsChange([...items, emptyOrderItem()]);

  const headerActions = !readOnly ? (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="border-border"
        onClick={() => setFullscreenOpen(true)}
      >
        <Maximize2 className="mr-2 h-4 w-4" />
        Fullscreen
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="border-border"
        onClick={addLineItem}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add line item
      </Button>
    </div>
  ) : null;

  const editList = (
    <div
      className={cn(
        'min-h-0 flex-1 space-y-3 overflow-y-auto pr-1',
        !fullscreenOpen && 'min-h-[min(52vh,560px)]',
      )}
    >
      {items.map((item, index) => (
        <SalesOrderLineItemEditCard
          key={`${idPrefix}-item-${index}`}
          item={item}
          index={index}
          itemIdLabel={itemIdLabel}
          imageUrl={resolveLineItemImageUrl(item)}
          idPrefix={idPrefix}
          options={options}
          loading={loading}
          fieldsDisabled={fieldsDisabled}
          disabled={disabled}
          compact={compact}
          onItemsChange={onItemsChange}
          items={items}
        />
      ))}
    </div>
  );

  const editBody = (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {editList}
      <ItemsSubtotalBar itemsTotal={itemsTotal} className="shrink-0" />
    </div>
  );

  return (
    <div className={cn('flex min-h-0 w-full flex-col gap-3', className)}>
      {showHeader ? (
        <div className="flex shrink-0 items-center justify-between gap-4">
          <SalesOrderSectionHeading title="Line items" accent="violet" size="inner" />
          {headerActions}
        </div>
      ) : !readOnly ? (
        <div className="flex shrink-0 justify-end">{headerActions}</div>
      ) : null}

      {error ? (
        <div className="shrink-0 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No line items yet.{readOnly ? '' : ' Add one to continue.'}
        </p>
      ) : readOnly ? (
        <div className="space-y-2.5">
          {items.map((item, index) => (
            <SalesOrderLineItemCard
              key={`${idPrefix}-item-${index}`}
              item={item}
              itemIdLabel={itemIdLabel}
              imageUrl={resolveLineItemImageUrl(item)}
              compact={compact}
            />
          ))}
          <ItemsSubtotalBar itemsTotal={itemsTotal} />
        </div>
      ) : (
        editBody
      )}

      {!readOnly ? (
        <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
          <DialogContent
            className={SALES_ORDER_FULLSCREEN_DIALOG_CLASS}
            onPointerDownOutside={(event) => {
              if (isSalesOrderItemPickerTarget(event.target)) {
                event.preventDefault();
              }
            }}
            onFocusOutside={(event) => {
              if (isSalesOrderItemPickerTarget(event.target)) {
                event.preventDefault();
              }
            }}
          >
            <DialogHeader className="shrink-0 border-b px-6 py-4">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="space-y-1">
                  <DialogTitle>Line items</DialogTitle>
                  <DialogDescription>
                    {items.length} item{items.length === 1 ? '' : 's'} · Items subtotal $
                    {itemsTotal.toFixed(2)}
                  </DialogDescription>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={addLineItem}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add line item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFullscreenOpen(false)}
                  >
                    <Minimize2 className="mr-2 h-4 w-4" />
                    Exit fullscreen
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
              {error ? (
                <div className="shrink-0 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}
              {editBody}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
