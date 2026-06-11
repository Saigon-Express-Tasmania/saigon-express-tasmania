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
import { SalesOrderB2BEditor } from './SalesOrderB2BEditor';
import { SalesOrderFormField } from './SalesOrderFormField';
import { isSalesOrderItemPickerTarget } from './SalesOrderItemPicker';
import { SalesOrderItemsEditor } from './SalesOrderItemsEditor';
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  type OrderStatus,
  type PaymentStatus,
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

type EditorTab = 'customer' | 'items' | 'status' | 'integrations' | 'b2b';

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
              : `Manage the ${dataset.entityName} payload across customer, items, status, and integrations.`}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as EditorTab)}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <TabsList className="shrink-0">
            <TabsTrigger value="customer">Customer</TabsTrigger>
            <TabsTrigger value="items">
              Items{form.items.length > 0 ? ` (${form.items.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="status">Status & totals</TabsTrigger>
            <TabsTrigger value="integrations">Stripe & tokens</TabsTrigger>
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
                label="Pickup time"
                htmlFor={id('pickup')}
                readOnly={readOnly}
                value={form.pickup_time}
                className="md:col-span-2"
              >
                <Input
                  id={id('pickup')}
                  value={form.pickup_time}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({ ...prev, pickup_time: e.target.value }))
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

          <TabsContent value="items" className={tabPanelClass}>
            <SalesOrderItemsEditor
              orderType={orderType}
              items={form.items}
              onItemsChange={(items) => onFormChange((prev) => ({ ...prev, items }))}
              idPrefix={dataset.formIdPrefix}
              disabled={saving}
              readOnly={readOnly}
            />
          </TabsContent>

          <TabsContent value="status" className={tabPanelClass}>
            <div className="grid gap-4 py-1 md:grid-cols-2">
              <SalesOrderFormField
                label="Total"
                htmlFor={id('total')}
                readOnly={readOnly}
                value={`$${Number(form.total).toFixed(2)}`}
                valueClassName="tabular-nums"
              >
                <Input
                  id={id('total')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total}
                  disabled={saving}
                  onChange={(e) => onFormChange((prev) => ({ ...prev, total: e.target.value }))}
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
                label="Payment status"
                htmlFor={id('payment-status')}
                readOnly={readOnly}
                value={form.payment_status}
              >
                <Select
                  value={form.payment_status}
                  disabled={saving}
                  onValueChange={(value) =>
                    onFormChange((prev) => ({
                      ...prev,
                      payment_status: value as PaymentStatus,
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
              <SalesOrderFormField
                label="Receipt confirmed at (ISO)"
                htmlFor={id('receipt-confirmed-at')}
                readOnly={readOnly}
                value={form.receipt_confirmed_at}
                className="md:col-span-2"
              >
                <Input
                  id={id('receipt-confirmed-at')}
                  value={form.receipt_confirmed_at ?? ''}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({
                      ...prev,
                      receipt_confirmed_at: e.target.value || null,
                    }))
                  }
                />
              </SalesOrderFormField>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className={tabPanelClass}>
            <div className="grid gap-4 py-1 md:grid-cols-2">
              <SalesOrderFormField
                label="Stripe mode"
                htmlFor={id('stripe-mode')}
                readOnly={readOnly}
                value={form.stripe_mode ?? 'None'}
              >
                <Select
                  value={form.stripe_mode ?? 'null'}
                  disabled={saving}
                  onValueChange={(value) =>
                    onFormChange((prev) => ({
                      ...prev,
                      stripe_mode: value === 'null' ? null : (value as 'test' | 'live'),
                    }))
                  }
                >
                  <SelectTrigger id={id('stripe-mode')}>
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
                label="Stripe checkout session ID"
                htmlFor={id('stripe-session')}
                readOnly={readOnly}
                value={form.stripe_checkout_session_id}
                className="md:col-span-2"
                valueClassName="break-all font-mono text-xs"
              >
                <Input
                  id={id('stripe-session')}
                  value={form.stripe_checkout_session_id ?? ''}
                  disabled={saving}
                  onChange={(e) =>
                    onFormChange((prev) => ({
                      ...prev,
                      stripe_checkout_session_id: e.target.value,
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
