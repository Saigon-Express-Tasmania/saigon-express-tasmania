'use client';

import { PendingWholesaleEnquiriesList } from '@/components/interests/PendingWholesaleEnquiriesList';
import { WholesaleEnquiryViewDialog } from '@/components/interests/WholesaleEnquiryViewDialog';
import {
  DashboardSectionCard,
  DashboardViewAllLink,
} from '@/components/dashboard/DashboardSectionCard';
import { DashboardRefreshTableButton } from '@/components/ui/refresh-table-button';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  DASHBOARD_PENDING_WHOLESALE_ENQUIRIES_LIMIT,
  fetchPendingWholesaleEnquiries,
  updateWholesaleEnquiryStatus,
  type InterestStatus,
  type PendingWholesaleEnquiry,
} from '@/lib/pending-wholesale-enquiries';
import { Truck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function PendingWholesaleEnquiries() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [enquiries, setEnquiries] = useState<PendingWholesaleEnquiry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewTarget, setViewTarget] = useState<PendingWholesaleEnquiry | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPendingWholesaleEnquiries({
        limit: DASHBOARD_PENDING_WHOLESALE_ENQUIRIES_LIMIT,
      });
      setEnquiries(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load pending wholesale enquiries.',
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

  const handleStatusChange = async (
    enquiry: PendingWholesaleEnquiry,
    status: InterestStatus,
  ) => {
    setSaving(true);
    try {
      await updateWholesaleEnquiryStatus(enquiry.id, status);
      toast.success(`Wholesale enquiry marked as ${status}.`);

      if (status !== 'pending') {
        setViewTarget(null);
        await loadPending();
        return;
      }

      const updated = { ...enquiry, status };
      setEnquiries((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setViewTarget((prev) => (prev?.id === updated.id ? updated : prev));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update status.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!profileLoading && !isAdmin) {
    return null;
  }

  return (
    <div className="h-full">
      <DashboardSectionCard
        title="Pending wholesale enquiries"
        description="Partnership applications awaiting review and follow-up."
        icon={Truck}
        accent="sky"
        action={
          <div className="flex items-center gap-2">
            <DashboardRefreshTableButton
              onClick={() => void loadPending()}
              disabled={loading || profileLoading}
            />
            {!loading && totalCount > 0 ? (
              <DashboardViewAllLink>
                <Link to="/wholesale_enquiries">View all</Link>
              </DashboardViewAllLink>
            ) : null}
          </div>
        }
      >
        <PendingWholesaleEnquiriesList
          enquiries={enquiries}
          totalCount={totalCount}
          limit={DASHBOARD_PENDING_WHOLESALE_ENQUIRIES_LIMIT}
          loading={loading || profileLoading}
          onView={setViewTarget}
          skeletonCount={3}
          emptyMessage="No pending wholesale enquiries."
        />
      </DashboardSectionCard>

      <WholesaleEnquiryViewDialog
        enquiry={viewTarget}
        open={viewTarget !== null}
        saving={saving}
        onOpenChange={(open) => !open && setViewTarget(null)}
        onStatusChange={(enquiry, status) =>
          void handleStatusChange(enquiry, status)
        }
      />
    </div>
  );
}
