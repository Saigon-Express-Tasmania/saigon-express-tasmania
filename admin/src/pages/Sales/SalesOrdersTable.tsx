import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, PackageCheck, Pencil, Trash2 } from 'lucide-react';
import type { OrderType } from './orderType';
import { formatTargetDateDisplay } from './salesOrderDb';
import type { SalesOrderRow } from './salesOrderShared';

type SalesOrdersTableProps = {
  orders: SalesOrderRow[];
  orderType?: OrderType;
  saving: boolean;
  onView: (order: SalesOrderRow) => void;
  onEdit: (order: SalesOrderRow) => void;
  onFulfill: (order: SalesOrderRow) => void;
  onDelete: (order: SalesOrderRow) => void;
};

export function SalesOrdersTable({
  orders,
  orderType,
  saving,
  onView,
  onEdit,
  onFulfill,
  onDelete,
}: SalesOrdersTableProps) {
  const showOrderDate = orderType === 'catering' || orderType === 'wholesale';

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
            {showOrderDate ? (
              <th className="px-4 py-3 text-left text-sm font-semibold">Order date</th>
            ) : null}
            <th className="px-4 py-3 text-left text-sm font-semibold">Target date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Payment</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b transition-colors hover:bg-muted/50">
              <td className="px-4 py-3 font-mono text-sm">{order.id}</td>
              <td className="px-4 py-3 text-sm">
                <p className="font-medium">{order.customer_name}</p>
                <p className="text-muted-foreground">{order.customer_email}</p>
              </td>
              {showOrderDate ? (
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {formatTargetDateDisplay(order.created_at)}
                </td>
              ) : null}
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatTargetDateDisplay(order.requested_target_date)}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums">
                ${Number(order.grand_total).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={order.status === 'cancelled' ? 'secondary' : 'default'}>
                  {order.status}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={order.payment_status === 'paid' ? 'default' : 'secondary'}
                >
                  {order.payment_status ?? 'unpaid'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(order)}
                    disabled={saving}
                    aria-label={`View order ${order.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onFulfill(order)}
                    disabled={saving}
                    aria-label={`Fulfill order ${order.id}`}
                    title="Fulfill"
                  >
                    <PackageCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(order)}
                    disabled={saving}
                    aria-label={`Edit order ${order.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(order)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
