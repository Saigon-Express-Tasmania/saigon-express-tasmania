'use client';

import { FranchiseInterestViewDialog } from '@/components/interests/FranchiseInterestViewDialog';
import { PendingFranchiseInterestsList } from '@/components/interests/PendingFranchiseInterestsList';
import {
  DashboardSectionCard,
  DashboardViewAllLink,
} from '@/components/dashboard/DashboardSectionCard';
import { DashboardRefreshTableButton } from '@/components/ui/refresh-table-button';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  DASHBOARD_PENDING_FRANCHISE_INTERESTS_LIMIT,
  fetchPendingFranchiseInterests,
  updateFranchiseInterestStatus,
  type InterestStatus,
  type PendingFranchiseInterest,
} from '@/lib/pending-franchise-interests';
import { Building2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function PendingInterests() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [interests, setInterests] = useState<PendingFranchiseInterest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewTarget, setViewTarget] = useState<PendingFranchiseInterest | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPendingFranchiseInterests({
        limit: DASHBOARD_PENDING_FRANCHISE_INTERESTS_LIMIT,
      });
      setInterests(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load pending franchise interests.',
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
    interest: PendingFranchiseInterest,
    status: InterestStatus,
  ) => {
    setSaving(true);
    try {
      await updateFranchiseInterestStatus(interest.id, status);
      toast.success(`Franchise interest marked as ${status}.`);

      if (status !== 'pending') {
        setViewTarget(null);
        await loadPending();
        return;
      }

      const updated = { ...interest, status };
      setInterests((prev) =>
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
        title="Pending franchise interests"
        description="Franchise enquiries awaiting review and follow-up."
        icon={Building2}
        accent="rose"
        action={
          <div className="flex items-center gap-2">
            <DashboardRefreshTableButton
              onClick={() => void loadPending()}
              disabled={loading || profileLoading}
            />
            {!loading && totalCount > 0 ? (
              <DashboardViewAllLink>
                <Link to="/interests/franchise">View all</Link>
              </DashboardViewAllLink>
            ) : null}
          </div>
        }
      >
        <PendingFranchiseInterestsList
          interests={interests}
          totalCount={totalCount}
          limit={DASHBOARD_PENDING_FRANCHISE_INTERESTS_LIMIT}
          loading={loading || profileLoading}
          onView={setViewTarget}
          skeletonCount={3}
          emptyMessage="No pending franchise interest submissions."
        />
      </DashboardSectionCard>

      <FranchiseInterestViewDialog
        interest={viewTarget}
        open={viewTarget !== null}
        saving={saving}
        onOpenChange={(open) => !open && setViewTarget(null)}
        onStatusChange={(interest, status) =>
          void handleStatusChange(interest, status)
        }
      />
    </div>
  );
}
