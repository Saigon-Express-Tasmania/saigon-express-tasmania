import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatPartnerDate,
  partnerDisplayName,
} from '@/lib/partner-profiles';
import type { UserProfile } from '@/types/UserProfile';
import { CheckCircle2, Loader2, Pencil, Trash2 } from 'lucide-react';

export type PendingPartnerCardProps = {
  partner: UserProfile;
  confirmingId: string | null;
  confirmPromptId: string | null;
  onConfirmPromptToggle: (partnerId: string) => void;
  onConfirmPromptClose: () => void;
  onConfirm: (partner: UserProfile) => void;
  onEdit?: (partner: UserProfile) => void;
  onDelete?: (partner: UserProfile) => void;
};

export function PendingPartnerCard({
  partner,
  confirmingId,
  confirmPromptId,
  onConfirmPromptToggle,
  onConfirmPromptClose,
  onConfirm,
  onEdit,
  onDelete,
}: PendingPartnerCardProps) {
  const metadataFields = [
    partner.email ?? '—',
    partner.business_name,
    partner.phone,
    formatPartnerDate(partner.created_at),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium">
            {partnerDisplayName(partner)}
          </p>
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            Pending
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
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <div className="relative">
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onConfirmPromptToggle(partner.id)}
            disabled={confirmingId === partner.id}
          >
            {confirmingId === partner.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                Confirm
              </>
            )}
          </Button>
          {confirmPromptId === partner.id ? (
            <div
              role="tooltip"
              className="absolute bottom-full right-0 z-10 mb-1 flex items-center gap-1.5 rounded-md border bg-popover px-2 py-1.5 text-popover-foreground shadow-md"
            >
              <span className="whitespace-nowrap text-xs">Confirm partner?</span>
              <Button
                type="button"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onConfirm(partner)}
                disabled={confirmingId === partner.id}
              >
                {confirmingId === partner.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  'Yes'
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={onConfirmPromptClose}
                disabled={confirmingId === partner.id}
              >
                No
              </Button>
            </div>
          ) : null}
        </div>
        {onEdit ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={() => {
              onConfirmPromptClose();
              onEdit(partner);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={() => {
              onConfirmPromptClose();
              onDelete(partner);
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function PendingPartnerCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="h-4 w-14 rounded bg-muted" />
        </div>
        <div className="h-3 w-full max-w-md rounded bg-muted" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-7 w-20 rounded bg-muted" />
        <div className="h-7 w-7 rounded bg-muted" />
        <div className="h-7 w-7 rounded bg-muted" />
      </div>
    </div>
  );
}
