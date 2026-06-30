import { DashboardLayout } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSalesOrderMode } from '@/contexts/SalesOrderModeContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { fetchCommerceTaxSettings } from '@/lib/commerce-tax';
import supabase from '@/lib/supabase/client';
import { ArrowLeft, Loader2, PackageCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  formatOrderTypeLabel,
  isOrderType,
  salesPagePath,
  type OrderType,
} from './orderType';
import { SalesOrderDeleteDialog } from './SalesOrderDeleteDialog';
import { SalesOrderEditorContent } from './SalesOrderEditorContent';
import { SalesOrderFulfillmentDialog } from './SalesOrderFulfillmentDialog';
import { formatOrderStatusLabel, fulfillmentMethodLabel } from './salesOrderFulfillment';
import {
  orderStatusBadgeClass,
  paymentStatusBadgeClass,
} from './salesOrderUi';
import {
  LIVE_ORDERS_DATASET,
  SALES_ORDER_COLUMNS,
  TEST_ORDERS_DATASET,
  loadOrderForm,
  type SalesOrderForm,
  type SalesOrderRow,
} from './salesOrderShared';
import { useSalesOrderRowActions } from './useSalesOrderRowActions';

export function SalesOrderDetailsPage() {
  const navigate = useNavigate();
  const { orderType: rawOrderType, orderId: rawOrderId } = useParams<{
    orderType: string;
    orderId: string;
  }>();
  const { mode } = useSalesOrderMode();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const dataset = mode === 'test' ? TEST_ORDERS_DATASET : LIVE_ORDERS_DATASET;
  const orderType: OrderType | null = isOrderType(rawOrderType) ? rawOrderType : null;
  const orderId = rawOrderId && /^\d+$/.test(rawOrderId) ? Number(rawOrderId) : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<SalesOrderRow | null>(null);
  const [form, setForm] = useState<SalesOrderForm | null>(null);
  const [isGstInclusive, setIsGstInclusive] = useState(true);

  const listPath = orderType ? salesPagePath('orders', orderType) : '/sales/orders/pickup';

  const loadOrder = useCallback(async () => {
    if (!orderType || orderId === null) return;

    try {
      setError(null);
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(SALES_ORDER_COLUMNS)
        .eq('id', orderId)
        .eq('order_type', orderType)
        .eq('is_testing', dataset.isTestingFilter)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setOrder(null);
        setForm(null);
        setError(`${dataset.entityNameTitle} not found.`);
        return;
      }

      const row = data as SalesOrderRow;
      const loadedForm = await loadOrderForm(row, dataset.defaultPaymentMode);
      setOrder(row);
      setForm(loadedForm);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to load ${dataset.entityName} details.`;
      setError(message);
      setOrder(null);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [dataset.defaultPaymentMode, dataset.entityNameTitle, dataset.isTestingFilter, orderId, orderType]);

  const {
    saving,
    deleteTarget,
    setDeleteTarget,
    fulfillTarget,
    setFulfillTarget,
    handleFulfillStatusChange,
    handleFulfillCancel,
    handleFulfillSaveDetails,
    handleDelete,
    enrichOrderWithPaymentStatus,
  } = useSalesOrderRowActions({
    dataset,
    orderType: orderType ?? 'pickup',
    isGstInclusive,
    onAfterChange: loadOrder,
  });

  useEffect(() => {
    void fetchCommerceTaxSettings()
      .then((settings) => setIsGstInclusive(settings.isGstInclusive))
      .catch(() => setIsGstInclusive(true));
  }, []);

  useEffect(() => {
    if (isAdmin && orderType && orderId !== null) {
      void loadOrder();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadOrder, orderId, orderType]);

  const pageTitle = useMemo(() => {
    if (!orderType || orderId === null) return dataset.pageLabel;
    const typeLabel = formatOrderTypeLabel(orderType);
    return `${typeLabel} ${dataset.entityNameTitle} #${orderId}`;
  }, [dataset.entityNameTitle, dataset.pageLabel, orderId, orderType]);

  if (!orderType || orderId === null) {
    return <Navigate to={listPath} replace />;
  }

  if (profileLoading) {
    return (
      <DashboardLayout title={pageTitle}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title={pageTitle}>
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only administrators can view {dataset.entityName} details.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  const handleDeleteConfirm = async () => {
    const deleted = await handleDelete();
    if (deleted) {
      navigate(listPath);
    }
  };

  const openFulfill = async () => {
    if (!order) return;
    const enriched = await enrichOrderWithPaymentStatus(order);
    setFulfillTarget(enriched);
  };

  return (
    <DashboardLayout title={pageTitle}>
      <div className="space-y-6">
        <Card className="overflow-hidden shadow-sm">
          <div className="h-0.5 bg-gradient-to-r from-emerald-500/80 via-teal-500/60 to-transparent" />
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b bg-muted/20 pb-5">
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2" asChild>
                <Link to={listPath}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to {dataset.pageLabel.toLowerCase()}
                </Link>
              </Button>
              <div>
                <CardTitle className="text-2xl">
                  {dataset.entityNameTitle} #{orderId}
                </CardTitle>
                <CardDescription className="mt-1">
                  {form?.customer_name
                    ? `${form.customer_name} · ${form.customer_email || 'No email'}`
                    : `Review ${dataset.entityName} details across all sections below.`}
                </CardDescription>
              </div>
              {form ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={orderStatusBadgeClass(form.status)}>
                    {formatOrderStatusLabel(form.status)}
                  </Badge>
                  <Badge className={paymentStatusBadgeClass(form.payment.status)}>
                    Payment: {form.payment.status.replace(/_/g, ' ')}
                  </Badge>
                  <Badge className="border-sky-200 bg-sky-500/10 text-sky-900 dark:text-sky-100">
                    {fulfillmentMethodLabel(form.requested_fulfillment_method)}
                  </Badge>
                  <Badge className="border-violet-200 bg-violet-500/10 font-semibold tabular-nums text-violet-900 dark:text-violet-100">
                    ${Number(form.grand_total).toFixed(2)}
                  </Badge>
                  {form.items.length > 0 ? (
                    <Badge variant="outline" className="border-border/70">
                      {form.items.length} item{form.items.length === 1 ? '' : 's'}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
            {order ? (
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border hover:bg-muted/50"
                  onClick={() => void openFulfill()}
                  disabled={saving || loading}
                  aria-label={`Fulfill order ${order.id}`}
                  title="Fulfill"
                >
                  <PackageCheck className="h-4 w-4 text-emerald-600" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void enrichOrderWithPaymentStatus(order).then(setDeleteTarget)}
                  disabled={saving || loading}
                  aria-label={`Archive order ${order.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : form ? (
              <SalesOrderEditorContent
                dataset={dataset}
                orderType={orderType}
                layout="stacked"
                editingOrderId={orderId}
                readOnly
                form={form}
                onFormChange={(updater) => setForm((prev) => (prev ? updater(prev) : prev))}
                saving={saving}
                isGstInclusive={isGstInclusive}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <SalesOrderDeleteDialog
        dataset={dataset}
        target={deleteTarget}
        saving={saving}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />

      <SalesOrderFulfillmentDialog
        order={fulfillTarget}
        saving={saving}
        isGstInclusive={isGstInclusive}
        onOpenChange={(open) => !open && setFulfillTarget(null)}
        onStatusChange={handleFulfillStatusChange}
        onCancelOrder={handleFulfillCancel}
        onSaveDetails={(id, details) => void handleFulfillSaveDetails(id, details)}
      />
    </DashboardLayout>
  );
}
