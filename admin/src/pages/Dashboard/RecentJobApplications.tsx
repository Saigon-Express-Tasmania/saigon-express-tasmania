'use client';

import { JobApplicationViewDialog } from '@/components/job-applications/JobApplicationViewDialog';
import { RecentJobApplicationsList } from '@/components/job-applications/RecentJobApplicationsList';
import {
  DashboardSectionCard,
  DashboardViewAllLink,
} from '@/components/dashboard/DashboardSectionCard';
import { DashboardRefreshTableButton } from '@/components/ui/refresh-table-button';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  DASHBOARD_RECENT_JOB_APPLICATIONS_LIMIT,
  fetchRecentJobApplications,
  updateJobApplicationStatus,
} from '@/lib/job-applications';
import type { JobApplication, JobApplicationStatus } from '@/types/JobApplication';
import { Briefcase } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function RecentJobApplications() {
  const { profile, isLoading: profileLoading } = useUserProfile();
  const isAdmin = profile?.user_role === 'admin';

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewTarget, setViewTarget] = useState<JobApplication | null>(null);

  const loadRecent = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRecentJobApplications({
        limit: DASHBOARD_RECENT_JOB_APPLICATIONS_LIMIT,
      });
      setApplications(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to load recent job applications.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading && isAdmin) {
      void loadRecent();
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [profileLoading, isAdmin, loadRecent]);

  const handleStatusChange = async (
    application: JobApplication,
    status: JobApplicationStatus,
  ) => {
    setSaving(true);
    try {
      const updated = await updateJobApplicationStatus(application.id, status);
      toast.success(`Application marked as ${status}.`);
      setApplications((prev) =>
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
        title="Recent job applications"
        description="Latest careers form submissions from the public site."
        icon={Briefcase}
        accent="sky"
        action={
          <div className="flex items-center gap-2">
            <DashboardRefreshTableButton
              onClick={() => void loadRecent()}
              disabled={loading || profileLoading}
            />
            {!loading && totalCount > 0 ? (
              <DashboardViewAllLink>
                <Link to="/job-applications">View all</Link>
              </DashboardViewAllLink>
            ) : null}
          </div>
        }
      >
        <RecentJobApplicationsList
          applications={applications}
          totalCount={totalCount}
          limit={DASHBOARD_RECENT_JOB_APPLICATIONS_LIMIT}
          loading={loading || profileLoading}
          onView={setViewTarget}
          skeletonCount={3}
          emptyMessage="No job applications yet."
        />
      </DashboardSectionCard>

      <JobApplicationViewDialog
        application={viewTarget}
        open={viewTarget !== null}
        saving={saving}
        onOpenChange={(open) => !open && setViewTarget(null)}
        onStatusChange={(application, status) =>
          void handleStatusChange(application, status)
        }
      />
    </div>
  );
}
