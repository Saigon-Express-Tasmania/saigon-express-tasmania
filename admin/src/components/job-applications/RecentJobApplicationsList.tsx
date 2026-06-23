import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DashboardDataTable,
  DashboardTruncate,
  dashboardTdClass,
  dashboardThClass,
} from '@/components/dashboard/DashboardDataTable';
import {
  buildApplicantName,
  formatJobApplicationDate,
  jobApplicationStatusBadgeClass,
  recentJobApplicationsRemainingMessage,
} from '@/lib/job-applications';
import type { JobApplication } from '@/types/JobApplication';
import { Eye } from 'lucide-react';

export type RecentJobApplicationsListProps = {
  applications: JobApplication[];
  totalCount: number;
  limit: number;
  loading: boolean;
  onView: (application: JobApplication) => void;
  skeletonCount?: number;
  emptyMessage?: string;
};

function RecentJobApplicationsTableSkeleton({ rows }: { rows: number }) {
  return (
    <DashboardDataTable>
      <thead>
        <tr className="border-b bg-muted/50">
          {['Applicant', 'Role', 'Submitted', 'Status', ''].map((label) => (
            <th key={label || 'actions'} className={dashboardThClass}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, index) => (
          <tr key={index} className="border-b">
            {Array.from({ length: 5 }, (_, cellIndex) => (
              <td key={cellIndex} className={dashboardTdClass}>
                <div className="h-4 animate-pulse rounded bg-muted" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </DashboardDataTable>
  );
}

export function RecentJobApplicationsList({
  applications,
  totalCount,
  limit,
  loading,
  onView,
  skeletonCount = 3,
  emptyMessage = 'No job applications yet.',
}: RecentJobApplicationsListProps) {
  const remainingMessage = recentJobApplicationsRemainingMessage(
    applications.length,
    totalCount,
  );
  const summaryMessage =
    totalCount > 0
      ? `Showing ${Math.min(applications.length, limit)} of ${totalCount} ${
          totalCount === 1 ? 'application' : 'applications'
        }.`
      : null;

  if (loading) {
    return <RecentJobApplicationsTableSkeleton rows={skeletonCount} />;
  }

  if (totalCount === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {summaryMessage ? (
        <p className="text-xs text-muted-foreground">{summaryMessage}</p>
      ) : null}

      <DashboardDataTable>
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[28%]" />
          <col className="w-[20%]" />
          <col className="w-[14%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead>
          <tr className="border-b bg-muted/50">
            <th className={dashboardThClass}>Applicant</th>
            <th className={dashboardThClass}>Role</th>
            <th className={dashboardThClass}>Submitted</th>
            <th className={dashboardThClass}>Status</th>
            <th className={`${dashboardThClass} text-right`}> </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr
              key={application.id}
              className="border-b transition-colors hover:bg-muted/50"
            >
              <td className={dashboardTdClass}>
                <DashboardTruncate title={buildApplicantName(application)}>
                  <span className="font-medium">
                    {buildApplicantName(application)}
                  </span>
                </DashboardTruncate>
                <DashboardTruncate title={application.email}>
                  <span className="text-muted-foreground">{application.email}</span>
                </DashboardTruncate>
              </td>
              <td className={dashboardTdClass}>
                <DashboardTruncate title={application.job_title}>
                  {application.job_title}
                </DashboardTruncate>
              </td>
              <td className={`${dashboardTdClass} text-muted-foreground`}>
                <DashboardTruncate
                  title={formatJobApplicationDate(application.created_at)}
                >
                  {formatJobApplicationDate(application.created_at)}
                </DashboardTruncate>
              </td>
              <td className={dashboardTdClass}>
                <Badge
                  variant="secondary"
                  className={jobApplicationStatusBadgeClass(application.status)}
                >
                  {application.status}
                </Badge>
              </td>
              <td className={dashboardTdClass}>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0"
                    onClick={() => onView(application)}
                    aria-label={`View job application ${application.id}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DashboardDataTable>

      {remainingMessage ? (
        <p className="text-xs text-muted-foreground">{remainingMessage}</p>
      ) : null}
    </div>
  );
}
