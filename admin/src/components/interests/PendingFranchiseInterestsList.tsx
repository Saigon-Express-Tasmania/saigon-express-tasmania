import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatFranchiseInterestDate,
  franchiseInterestStatusBadgeClass,
  pendingFranchiseInterestsRemainingMessage,
  type PendingFranchiseInterest,
} from '@/lib/pending-franchise-interests';
import { Eye } from 'lucide-react';

export type PendingFranchiseInterestsListProps = {
  interests: PendingFranchiseInterest[];
  totalCount: number;
  limit: number;
  loading: boolean;
  onView: (interest: PendingFranchiseInterest) => void;
  skeletonCount?: number;
  emptyMessage?: string;
};

function PendingFranchiseInterestsTableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {['ID', 'Name', 'Email', 'Budget', 'Status', 'Submitted', ''].map(
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

export function PendingFranchiseInterestsList({
  interests,
  totalCount,
  limit,
  loading,
  onView,
  skeletonCount = 3,
  emptyMessage = 'No pending franchise interest submissions.',
}: PendingFranchiseInterestsListProps) {
  const remainingMessage = pendingFranchiseInterestsRemainingMessage(
    interests.length,
    totalCount,
  );
  const summaryMessage =
    totalCount > 0
      ? `Showing ${Math.min(interests.length, limit)} of ${totalCount} pending ${
          totalCount === 1 ? 'submission' : 'submissions'
        }.`
      : null;

  if (loading) {
    return <PendingFranchiseInterestsTableSkeleton rows={skeletonCount} />;
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
              <th className="px-3 py-2 text-left text-sm font-semibold">Budget</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Status</th>
              <th className="px-3 py-2 text-left text-sm font-semibold">Submitted</th>
              <th className="px-3 py-2 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {interests.map((interest) => (
              <tr
                key={interest.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="px-3 py-2 font-mono text-sm">{interest.id}</td>
                <td className="px-3 py-2 text-sm font-medium">{interest.full_name}</td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                  {interest.email}
                </td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                  {interest.investment_budget ?? '—'}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant="secondary"
                    className={franchiseInterestStatusBadgeClass(interest.status)}
                  >
                    {interest.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-sm text-muted-foreground">
                  {formatFranchiseInterestDate(interest.created_at)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(interest)}
                      aria-label={`View franchise interest ${interest.id}`}
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
