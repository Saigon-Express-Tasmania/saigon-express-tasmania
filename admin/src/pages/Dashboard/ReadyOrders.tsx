'use client';

import { ReadyOrdersList } from '@/components/orders/ReadyOrdersList';
import { DashboardSectionCard } from '@/components/dashboard/DashboardSectionCard';
import { DashboardRefreshTableButton } from '@/components/ui/refresh-table-button';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  DASHBOARD_READY_ORDERS_LIMIT,
  fetchReadyOrders,
  type ReadyOrder,
} from '@/lib/ready-orders';
import { PackageCheck } from 'lucide-react';
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
    <DashboardSectionCard
      title="Confirmed orders"
      description="Live orders confirmed and ready for fulfillment."
      icon={PackageCheck}
      accent="emerald"
      action={
        <DashboardRefreshTableButton
          onClick={() => void loadReadyOrders()}
          disabled={loading || profileLoading}
        />
      }
    >
      <ReadyOrdersList
        orders={orders}
        totalCount={totalCount}
        limit={DASHBOARD_READY_ORDERS_LIMIT}
        loading={loading || profileLoading}
        skeletonCount={3}
        emptyMessage="No confirmed orders."
      />
    </DashboardSectionCard>
  );
}
