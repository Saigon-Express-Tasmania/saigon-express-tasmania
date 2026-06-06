import {
  PendingPartnerCard,
  PendingPartnerCardSkeleton,
} from '@/components/partners/PendingPartnerCard';
import { pendingPartnersRemainingMessage } from '@/lib/partner-profiles';
import type { UserProfile } from '@/types/UserProfile';

export type PendingPartnersListProps = {
  partners: UserProfile[];
  totalCount: number;
  limit: number;
  loading: boolean;
  confirmingId: string | null;
  confirmPromptId: string | null;
  onConfirmPromptToggle: (partnerId: string) => void;
  onConfirmPromptClose: () => void;
  onConfirm: (partner: UserProfile) => void;
  onEdit?: (partner: UserProfile) => void;
  onDelete?: (partner: UserProfile) => void;
  skeletonCount?: number;
  showHeader?: boolean;
  emptyMessage?: string;
};

export function PendingPartnersList({
  partners,
  totalCount,
  limit,
  loading,
  confirmingId,
  confirmPromptId,
  onConfirmPromptToggle,
  onConfirmPromptClose,
  onConfirm,
  onEdit,
  onDelete,
  skeletonCount = 3,
  showHeader = true,
  emptyMessage = 'No pending confirmations.',
}: PendingPartnersListProps) {
  const remainingMessage = pendingPartnersRemainingMessage(partners.length, totalCount);
  const summaryMessage =
    totalCount > 0
      ? `Showing ${Math.min(partners.length, limit)} of ${totalCount} pending ${
          totalCount === 1 ? 'registration' : 'registrations'
        }.`
      : null;

  if (loading) {
    return (
      <div className="space-y-3">
        {showHeader ? (
          <div className="space-y-1">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-56 animate-pulse rounded bg-muted" />
          </div>
        ) : null}
        <div className="space-y-2">
          {Array.from({ length: skeletonCount }, (_, index) => (
            <PendingPartnerCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (totalCount === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {showHeader ? (
        <div>
          <h3 className="text-sm font-semibold">Pending confirmation</h3>
        </div>
      ) : null}
      {summaryMessage ? (
        <p className="text-xs text-muted-foreground">{summaryMessage}</p>
      ) : null}

      <div className="space-y-2">
        {partners.map((partner) => (
          <PendingPartnerCard
            key={partner.id}
            partner={partner}
            confirmingId={confirmingId}
            confirmPromptId={confirmPromptId}
            onConfirmPromptToggle={onConfirmPromptToggle}
            onConfirmPromptClose={onConfirmPromptClose}
            onConfirm={onConfirm}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {remainingMessage ? (
        <p className="text-xs text-muted-foreground">{remainingMessage}</p>
      ) : null}
    </div>
  );
}
