import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DashboardDataTable,
  DashboardTruncate,
  dashboardTdClass,
  dashboardThClass,
} from '@/components/dashboard/DashboardDataTable';
import {
  formatFranchiseInterestDate,
  franchiseInterestStatusBadgeClass,
} from '@/lib/pending-franchise-interests';
import {
  pendingWholesaleEnquiriesRemainingMessage,
  type PendingWholesaleEnquiry,
} from '@/lib/pending-wholesale-enquiries';
import { Eye } from 'lucide-react';

export type PendingWholesaleEnquiriesListProps = {
  enquiries: PendingWholesaleEnquiry[];
  totalCount: number;
  limit: number;
  loading: boolean;
  onView: (enquiry: PendingWholesaleEnquiry) => void;
  skeletonCount?: number;
  emptyMessage?: string;
};

function PendingWholesaleEnquiriesTableSkeleton({ rows }: { rows: number }) {
  return (
    <DashboardDataTable>
      <thead>
        <tr className="border-b bg-muted/50">
          {['Contact', 'Business', 'Submitted', 'Status', ''].map((label) => (
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

export function PendingWholesaleEnquiriesList({
  enquiries,
  totalCount,
  limit,
  loading,
  onView,
  skeletonCount = 3,
  emptyMessage = 'No pending wholesale enquiries.',
}: PendingWholesaleEnquiriesListProps) {
  const remainingMessage = pendingWholesaleEnquiriesRemainingMessage(
    enquiries.length,
    totalCount,
  );
  const summaryMessage =
    totalCount > 0
      ? `Showing ${Math.min(enquiries.length, limit)} of ${totalCount} pending ${
          totalCount === 1 ? 'enquiry' : 'enquiries'
        }.`
      : null;

  if (loading) {
    return <PendingWholesaleEnquiriesTableSkeleton rows={skeletonCount} />;
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
          <col className="w-[22%]" />
          <col className="w-[12%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead>
          <tr className="border-b bg-muted/50">
            <th className={dashboardThClass}>Contact</th>
            <th className={dashboardThClass}>Business</th>
            <th className={dashboardThClass}>Submitted</th>
            <th className={dashboardThClass}>Status</th>
            <th className={`${dashboardThClass} text-right`}> </th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((enquiry) => (
            <tr
              key={enquiry.id}
              className="border-b transition-colors hover:bg-muted/50"
            >
              <td className={dashboardTdClass}>
                <DashboardTruncate title={enquiry.full_name}>
                  <span className="font-medium">{enquiry.full_name}</span>
                </DashboardTruncate>
                <DashboardTruncate title={enquiry.email}>
                  <span className="text-muted-foreground">{enquiry.email}</span>
                </DashboardTruncate>
              </td>
              <td className={`${dashboardTdClass} text-muted-foreground`}>
                <DashboardTruncate title={enquiry.business_name ?? undefined}>
                  {enquiry.business_name ?? '—'}
                </DashboardTruncate>
              </td>
              <td className={`${dashboardTdClass} text-muted-foreground`}>
                <DashboardTruncate title={formatFranchiseInterestDate(enquiry.created_at)}>
                  {formatFranchiseInterestDate(enquiry.created_at)}
                </DashboardTruncate>
              </td>
              <td className={dashboardTdClass}>
                <Badge
                  variant="secondary"
                  className={franchiseInterestStatusBadgeClass(enquiry.status)}
                >
                  {enquiry.status}
                </Badge>
              </td>
              <td className={dashboardTdClass}>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0"
                    onClick={() => onView(enquiry)}
                    aria-label={`View wholesale enquiry ${enquiry.id}`}
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
