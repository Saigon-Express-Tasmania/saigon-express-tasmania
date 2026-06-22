'use client';

import { ReadyOrdersList } from '@/components/orders/ReadyOrdersList';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  DASHBOARD_READY_ORDERS_LIMIT,
  fetchReadyOrders,
  type ReadyOrder,
} from '@/lib/ready-orders';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export function ReadyOrders() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [orders, setOrders] = useState<ReadyOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadReadyOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchReadyOrders({
        limit: DASHBOARD_READY_ORDERS_LIMIT,
      });
      setOrders(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to load confirmed orders.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading && isAdmin) {
      void loadReadyOrders();
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [profileLoading, isAdmin, loadReadyOrders]);

  if (!profileLoading && !isAdmin) {
    return null;
  }

  return (
    <Card className="overflow-visible">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Confirmed orders</CardTitle>
          <CardDescription>
            Live orders confirmed and ready for fulfillment.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ReadyOrdersList
          orders={orders}
          totalCount={totalCount}
          limit={DASHBOARD_READY_ORDERS_LIMIT}
          loading={loading || profileLoading}
          skeletonCount={3}
          emptyMessage="No confirmed orders."
        />
      </CardContent>
    </Card>
  );
}
