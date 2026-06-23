'use client';

import { FeedbackViewDialog } from '@/components/feedbacks/FeedbackViewDialog';
import { PendingFeedbacksList } from '@/components/feedbacks/PendingFeedbacksList';
import {
  DashboardSectionCard,
  DashboardViewAllLink,
} from '@/components/dashboard/DashboardSectionCard';
import { DashboardRefreshTableButton } from '@/components/ui/refresh-table-button';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  DASHBOARD_PENDING_FEEDBACKS_LIMIT,
  fetchUnresolvedFeedbacks,
  updateFeedbackStatus,
} from '@/lib/feedbacks';
import type { Feedback, FeedbackStatus } from '@/types/Feedback';
import { MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function PendingFeedbacks() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewTarget, setViewTarget] = useState<Feedback | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchUnresolvedFeedbacks({
        limit: DASHBOARD_PENDING_FEEDBACKS_LIMIT,
      });
      setFeedbacks(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load unresolved feedback.',
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
    feedback: Feedback,
    status: FeedbackStatus,
  ) => {
    setSaving(true);
    try {
      const updated = await updateFeedbackStatus(feedback.id, status);
      toast.success(`Feedback marked as ${status}.`);

      if (status === 'resolved') {
        setViewTarget(null);
        await loadPending();
        return;
      }

      setFeedbacks((prev) =>
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
        title="Unresolved feedback"
        description="FAQ submissions that still need review or resolution."
        icon={MessageSquare}
        accent="violet"
        action={
          <div className="flex items-center gap-2">
            <DashboardRefreshTableButton
              onClick={() => void loadPending()}
              disabled={loading || profileLoading}
            />
            {!loading && totalCount > 0 ? (
              <DashboardViewAllLink>
                <Link to="/feedbacks">View all</Link>
              </DashboardViewAllLink>
            ) : null}
          </div>
        }
      >
        <PendingFeedbacksList
          feedbacks={feedbacks}
          totalCount={totalCount}
          limit={DASHBOARD_PENDING_FEEDBACKS_LIMIT}
          loading={loading || profileLoading}
          onView={setViewTarget}
          skeletonCount={3}
          emptyMessage="No unresolved feedback submissions."
        />
      </DashboardSectionCard>

      <FeedbackViewDialog
        feedback={viewTarget}
        open={viewTarget !== null}
        saving={saving}
        onOpenChange={(open) => !open && setViewTarget(null)}
        onStatusChange={(feedback, status) =>
          void handleStatusChange(feedback, status)
        }
      />
    </div>
  );
}
