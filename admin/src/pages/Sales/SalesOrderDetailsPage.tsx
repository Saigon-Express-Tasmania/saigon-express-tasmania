import { DashboardLayout } from '@/components/layout';
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
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2" asChild>
                <Link to={listPath}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to {dataset.pageLabel.toLowerCase()}
                </Link>
              </Button>
              <CardTitle>
                {dataset.entityNameTitle} #{orderId}
              </CardTitle>
              <CardDescription>
                Review {dataset.entityName} details. All sections are shown below.
              </CardDescription>
            </div>
            {order ? (
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void openFulfill()}
                  disabled={saving || loading}
                  aria-label={`Fulfill order ${order.id}`}
                  title="Fulfill"
                >
                  <PackageCheck className="h-4 w-4" />
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
          <CardContent>
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
