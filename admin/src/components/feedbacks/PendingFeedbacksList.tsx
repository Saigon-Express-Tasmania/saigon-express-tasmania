import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DashboardDataTable,
  DashboardTruncate,
  dashboardTdClass,
  dashboardThClass,
} from '@/components/dashboard/DashboardDataTable';
import {
  formatFeedbackDate,
  pendingFeedbacksRemainingMessage,
  statusBadgeVariant,
  truncateFeedbackText,
} from '@/lib/feedbacks';
import type { Feedback } from '@/types/Feedback';
import { Eye } from 'lucide-react';

export type PendingFeedbacksListProps = {
  feedbacks: Feedback[];
  totalCount: number;
  limit: number;
  loading: boolean;
  onView: (feedback: Feedback) => void;
  skeletonCount?: number;
  emptyMessage?: string;
};

function PendingFeedbacksTableSkeleton({ rows }: { rows: number }) {
  return (
    <DashboardDataTable>
      <thead>
        <tr className="border-b bg-muted/50">
          {['Contact', 'Question', 'Submitted', 'Status', ''].map((label) => (
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

export function PendingFeedbacksList({
  feedbacks,
  totalCount,
  limit,
  loading,
  onView,
  skeletonCount = 3,
  emptyMessage = 'No unresolved feedback submissions.',
}: PendingFeedbacksListProps) {
  const remainingMessage = pendingFeedbacksRemainingMessage(
    feedbacks.length,
    totalCount,
  );
  const summaryMessage =
    totalCount > 0
      ? `Showing ${Math.min(feedbacks.length, limit)} of ${totalCount} unresolved ${
          totalCount === 1 ? 'submission' : 'submissions'
        }.`
      : null;

  if (loading) {
    return <PendingFeedbacksTableSkeleton rows={skeletonCount} />;
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
          <col className="w-[24%]" />
          <col className="w-[38%]" />
          <col className="w-[20%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead>
          <tr className="border-b bg-muted/50">
            <th className={dashboardThClass}>Contact</th>
            <th className={dashboardThClass}>Question</th>
            <th className={dashboardThClass}>Submitted</th>
            <th className={dashboardThClass}>Status</th>
            <th className={`${dashboardThClass} text-right`}> </th>
          </tr>
        </thead>
        <tbody>
          {feedbacks.map((feedback) => (
            <tr
              key={feedback.id}
              className="border-b transition-colors hover:bg-muted/50"
            >
              <td className={dashboardTdClass}>
                <DashboardTruncate title={feedback.name}>
                  <span className="font-medium">{feedback.name}</span>
                </DashboardTruncate>
                {feedback.email ? (
                  <DashboardTruncate title={feedback.email}>
                    <span className="text-muted-foreground">{feedback.email}</span>
                  </DashboardTruncate>
                ) : null}
              </td>
              <td className={`${dashboardTdClass} text-muted-foreground`}>
                <DashboardTruncate title={feedback.question}>
                  {truncateFeedbackText(feedback.question, 80)}
                </DashboardTruncate>
              </td>
              <td className={`${dashboardTdClass} text-muted-foreground`}>
                <DashboardTruncate title={formatFeedbackDate(feedback.created_at)}>
                  {formatFeedbackDate(feedback.created_at)}
                </DashboardTruncate>
              </td>
              <td className={dashboardTdClass}>
                <Badge variant={statusBadgeVariant(feedback.status)}>
                  {feedback.status}
                </Badge>
              </td>
              <td className={dashboardTdClass}>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0"
                    onClick={() => onView(feedback)}
                    aria-label={`View feedback ${feedback.id}`}
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
