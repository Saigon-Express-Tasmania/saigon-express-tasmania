import { DashboardLayout } from '@/components/layout';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { PendingCateringOrders } from '@/pages/Dashboard/PendingCateringOrders';
import { PendingFeedbacks } from '@/pages/Dashboard/PendingFeedbacks';
import { PendingInterests } from '@/pages/Dashboard/PendingInterests';
import { PendingWholesaleMembers } from '@/pages/Dashboard/PendingWholesaleMembers';
import { ReadyOrders } from '@/pages/Dashboard/ReadyOrders';

export function Dashboard() {
  const { user } = useSupabaseAuth();

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>
              Signed in as <strong>{user?.email}</strong>
            </CardDescription>
          </CardHeader>
        </Card>

        <PendingWholesaleMembers />

        <div className="xl:col-span-2">
          <ReadyOrders />
        </div>

        <div className="xl:col-span-2">
          <PendingCateringOrders />
        </div>

        <div>
          <PendingInterests />
        </div>

        <div>
          <PendingFeedbacks />
        </div>
      </div>
    </DashboardLayout>
  );
}
