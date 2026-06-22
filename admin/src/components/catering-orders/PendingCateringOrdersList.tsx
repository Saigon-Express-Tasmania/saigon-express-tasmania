import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {['ID', 'Customer', 'Submitted', 'Event date', 'Total', 'Status', ''].map(
              (label) => (
                <th
                  key={label || 'actions'}
                  className="px-3 py-2 text-left text-sm font-semibold"
                >
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, index) => (
            <tr key={index} className="border-b">
              {Array.from({ length: 7 }, (_, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2">
                  <div className="h-4 animate-pulse rounded bg-muted" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left text-sm font-semibold">ID</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Customer</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Submitted</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Event date</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Total</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Status</th>
              <th className="px-3 py-2 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="px-3 py-2 font-mono text-sm">{order.id}</td>
                <td className="px-3 py-2 text-sm">
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-muted-foreground">{order.customer_email}</p>
                </td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                  {formatPendingCateringOrderDate(order.created_at)}
                </td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                  {formatTargetDateDisplay(order.requested_target_date)}
                </td>
                <td className="px-3 py-2 text-sm tabular-nums">
                  {formatPendingCateringOrderTotal(order.grand_total)}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{order.status}</Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={salesOrderDetailsLink('live', 'catering', order.id)}
                        aria-label={`View catering order ${order.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {remainingMessage ? (
        <p className="text-xs text-muted-foreground">{remainingMessage}</p>
      ) : null}
    </div>
  );
}
