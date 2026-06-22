'use client';

import { PendingCateringOrdersList } from '@/components/catering-orders/PendingCateringOrdersList';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  DASHBOARD_PENDING_CATERING_ORDERS_LIMIT,
  fetchPendingCateringOrders,
  type PendingCateringOrder,
} from '@/lib/pending-catering-orders';
import { salesPagePath } from '@/pages/Sales/orderType';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function PendingCateringOrders() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [orders, setOrders] = useState<PendingCateringOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPendingCateringOrders({
        limit: DASHBOARD_PENDING_CATERING_ORDERS_LIMIT,
      });
      setOrders(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load pending catering orders.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading && isAdmin) {
      void loadPending();
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [profileLoading, isAdmin, loadPending]);

  if (!profileLoading && !isAdmin) {
    return null;
  }

  return (
    <Card className="overflow-visible">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Pending catering orders</CardTitle>
          <CardDescription>
            New catering orders awaiting review and quote.
          </CardDescription>
        </div>
        {!loading && totalCount > 0 ? (
          <Button asChild variant="outline" size="sm">
            <Link to={salesPagePath('orders', 'catering')}>View all</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <PendingCateringOrdersList
          orders={orders}
          totalCount={totalCount}
          limit={DASHBOARD_PENDING_CATERING_ORDERS_LIMIT}
          loading={loading || profileLoading}
          skeletonCount={3}
          emptyMessage="No pending catering orders."
        />
      </CardContent>
    </Card>
  );
}
