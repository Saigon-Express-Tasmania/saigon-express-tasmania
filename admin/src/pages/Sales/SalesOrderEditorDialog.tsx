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
import { formatOrderTypeLabel, type OrderType } from './orderType';
import { SalesOrderAddressEditor } from './SalesOrderAddressEditor';
import { SalesOrderB2BEditor } from './SalesOrderB2BEditor';
import {
  SalesOrderFormField,
  SalesOrderFormSection,
  salesOrderFormGridClass,
} from './SalesOrderFormField';
import { isSalesOrderItemPickerTarget } from './SalesOrderItemPicker';
import { SalesOrderItemsEditor } from './SalesOrderItemsEditor';
import {
  fromDatetimeLocalValue,
  formatTargetDateDisplay,
  toDatetimeLocalValue,
} from './salesOrderDb';
import { formatOrderStatusLabel, fulfillmentMethodLabel } from './salesOrderFulfillment';
import {
  FULFILLMENT_TYPE_OPTIONS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_GATEWAY_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  pickOrderAddressFields,
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
  isGstInclusive?: boolean;
};

type EditorTab = 'customer' | 'addresses' | 'items' | 'payment' | 'b2b';

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
  isGstInclusive = true,
}: SalesOrderEditorDialogProps) {
  const id = (field: string) => `${dataset.formIdPrefix}-${field}`;
  const taxMode = { isGstInclusive };
  const isEditing = editingOrderId !== null;
  const isWholesale = orderType === 'wholesale';
  const [activeTab, setActiveTab] = useState<EditorTab>('customer');

  useEffect(() => {
    if (open) {
      setActiveTab('customer');
    }
  }, [open, editingOrderId]);

  const tabPanelClass =
    'mt-0 h-[min(58vh,560px)] flex-none overflow-y-auto px-0.5 pr-1 data-[state=inactive]:hidden';

  const formatEnumLabel = (value: string) =>
    value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const formatPaymentTermsLabel = (terms: PaymentTerms): string => {
    const labels: Record<PaymentTerms, string> = {
      prepaid: 'Prepaid',
      due_on_receipt: 'Due on receipt',
      deposit_required: 'Deposit required',
      net_30: 'Net 30',
      net_60: 'Net 60',
      net_90: 'Net 90',
    };
    return labels[terms];
  };

  const applyItemsChange = (items: SalesOrderForm['items']) => {
    onFormChange((prev) => syncTotalsFromItems({ ...prev, items }, taxMode));
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
          <TabsList className="h-auto w-full shrink-0 flex-wrap justify-start gap-1 bg-muted/40 p-1">
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="items">
              Items & totals{form.items.length > 0 ? ` (${form.items.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="payment">Payment & tokens</TabsTrigger>
            {isWholesale ? <TabsTrigger value="b2b">B2B</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="customer" className={tabPanelClass}>
            <div className="space-y-6 py-1">
              <SalesOrderFormSection
                title="Order metadata"
                description="System identifiers and order context."
              >
                <div className={salesOrderFormGridClass}>
                  <SalesOrderFormField
                    label="Customer account (UUID)"
                    htmlFor={id('customer-account')}
                    readOnly={readOnly}
                    value={form.customer_account}
                    valueClassName="break-all font-mono text-xs"
                  >
                    <Input
                      id={id('customer-account')}
                      value={form.customer_account ?? ''}
                      disabled={saving}
                      placeholder="Linked user_profiles.id"
                      onChange={(e) =>
                        onFormChange((prev) => ({
                          ...prev,
                          customer_account: e.target.value.trim() || null,
                        }))
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Order type"
                    htmlFor={id('order-type')}
                    readOnly
                    value={formatOrderTypeLabel(orderType)}
                  />
                  {isEditing ? (
                    <>
                      <SalesOrderFormField
                        label="Created at"
                        htmlFor={id('created-at')}
                        readOnly
                        value={form.created_at ? formatTargetDateDisplay(form.created_at) : '—'}
                      />
                      <SalesOrderFormField
                        label="Test order"
                        htmlFor={id('is-testing')}
                        readOnly
                        value={form.is_testing ? 'Yes' : 'No'}
                      />
                    </>
                  ) : null}
                </div>
              </SalesOrderFormSection>

              <SalesOrderFormSection
                title="Customer contact"
                description="Primary contact details for this order."
              >
                <div className={salesOrderFormGridClass}>
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
                </div>
              </SalesOrderFormSection>

              <SalesOrderFormSection
                title="Fulfillment & terms"
                description="How and when this order should be fulfilled."
              >
                <div className={salesOrderFormGridClass}>
                  <SalesOrderFormField
                    label="Fulfillment method"
                    htmlFor={id('fulfillment')}
                    readOnly={readOnly}
                    value={fulfillmentMethodLabel(form.requested_fulfillment_method)}
                  >
                    <Select
                      value={form.requested_fulfillment_method}
                      disabled={saving}
                      onValueChange={(value) =>
                        onFormChange((prev) => ({
                          ...prev,
                          requested_fulfillment_method: value as FulfillmentType,
                          requested_pick_up_store_id:
                            value === 'pick_up' ? prev.requested_pick_up_store_id : null,
                        }))
                      }
                    >
                      <SelectTrigger id={id('fulfillment')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FULFILLMENT_TYPE_OPTIONS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {fulfillmentMethodLabel(method)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Payment terms"
                    htmlFor={id('payment-terms')}
                    readOnly={readOnly}
                    value={formatPaymentTermsLabel(form.payment_terms)}
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
                            {formatPaymentTermsLabel(terms)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Target date"
                    htmlFor={id('target-date')}
                    readOnly={readOnly}
                    value={
                      toDatetimeLocalValue(form.requested_target_date) || form.requested_target_date
                    }
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
                </div>
              </SalesOrderFormSection>

              <SalesOrderFormSection title="Notes">
                <SalesOrderFormField
                  label="Order notes"
                  htmlFor={id('notes')}
                  readOnly={readOnly}
                  value={<span className="whitespace-pre-wrap">{form.notes}</span>}
                  valueClassName="min-h-[5.5rem] whitespace-pre-wrap"
                >
                  <Textarea
                    id={id('notes')}
                    rows={4}
                    value={form.notes ?? ''}
                    disabled={saving}
                    onChange={(e) => onFormChange((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </SalesOrderFormField>
              </SalesOrderFormSection>
            </div>
          </TabsContent>

          <TabsContent value="addresses" className={tabPanelClass}>
            <SalesOrderAddressEditor
              idPrefix={dataset.formIdPrefix}
              fulfillmentMethod={form.requested_fulfillment_method}
              requestedPickUpStoreId={form.requested_pick_up_store_id}
              onPickupStoreChange={(storeId) =>
                onFormChange((prev) => ({
                  ...prev,
                  requested_pick_up_store_id: storeId,
                }))
              }
              value={pickOrderAddressFields(form)}
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
              <p className="mt-4 rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                {form.requested_fulfillment_method === 'pick_up'
                  ? 'Wholesale pickup orders show the pickup store above. Billing details are edited on the B2B tab.'
                  : 'Wholesale orders save shipping and billing details from the B2B tab.'}
              </p>
            ) : null}
          </TabsContent>

          <TabsContent value="items" className={tabPanelClass}>
            <div className="space-y-6 py-1">
              <SalesOrderItemsEditor
                orderType={orderType}
                items={form.items}
                onItemsChange={applyItemsChange}
                idPrefix={dataset.formIdPrefix}
                disabled={saving}
                readOnly={readOnly}
              />

              <SalesOrderFormSection title="Order totals">
                <div className={salesOrderFormGridClass}>
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
                          syncTotalsFromItems({ ...prev, subtotal: e.target.value }, taxMode),
                        )
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Coupon code"
                    htmlFor={id('coupon-code')}
                    readOnly={readOnly}
                    value={form.coupon_code ?? '—'}
                  >
                    <Input
                      id={id('coupon-code')}
                      value={form.coupon_code ?? ''}
                      disabled={saving}
                      onChange={(e) =>
                        onFormChange((prev) => ({
                          ...prev,
                          coupon_code: e.target.value.trim() || null,
                        }))
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Coupon discount"
                    htmlFor={id('coupon-discount')}
                    readOnly={readOnly}
                    value={`$${Number(form.coupon_discount).toFixed(2)}`}
                    valueClassName="tabular-nums"
                  >
                    <Input
                      id={id('coupon-discount')}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.coupon_discount}
                      disabled={saving}
                      onChange={(e) =>
                        onFormChange((prev) =>
                          syncTotalsFromItems({ ...prev, coupon_discount: e.target.value }, taxMode),
                        )
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Wholesale discount"
                    htmlFor={id('wholesale-discount')}
                    readOnly={readOnly}
                    value={`$${Number(form.wholesale_discount).toFixed(2)}`}
                    valueClassName="tabular-nums"
                  >
                    <Input
                      id={id('wholesale-discount')}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.wholesale_discount}
                      disabled={saving}
                      onChange={(e) =>
                        onFormChange((prev) =>
                          syncTotalsFromItems({ ...prev, wholesale_discount: e.target.value }, taxMode),
                        )
                      }
                    />
                  </SalesOrderFormField>
                  {!isGstInclusive ? (
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
                            syncTotalsFromItems({ ...prev, tax_total: e.target.value }, taxMode),
                          )
                        }
                      />
                    </SalesOrderFormField>
                  ) : null}
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
                          syncTotalsFromItems({ ...prev, shipping_fee: e.target.value }, taxMode),
                        )
                      }
                    />
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Grand total"
                    readOnly
                    value={`$${Number(form.grand_total).toFixed(2)}`}
                    valueClassName="tabular-nums font-medium"
                  />
                </div>
              </SalesOrderFormSection>

              <SalesOrderFormSection title="Fulfillment status">
                <div className={salesOrderFormGridClass}>
                  <SalesOrderFormField
                    label="Status"
                    htmlFor={id('status')}
                    readOnly={readOnly}
                    value={formatOrderStatusLabel(form.status)}
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
                            {formatOrderStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Status updated at"
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
              </SalesOrderFormSection>
            </div>
          </TabsContent>

          <TabsContent value="payment" className={tabPanelClass}>
            <div className="space-y-6 py-1">
              <SalesOrderFormSection title="Payment details">
                <div className={salesOrderFormGridClass}>
                  <SalesOrderFormField
                    label="Payment status"
                    htmlFor={id('payment-status')}
                    readOnly={readOnly}
                    value={formatEnumLabel(form.payment.status)}
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
                            {formatEnumLabel(status)}
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
                    value={form.payment.mode ? formatEnumLabel(form.payment.mode) : 'None'}
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
                        <SelectItem value="test">Test</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Payment method"
                    htmlFor={id('payment-method')}
                    readOnly={readOnly}
                    value={formatEnumLabel(form.payment.method)}
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
                            {formatEnumLabel(method)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SalesOrderFormField>
                  <SalesOrderFormField
                    label="Payment gateway"
                    htmlFor={id('payment-gateway')}
                    readOnly={readOnly}
                    value={formatEnumLabel(form.payment.gateway)}
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
                            {formatEnumLabel(gateway)}
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
                </div>
              </SalesOrderFormSection>

              <SalesOrderFormSection
                title="Order tokens"
                description="Customer-facing cancel and tracking links."
              >
                <div className={salesOrderFormGridClass}>
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
              </SalesOrderFormSection>
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
                fulfillmentMethod={form.requested_fulfillment_method}
                requestedPickUpStoreId={form.requested_pick_up_store_id}
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
