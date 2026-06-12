import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { OrderType } from './orderType';
import { SalesOrderAddressEditor } from './SalesOrderAddressEditor';
import { SalesOrderB2BEditor } from './SalesOrderB2BEditor';
import { SalesOrderFormField } from './SalesOrderFormField';
import { isSalesOrderItemPickerTarget } from './SalesOrderItemPicker';
import { SalesOrderItemsEditor } from './SalesOrderItemsEditor';
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from './salesOrderDb';
import {
  FULFILLMENT_TYPE_OPTIONS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_GATEWAY_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  syncTotalsFromItems,
  type FulfillmentType,
  type OrderStatus,
  type PaymentGateway,
  type PaymentMethod,
  type PaymentStatus,
  type PaymentTerms,
  type SalesOrderForm,
  type SalesOrdersDataset,
} from './salesOrderShared';

type SalesOrderEditorDialogProps = {
  dataset: SalesOrdersDataset;
  orderType: OrderType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingOrderId: number | null;
  readOnly?: boolean;
  form: SalesOrderForm;
  onFormChange: (updater: (prev: SalesOrderForm) => SalesOrderForm) => void;
  saving: boolean;
  onSave: () => void;
};

type EditorTab = 'customer' | 'addresses' | 'items' | 'status' | 'payment' | 'b2b';

