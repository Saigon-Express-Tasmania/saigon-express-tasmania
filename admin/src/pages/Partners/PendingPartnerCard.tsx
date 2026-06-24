import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BusinessType } from '@/types/UserProfile';
import { CheckCircle2, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  defaultConfirmPrivileges,
  PARTNER_PRIVILEGE_OPTIONS,
  togglePartnerPrivilege,
} from './partner-privilege-form';
import {
  formatPartnerDate,
  partnerDisplayName,
  type PendingPartnerProfile,
} from './partner-profiles';

const CONFIRM_POPOVER_WIDTH = 208;

type ConfirmPopoverPosition = {
  top: number;
  left: number;
};

function getConfirmPopoverPosition(anchor: HTMLElement): ConfirmPopoverPosition {
  const rect = anchor.getBoundingClientRect();
  const left = Math.max(
    8,
    Math.min(rect.right - CONFIRM_POPOVER_WIDTH, window.innerWidth - CONFIRM_POPOVER_WIDTH - 8),
  );

  return {
    top: rect.top - 4,
    left,
  };
}

export type PendingPartnerCardProps = {
  partner: PendingPartnerProfile;
  confirmingId: string | null;
  confirmPromptId: string | null;
  onConfirmPromptToggle: (partnerId: string) => void;
  onConfirmPromptClose: () => void;
  onConfirm: (partner: PendingPartnerProfile, privileges: BusinessType[]) => void;
  onEdit?: (partner: PendingPartnerProfile) => void;
  onDelete?: (partner: PendingPartnerProfile) => void;
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
  const [confirmPrivileges, setConfirmPrivileges] = useState<BusinessType[]>(
    () => defaultConfirmPrivileges(partner.privileges),
  );
  const [popoverPosition, setPopoverPosition] = useState<ConfirmPopoverPosition | null>(
    null,
  );
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isConfirmOpen = confirmPromptId === partner.id;

  useEffect(() => {
    if (isConfirmOpen) {
      setConfirmPrivileges(defaultConfirmPrivileges(partner.privileges));
    }
  }, [isConfirmOpen, partner.privileges]);

  useEffect(() => {
    if (!isConfirmOpen || !anchorRef.current) {
      setPopoverPosition(null);
      return;
    }

    const syncPosition = () => {
      if (!anchorRef.current) return;
      setPopoverPosition(getConfirmPopoverPosition(anchorRef.current));
    };

    syncPosition();
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);

    return () => {
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
    };
  }, [isConfirmOpen]);

  useEffect(() => {
    if (!isConfirmOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      onConfirmPromptClose();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isConfirmOpen, onConfirmPromptClose]);

  const metadataFields = [
    partner.email ?? '—',
    partner.business_name,
    partner.phone,
    formatPartnerDate(partner.created_at),
  ].filter(Boolean);

  const confirmPopover =
    isConfirmOpen && popoverPosition
      ? createPortal(
          <div
            ref={popoverRef}
            data-partner-confirm-popover
            role="dialog"
            aria-label="Confirm partner"
            className="fixed z-[200] w-52 -translate-y-full rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
            style={{
              top: popoverPosition.top,
              left: popoverPosition.left,
            }}
          >
            <p className="mb-2 text-xs font-medium">Confirm partner</p>
            <div className="mb-3 flex flex-col gap-1.5">
              {PARTNER_PRIVILEGE_OPTIONS.map((option) => {
                const checked = confirmPrivileges.includes(option.value);
                const isOnlyPersonal =
                  option.value === 'personal' &&
                  confirmPrivileges.length === 1 &&
                  checked;

                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 text-xs hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-input"
                      checked={checked}
                      disabled={confirmingId === partner.id || isOnlyPersonal}
                      onChange={() =>
                        setConfirmPrivileges((current) =>
                          togglePartnerPrivilege(current, option.value),
                        )
                      }
                    />
                    <span className="capitalize">{option.label}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={onConfirmPromptClose}
                disabled={confirmingId === partner.id}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onConfirm(partner, confirmPrivileges)}
                disabled={confirmingId === partner.id}
              >
                {confirmingId === partner.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:gap-3 ${
        partner.email_verified
          ? ''
          : 'border-destructive/50 bg-destructive/10'
      }`}
    >
      {onDelete ? (
        <div className="flex shrink-0">
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
        </div>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium">
            {partnerDisplayName(partner)}
          </p>
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            Pending
          </Badge>
          {!partner.email_verified ? (
            <Badge
              variant="outline"
              className="border-destructive/50 bg-destructive/15 px-1.5 py-0 text-[10px] text-destructive"
            >
              Email unverified
            </Badge>
          ) : null}
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
        <div ref={anchorRef} className="relative">
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
        </div>
        {confirmPopover}
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
      </div>
    </div>
  );
}

export function PendingPartnerCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="h-7 w-7 shrink-0 rounded bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-36 rounded bg-muted" />
          <div className="h-4 w-14 rounded bg-muted" />
        </div>
        <div className="h-3 w-full max-w-md rounded bg-muted" />
      </div>
      <div className="flex shrink-0 gap-1.5 sm:ml-auto">
        <div className="h-7 w-20 rounded bg-muted" />
        <div className="h-7 w-7 rounded bg-muted" />
      </div>
    </div>
  );
}
