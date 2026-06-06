import { DashboardLayout } from '@/components/layout';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { PendingWholesaleMembers } from '@/pages/Dashboard/PendingWholesaleMembers';

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
      </div>
    </DashboardLayout>
  );
}
