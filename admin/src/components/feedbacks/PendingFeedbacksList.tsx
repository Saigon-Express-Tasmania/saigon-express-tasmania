import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {['ID', 'Name', 'Email', 'Question', 'Status', 'Submitted', ''].map(
              (label) => (
                <th
                  key={label || 'actions'}
                  className="px-3 py-2 text-left text-sm font-semibold"
                >
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, index) => (
            <tr key={index} className="border-b">
              {Array.from({ length: 7 }, (_, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2">
                  <div className="h-4 animate-pulse rounded bg-muted" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left text-sm font-semibold">ID</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Name</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Email</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">
                Question
              </th>
              <th className="px-3 py-2 text-left text-sm font-semibold">
                Status
              </th>
              <th className="px-3 py-2 text-left text-sm font-semibold">
                Submitted
              </th>
              <th className="px-3 py-2 text-right text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((feedback) => (
              <tr
                key={feedback.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="px-3 py-2 font-mono text-sm">{feedback.id}</td>
                <td className="px-3 py-2 text-sm font-medium">{feedback.name}</td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                  {feedback.email ?? '—'}
                </td>
                <td className="max-w-xs px-3 py-2 text-sm text-muted-foreground">
                  {truncateFeedbackText(feedback.question, 60)}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={statusBadgeVariant(feedback.status)}>
                    {feedback.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                  {formatFeedbackDate(feedback.created_at)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(feedback)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {remainingMessage ? (
        <p className="text-xs text-muted-foreground">{remainingMessage}</p>
      ) : null}
    </div>
  );
}
