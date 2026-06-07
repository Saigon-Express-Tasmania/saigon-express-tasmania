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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { SalesOrderItemsEditor } from './SalesOrderItemsEditor';
import { isSalesOrderItemPickerTarget } from './SalesOrderItemPicker';
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  type OrderStatus,
  type PaymentStatus,
  type SalesOrderForm,
  type SalesOrdersDataset,
} from './salesOrderShared';
import type { OrderType } from './orderType';

type SalesOrderEditorDialogProps = {
  dataset: SalesOrdersDataset;
  orderType: OrderType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingOrderId: number | null;
  form: SalesOrderForm;
  onFormChange: (updater: (prev: SalesOrderForm) => SalesOrderForm) => void;
  saving: boolean;
  onSave: () => void;
};

export function SalesOrderEditorDialog({
  dataset,
  orderType,
  open,
  onOpenChange,
  editingOrderId,
  form,
  onFormChange,
  saving,
  onSave,
}: SalesOrderEditorDialogProps) {
  const id = (field: string) => `${dataset.formIdPrefix}-${field}`;
  const isEditing = editingOrderId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[95vw] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-6xl"
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
            {isEditing ? `Edit ${dataset.entityName}` : dataset.addButtonLabel}
          </DialogTitle>
          <DialogDescription>
            Manage the {dataset.entityName} payload and line items.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={id('name')}>Customer name</Label>
            <Input
              id={id('name')}
              value={form.customer_name}
              onChange={(e) => onFormChange((prev) => ({ ...prev, customer_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id('email')}>Customer email</Label>
            <Input
              id={id('email')}
              type="email"
              value={form.customer_email}
              onChange={(e) => onFormChange((prev) => ({ ...prev, customer_email: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id('phone')}>Customer phone</Label>
            <Input
              id={id('phone')}
              value={form.customer_phone}
              onChange={(e) => onFormChange((prev) => ({ ...prev, customer_phone: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id('store-id')}>Store ID</Label>
            <Input
              id={id('store-id')}
              type="number"
              value={form.store_id ?? ''}
              onChange={(e) =>
                onFormChange((prev) => ({
                  ...prev,
                  store_id: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor={id('pickup')}>Pickup time</Label>
            <Input
              id={id('pickup')}
              value={form.pickup_time}
              onChange={(e) => onFormChange((prev) => ({ ...prev, pickup_time: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id('total')}>Total</Label>
            <Input
              id={id('total')}
              type="number"
              min="0"
              step="0.01"
              value={form.total}
              onChange={(e) => onFormChange((prev) => ({ ...prev, total: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id('status')}>Status</Label>
            <Select
              value={form.status}
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
          </div>
          <SalesOrderItemsEditor
            orderType={orderType}
            items={form.items}
            onItemsChange={(items) => onFormChange((prev) => ({ ...prev, items }))}
            idPrefix={dataset.formIdPrefix}
            disabled={saving}
          />
          <div className="grid gap-2">
            <Label htmlFor={id('payment-status')}>Payment status</Label>
            <Select
              value={form.payment_status}
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
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id('stripe-mode')}>Stripe mode</Label>
            <Select
              value={form.stripe_mode ?? 'null'}
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
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor={id('stripe-session')}>Stripe checkout session ID</Label>
            <Input
              id={id('stripe-session')}
              value={form.stripe_checkout_session_id ?? ''}
              onChange={(e) =>
                onFormChange((prev) => ({
                  ...prev,
                  stripe_checkout_session_id: e.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id('cancel-token')}>Cancel token</Label>
            <Input
              id={id('cancel-token')}
              value={form.cancel_token ?? ''}
              onChange={(e) => onFormChange((prev) => ({ ...prev, cancel_token: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id('tracking-token')}>Tracking token</Label>
            <Input
              id={id('tracking-token')}
              value={form.tracking_token ?? ''}
              onChange={(e) =>
                onFormChange((prev) => ({ ...prev, tracking_token: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id('status-updated-at')}>Status updated at (ISO)</Label>
            <Input
              id={id('status-updated-at')}
              value={form.status_updated_at ?? ''}
              onChange={(e) =>
                onFormChange((prev) => ({ ...prev, status_updated_at: e.target.value || null }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id('receipt-confirmed-at')}>Receipt confirmed at (ISO)</Label>
            <Input
              id={id('receipt-confirmed-at')}
              value={form.receipt_confirmed_at ?? ''}
              onChange={(e) =>
                onFormChange((prev) => ({
                  ...prev,
                  receipt_confirmed_at: e.target.value || null,
                }))
              }
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor={id('notes')}>Notes</Label>
            <Textarea
              id={id('notes')}
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => onFormChange((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>          
        </div>

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
