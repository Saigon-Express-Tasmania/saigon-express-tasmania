import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatReadyOrderTotal,
  readyOrdersRemainingMessage,
  type ReadyOrder,
} from '@/lib/ready-orders';
import {
  formatOrderTypeLabel,
  isOrderType,
  salesOrderDetailsLink,
} from '@/pages/Sales/orderType';
import { formatTargetDateDisplay } from '@/pages/Sales/salesOrderDb';
import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export type ReadyOrdersListProps = {
  orders: ReadyOrder[];
  totalCount: number;
  limit: number;
  loading: boolean;
  skeletonCount?: number;
  emptyMessage?: string;
};

function ReadyOrdersTableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {['ID', 'Type', 'Customer', 'Target date', 'Total', 'Status', ''].map(
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

export function ReadyOrdersList({
  orders,
  totalCount,
  limit,
  loading,
  skeletonCount = 3,
  emptyMessage = 'No confirmed orders.',
}: ReadyOrdersListProps) {
  const remainingMessage = readyOrdersRemainingMessage(orders.length, totalCount);
  const summaryMessage =
    totalCount > 0
      ? `Showing ${Math.min(orders.length, limit)} of ${totalCount} confirmed ${
          totalCount === 1 ? 'order' : 'orders'
        }, sorted by target date.`
      : null;

  if (loading) {
    return <ReadyOrdersTableSkeleton rows={skeletonCount} />;
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
              <th className="px-3 py-2 text-left text-sm font-semibold">Type</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Customer</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Target date</th>
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
                  <Badge variant="secondary">
                    {isOrderType(order.order_type)
                      ? formatOrderTypeLabel(order.order_type)
                      : order.order_type}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-sm">
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-muted-foreground">{order.customer_email}</p>
                </td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                  {formatTargetDateDisplay(order.requested_target_date)}
                </td>
                <td className="px-3 py-2 text-sm tabular-nums">
                  {formatReadyOrderTotal(order.grand_total)}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="default">{order.status}</Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    {isOrderType(order.order_type) ? (
                      <Button asChild variant="outline" size="sm">
                        <Link
                          to={salesOrderDetailsLink('live', order.order_type, order.id)}
                          aria-label={`View order ${order.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled aria-hidden>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
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
