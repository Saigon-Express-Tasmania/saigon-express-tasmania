import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import type { SalesOrderRow } from './salesOrderShared';

type SalesOrdersTableProps = {
  orders: SalesOrderRow[];
  saving: boolean;
  onView: (order: SalesOrderRow) => void;
  onEdit: (order: SalesOrderRow) => void;
  onDelete: (order: SalesOrderRow) => void;
};

export function SalesOrdersTable({
  orders,
  saving,
  onView,
  onEdit,
  onDelete,
}: SalesOrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">Pickup</th>
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
              <td className="px-4 py-3 text-sm text-muted-foreground">{order.pickup_time}</td>
              <td className="px-4 py-3 text-sm">${Number(order.total).toFixed(2)}</td>
              <td className="px-4 py-3">
                <Badge variant={order.status === 'cancelled' ? 'secondary' : 'default'}>
                  {order.status}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                  {order.payment_status}
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
