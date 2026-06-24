import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatFranchiseInterestDate,
  franchiseInterestStatusBadgeClass,
  type PendingFranchiseInterest,
} from '@/lib/pending-franchise-interests';
import { Loader2, Trash2 } from 'lucide-react';

export type ApprovedFranchiseInterestsListProps = {
  interests: PendingFranchiseInterest[];
  loading: boolean;
  actionInProgressId: number | null;
  onCreateAccount: (interest: PendingFranchiseInterest) => void;
  onDelete: (interest: PendingFranchiseInterest) => void;
  emptyMessage?: string;
};

function ApprovedFranchiseInterestSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="h-7 w-7 shrink-0 rounded bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
        <div className="h-3 w-full max-w-md rounded bg-muted" />
      </div>
      <div className="h-7 w-28 shrink-0 rounded bg-muted sm:ml-auto" />
    </div>
  );
}

export function ApprovedFranchiseInterestsList({
  interests,
  loading,
  actionInProgressId,
  onCreateAccount,
  onDelete,
  emptyMessage = 'No approved franchise interests.',
}: ApprovedFranchiseInterestsListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, index) => (
          <ApprovedFranchiseInterestSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (interests.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {interests.map((interest) => {
        const metadataFields = [
          interest.email,
          interest.phone,
          [interest.city, interest.state].filter(Boolean).join(', ') || null,
          formatFranchiseInterestDate(interest.created_at),
        ].filter(Boolean);

        return (
          <div
            key={interest.id}
            className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
          >
            <div className="flex shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => onDelete(interest)}
                disabled={actionInProgressId === interest.id}
                aria-label={`Delete franchise interest ${interest.id}`}
              >
                {actionInProgressId === interest.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-medium">{interest.full_name}</p>
                <Badge
                  variant="secondary"
                  className={franchiseInterestStatusBadgeClass(interest.status)}
                >
                  {interest.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center text-xs text-muted-foreground">
                {metadataFields.map((field, index) => (
                  <span key={index} className="inline-flex items-center">
                    {index > 0 ? (
                      <span
                        className="mx-3 text-base leading-none text-muted-foreground/60"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                    ) : null}
                    {field}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5 sm:ml-auto">
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onCreateAccount(interest)}
                disabled={actionInProgressId === interest.id}
              >
                Create Account
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
