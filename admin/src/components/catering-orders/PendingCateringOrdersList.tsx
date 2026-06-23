import { Button } from '@/components/ui/button';
import {
  DashboardDataTable,
  DashboardTruncate,
  dashboardTdClass,
  dashboardThClass,
} from '@/components/dashboard/DashboardDataTable';
import {
  formatPendingCateringOrderDate,
  formatPendingCateringOrderTotal,
  pendingCateringOrdersRemainingMessage,
  type PendingCateringOrder,
} from '@/lib/pending-catering-orders';
import { salesOrderDetailsLink } from '@/pages/Sales/orderType';
import { formatTargetDateDisplay } from '@/pages/Sales/salesOrderDb';
import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export type PendingCateringOrdersListProps = {
  orders: PendingCateringOrder[];
  totalCount: number;
  limit: number;
  loading: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
};

function PendingCateringOrdersTableSkeleton({ rows }: { rows: number }) {
  return (
    <DashboardDataTable>
      <thead>
        <tr className="border-b bg-muted/50">
          {['Customer', 'Event', 'Total', ''].map((label) => (
            <th key={label || 'actions'} className={dashboardThClass}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, index) => (
          <tr key={index} className="border-b">
            {Array.from({ length: 4 }, (_, cellIndex) => (
              <td key={cellIndex} className={dashboardTdClass}>
                <div className="h-4 animate-pulse rounded bg-muted" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </DashboardDataTable>
  );
}

export function PendingCateringOrdersList({
  orders,
  totalCount,
  limit,
  loading,
  skeletonCount = 3,
  emptyMessage = 'No pending catering orders.',
}: PendingCateringOrdersListProps) {
  const remainingMessage = pendingCateringOrdersRemainingMessage(
    orders.length,
    totalCount,
  );
  const summaryMessage =
    totalCount > 0
      ? `Showing ${Math.min(orders.length, limit)} of ${totalCount} pending ${
          totalCount === 1 ? 'order' : 'orders'
        }.`
      : null;

  if (loading) {
    return <PendingCateringOrdersTableSkeleton rows={skeletonCount} />;
  }

  if (totalCount === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {summaryMessage ? (
        <p className="text-xs text-muted-foreground">{summaryMessage}</p>
      ) : null}

      <DashboardDataTable>
        <colgroup>
          <col className="w-[46%]" />
          <col className="w-[24%]" />
          <col className="w-[18%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead>
          <tr className="border-b bg-muted/50">
            <th className={dashboardThClass}>Customer</th>
            <th className={dashboardThClass}>Event</th>
            <th className={dashboardThClass}>Total</th>
            <th className={`${dashboardThClass} text-right`}> </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b transition-colors hover:bg-muted/50"
            >
              <td className={dashboardTdClass}>
                <DashboardTruncate title={order.customer_name}>
                  <span className="font-medium">{order.customer_name}</span>
                </DashboardTruncate>
                <DashboardTruncate title={order.customer_email}>
                  <span className="text-muted-foreground">{order.customer_email}</span>
                </DashboardTruncate>
                <DashboardTruncate title={formatPendingCateringOrderDate(order.created_at)}>
                  <span className="text-[11px] text-muted-foreground">
                    Submitted {formatPendingCateringOrderDate(order.created_at)}
                  </span>
                </DashboardTruncate>
              </td>
              <td className={`${dashboardTdClass} text-muted-foreground`}>
                <DashboardTruncate
                  title={formatTargetDateDisplay(order.requested_target_date)}
                >
                  {formatTargetDateDisplay(order.requested_target_date)}
                </DashboardTruncate>
              </td>
              <td className={`${dashboardTdClass} tabular-nums`}>
                {formatPendingCateringOrderTotal(order.grand_total)}
              </td>
              <td className={dashboardTdClass}>
                <div className="flex justify-end">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0"
                  >
                    <Link
                      to={salesOrderDetailsLink('live', 'catering', order.id)}
                      aria-label={`View catering order ${order.id}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DashboardDataTable>

      {remainingMessage ? (
        <p className="text-xs text-muted-foreground">{remainingMessage}</p>
      ) : null}
    </div>
  );
}
