import { DashboardLayout } from '@/components/layout';
import { DashboardSectionCard } from '@/components/dashboard/DashboardSectionCard';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { PendingCateringOrders } from '@/pages/Dashboard/PendingCateringOrders';
import { PendingFeedbacks } from '@/pages/Dashboard/PendingFeedbacks';
import { PendingInterests } from '@/pages/Dashboard/PendingInterests';
import { PendingWholesaleEnquiries } from '@/pages/Dashboard/PendingWholesaleEnquiries';
import { PendingWholesaleMembers } from '@/pages/Dashboard/PendingWholesaleMembers';
import { ReadyOrders } from '@/pages/Dashboard/ReadyOrders';
import { Sparkles } from 'lucide-react';

export function Dashboard() {
  const { user } = useSupabaseAuth();

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <DashboardSectionCard
          title="Welcome back!"
          description={
            user?.email
              ? `Signed in as ${user.email}`
              : 'Manage orders, partners, and enquiries from here.'
          }
          icon={Sparkles}
          accent="indigo"
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            Use the sidebar to jump into sales, wholesale, catering, and content
            tools. Pending items that need attention are listed below.
          </p>
        </DashboardSectionCard>

        <div className="h-full min-w-0">
          <PendingWholesaleMembers />
        </div>

        <div className="h-full min-w-0">
          <ReadyOrders />
        </div>

        <div className="h-full min-w-0">
          <PendingCateringOrders />
        </div>

        <div className="h-full min-w-0">
          <PendingInterests />
        </div>

        <div className="h-full min-w-0">
          <PendingWholesaleEnquiries />
        </div>

        <div className="h-full min-w-0 lg:col-span-2">
          <PendingFeedbacks />
        </div>
      </div>
    </DashboardLayout>
  );
}