export function SalesOrderEditorDialog({
  dataset,
  orderType,
  open,
  onOpenChange,
  editingOrderId,
  readOnly = false,
  form,
  onFormChange,
  saving,
  onSave,
}: SalesOrderEditorDialogProps) {
  const id = (field: string) => `${dataset.formIdPrefix}-${field}`;
  const isEditing = editingOrderId !== null;
  const isWholesale = orderType === 'wholesale';
  const [activeTab, setActiveTab] = useState<EditorTab>('customer');

  useEffect(() => {
    if (open) {
      setActiveTab('customer');
    }
  }, [open, editingOrderId]);

  const tabPanelClass =
    'mt-0 h-[min(58vh,560px)] flex-none overflow-y-auto pr-1 data-[state=inactive]:hidden';

  const applyItemsChange = (items: SalesOrderForm['items']) => {
    onFormChange((prev) => syncTotalsFromItems({ ...prev, items }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[95vw] max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-6xl [&_[data-slot=dialog-header]]:shrink-0 [&_[data-slot=dialog-footer]]:shrink-0"
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
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? `View ${dataset.entityName}`
              : isEditing
                ? `Edit ${dataset.entityName}`
                : dataset.addButtonLabel}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? `Review ${dataset.entityName} details across all tabs. Fields are read-only.`
              : `Manage the ${dataset.entityName} payload across customer, items, totals, and payment.`}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as EditorTab)}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <TabsList className="shrink-0">
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="items">
              Items{form.items.length > 0 ? ` (${form.items.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="status">Status & totals</TabsTrigger>
            <TabsTrigger value="payment">Payment & tokens</TabsTrigger>
            {isWholesale ? <TabsTrigger value="b2b">B2B</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="customer" className={tabPanelClass}>
            <div className="grid gap-4 py-1 md:grid-cols-2">
              <SalesOrderFormField
                label="Customer name"
                htmlFor={id('name')}
                readOnly={readOnly}
                value={form.customer_name}
              >
                <Input
                  id={id('name')}
                  value={form.customer_name}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, customer_name: e.target.value }))
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Customer email"
                htmlFor={id('email')}
                readOnly={readOnly}
                value={form.customer_email}
              >
                <Input
                  id={id('email')}
                  type="email"
                  value={form.customer_email}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, customer_email: e.target.value }))
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Customer phone"
                htmlFor={id('phone')}
                readOnly={readOnly}
                value={form.customer_phone}
              >
                <Input
                  id={id('phone')}
                  value={form.customer_phone}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, customer_phone: e.target.value }))
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Store ID"
                htmlFor={id('store-id')}
                readOnly={readOnly}
                value={form.store_id}
              >
                <Input
                  id={id('store-id')}
                  type="number"
                  value={form.store_id ?? ''}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({
                      ...prev,
                      store_id: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Fulfillment method"
                htmlFor={id('fulfillment')}
                readOnly={readOnly}
                value={form.requested_fulfillment_method}
              >
                <Select
                  value={form.requested_fulfillment_method}
                  disabled={saving}
                  onValueChange={(value) =>
                    onFormChange((prev) => ({
                      ...prev,
                      requested_fulfillment_method: value as FulfillmentType,
                    }))
                  }
                >
                  <SelectTrigger id={id('fulfillment')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FULFILLMENT_TYPE_OPTIONS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Payment terms"
                htmlFor={id('payment-terms')}
                readOnly={readOnly}
                value={form.payment_terms}
              >
                <Select
                  value={form.payment_terms}
                  disabled={saving}
                  onValueChange={(value) =>
                    onFormChange((prev) => ({
                      ...prev,
                      payment_terms: value as PaymentTerms,
                    }))
                  }
                >
                  <SelectTrigger id={id('payment-terms')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS_OPTIONS.map((terms) => (
                      <SelectItem key={terms} value={terms}>
                        {terms}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Target date"
                htmlFor={id('target-date')}
                readOnly={readOnly}
                value={toDatetimeLocalValue(form.requested_target_date) || form.requested_target_date}
                className="md:col-span-2"
              >
                <Input
                  id={id('target-date')}
                  type="datetime-local"
                  value={toDatetimeLocalValue(form.requested_target_date)}
                  disabled={saving}
                  onChange={(e) => {
                    const iso = fromDatetimeLocalValue(e.target.value);
                    if (iso) {
                      onFormChange((prev) => ({ ...prev, requested_target_date: iso }));
                    }
                  }}
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="PO number"
                htmlFor={id('po-number')}
                readOnly={readOnly}
                value={form.po_number}
              >
                <Input
                  id={id('po-number')}
                  value={form.po_number ?? ''}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({
                      ...prev,
                      po_number: e.target.value || null,
                    }))
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Notes"
                htmlFor={id('notes')}
                readOnly={readOnly}
                value={<span className="whitespace-pre-wrap">{form.notes}</span>}
                className="md:col-span-2"
              >
                <Textarea
                  id={id('notes')}
                  rows={4}
                  value={form.notes ?? ''}
                  disabled={saving}
                  onChange={(e) => onFormChange((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </SalesOrderFormField>
            </div>
          </TabsContent>

          <TabsContent value="addresses" className={tabPanelClass}>
            <SalesOrderAddressEditor
              idPrefix={dataset.formIdPrefix}
              value={{
                shipping_address: form.shipping_address,
                shipping_city: form.shipping_city,
                shipping_state: form.shipping_state,
                shipping_postal_code: form.shipping_postal_code,
                shipping_country: form.shipping_country,
                billing_address: form.billing_address,
                billing_city: form.billing_city,
                billing_state: form.billing_state,
                billing_postal_code: form.billing_postal_code,
                billing_country: form.billing_country,
              }}
              onChange={(address) =>
                onFormChange((prev) => ({
                  ...prev,
                  ...address,
                }))
              }
              disabled={saving}
              readOnly={readOnly || isWholesale}
            />
            {isWholesale ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Wholesale orders save shipping and billing details from the B2B tab.
              </p>
            ) : null}
          </TabsContent>

          <TabsContent value="items" className={tabPanelClass}>
            <SalesOrderItemsEditor
              orderType={orderType}
              items={form.items}
              onItemsChange={applyItemsChange}
              idPrefix={dataset.formIdPrefix}
              disabled={saving}
              readOnly={readOnly}
            />
          </TabsContent>

          <TabsContent value="status" className={tabPanelClass}>
            <div className="grid gap-4 py-1 md:grid-cols-2">
              <SalesOrderFormField
                label="Subtotal"
                htmlFor={id('subtotal')}
                readOnly={readOnly}
                value={`$${Number(form.subtotal).toFixed(2)}`}
                valueClassName="tabular-nums"
              >
                <Input
                  id={id('subtotal')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.subtotal}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) =>
                      syncTotalsFromItems({ ...prev, subtotal: e.target.value }),
                    )
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Tax total"
                htmlFor={id('tax-total')}
                readOnly={readOnly}
                value={`$${Number(form.tax_total).toFixed(2)}`}
                valueClassName="tabular-nums"
              >
                <Input
                  id={id('tax-total')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tax_total}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) =>
                      syncTotalsFromItems({ ...prev, tax_total: e.target.value }),
                    )
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Shipping fee"
                htmlFor={id('shipping-fee')}
                readOnly={readOnly}
                value={`$${Number(form.shipping_fee).toFixed(2)}`}
                valueClassName="tabular-nums"
              >
                <Input
                  id={id('shipping-fee')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.shipping_fee}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) =>
                      syncTotalsFromItems({ ...prev, shipping_fee: e.target.value }),
                    )
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Grand total"
                htmlFor={id('grand-total')}
                readOnly={readOnly}
                value={`$${Number(form.grand_total).toFixed(2)}`}
                valueClassName="tabular-nums"
              >
                <Input
                  id={id('grand-total')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.grand_total}
                  disabled={saving}
                  readOnly
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Status"
                htmlFor={id('status')}
                readOnly={readOnly}
                value={form.status}
              >
                <Select
                  value={form.status}
                  disabled={saving}
                  onValueChange={(value) =>
                    onFormChange((prev) => ({ ...prev, status: value as OrderStatus }))
                  }
                >
                  <SelectTrigger id={id('status')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Status updated at (ISO)"
                htmlFor={id('status-updated-at')}
                readOnly={readOnly}
                value={form.status_updated_at}
              >
                <Input
                  id={id('status-updated-at')}
                  value={form.status_updated_at ?? ''}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({
                      ...prev,
                      status_updated_at: e.target.value || null,
                    }))
                  }
                />
              </SalesOrderFormField>
            </div>
          </TabsContent>

          <TabsContent value="payment" className={tabPanelClass}>
            <div className="grid gap-4 py-1 md:grid-cols-2">
              <SalesOrderFormField
                label="Payment status"
                htmlFor={id('payment-status')}
                readOnly={readOnly}
                value={form.payment.status}
              >
                <Select
                  value={form.payment.status}
                  disabled={saving}
                  onValueChange={(value) =>
                    onFormChange((prev) => ({
                      ...prev,
                      payment: { ...prev.payment, status: value as PaymentStatus },
                    }))
                  }
                >
                  <SelectTrigger id={id('payment-status')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Payment amount"
                htmlFor={id('payment-amount')}
                readOnly={readOnly}
                value={`$${Number(form.payment.amount).toFixed(2)}`}
                valueClassName="tabular-nums"
              >
                <Input
                  id={id('payment-amount')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.payment.amount}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({
                      ...prev,
                      payment: { ...prev.payment, amount: e.target.value },
                    }))
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Payment mode"
                htmlFor={id('payment-mode')}
                readOnly={readOnly}
                value={form.payment.mode ?? 'None'}
              >
                <Select
                  value={form.payment.mode ?? 'null'}
                  disabled={saving}
                  onValueChange={(value) =>
                    onFormChange((prev) => ({
                      ...prev,
                      payment: {
                        ...prev.payment,
                        mode: value === 'null' ? null : (value as 'test' | 'live'),
                      },
                    }))
                  }
                >
                  <SelectTrigger id={id('payment-mode')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">None</SelectItem>
                    <SelectItem value="test">test</SelectItem>
                    <SelectItem value="live">live</SelectItem>
                  </SelectContent>
                </Select>
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Payment method"
                htmlFor={id('payment-method')}
                readOnly={readOnly}
                value={form.payment.method}
              >
                <Select
                  value={form.payment.method}
                  disabled={saving}
                  onValueChange={(value) =>
                    onFormChange((prev) => ({
                      ...prev,
                      payment: { ...prev.payment, method: value as PaymentMethod },
                    }))
                  }
                >
                  <SelectTrigger id={id('payment-method')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Payment gateway"
                htmlFor={id('payment-gateway')}
                readOnly={readOnly}
                value={form.payment.gateway}
              >
                <Select
                  value={form.payment.gateway}
                  disabled={saving}
                  onValueChange={(value) =>
                    onFormChange((prev) => ({
                      ...prev,
                      payment: { ...prev.payment, gateway: value as PaymentGateway },
                    }))
                  }
                >
                  <SelectTrigger id={id('payment-gateway')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_GATEWAY_OPTIONS.map((gateway) => (
                      <SelectItem key={gateway} value={gateway}>
                        {gateway}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Gateway transaction ID"
                htmlFor={id('gateway-txn')}
                readOnly={readOnly}
                value={form.payment.gateway_transaction_id}
                className="md:col-span-2"
                valueClassName="break-all font-mono text-xs"
              >
                <Input
                  id={id('gateway-txn')}
                  value={form.payment.gateway_transaction_id}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({
                      ...prev,
                      payment: {
                        ...prev.payment,
                        gateway_transaction_id: e.target.value,
                      },
                    }))
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Cancel token"
                htmlFor={id('cancel-token')}
                readOnly={readOnly}
                value={form.cancel_token}
                valueClassName="break-all font-mono text-xs"
              >
                <Input
                  id={id('cancel-token')}
                  value={form.cancel_token ?? ''}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, cancel_token: e.target.value }))
                  }
                />
              </SalesOrderFormField>
              <SalesOrderFormField
                label="Tracking token"
                htmlFor={id('tracking-token')}
                readOnly={readOnly}
                value={form.tracking_token}
                valueClassName="break-all font-mono text-xs"
              >
                <Input
                  id={id('tracking-token')}
                  value={form.tracking_token ?? ''}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, tracking_token: e.target.value }))
                  }
                />
              </SalesOrderFormField>
            </div>
          </TabsContent>

          {isWholesale ? (
            <TabsContent value="b2b" className={tabPanelClass}>
              <SalesOrderB2BEditor
                b2b={form.b2b}
                onB2bChange={(b2b) => onFormChange((prev) => ({ ...prev, b2b }))}
                idPrefix={dataset.formIdPrefix}
                disabled={saving}
                readOnly={readOnly}
              />
            </TabsContent>
          ) : null}
        </Tabs>

        <DialogFooter>
          {readOnly ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
