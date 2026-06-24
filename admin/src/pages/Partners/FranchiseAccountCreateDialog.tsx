import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PendingFranchiseInterest } from '@/lib/pending-franchise-interests';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  completeFranchiseAccount,
  formatFranchisePrivilegeLabels,
  franchiseAccountDisplayName,
  previewFranchiseAccount,
  type FranchiseAccountPreview,
} from './franchise-account';

const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generateFranchiseAccountPassword(): string {
  const length = 10 + Math.floor(Math.random() * 3);
  const randomValues = crypto.getRandomValues(new Uint32Array(length));

  return Array.from(randomValues, (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]).join(
    '',
  );
}

type FranchiseAccountCreateDialogProps = {
  interest: PendingFranchiseInterest | null;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
};

function PreviewField({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className ?? 'grid gap-1'}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value?.trim() ? value : '—'}</dd>
    </div>
  );
}

function ProfilePreviewGrid({
  profile,
  showExistingFields = false,
}: {
  profile: FranchiseAccountPreview['preview'] | FranchiseAccountPreview['existingUser'];
  showExistingFields?: boolean;
}) {
  const existingProfile =
    profile && 'city' in profile ? profile : null;

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <PreviewField
        className="grid gap-1 sm:col-span-2"
        label="Email"
        value={profile?.email}
      />
      <PreviewField
        label="Name"
        value={profile ? franchiseAccountDisplayName(profile) : null}
      />
      <PreviewField label="Phone" value={profile?.phone} />
      {showExistingFields && existingProfile ? (
        <>
          <PreviewField label="City" value={existingProfile.city} />
          <PreviewField
            label="Business category"
            value={existingProfile.business_category}
          />
        </>
      ) : null}
      <PreviewField label="State" value={profile?.state} />
      <PreviewField label="Business name" value={profile?.business_name} />
      <PreviewField label="Location address" value={profile?.location_address} />
      <PreviewField label="Investment amount" value={profile?.investment_amount} />
      <PreviewField label="Country" value={profile?.country} />
      <PreviewField label="Role" value={profile?.user_role} />
      <PreviewField
        label="Privileges"
        value={
          profile ? formatFranchisePrivilegeLabels(profile.privileges) : null
        }
      />
    </dl>
  );
}

export function FranchiseAccountCreateDialog({
  interest,
  onClose,
  onCompleted,
}: FranchiseAccountCreateDialogProps) {
  const [preview, setPreview] = useState<FranchiseAccountPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!interest) {
      setPreview(null);
      setPassword('');
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);
    setPreview(null);
    setPassword('');

    void previewFranchiseAccount(interest.id)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(
            err instanceof Error
              ? err.message
              : 'Failed to load franchise account preview.',
          );
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [interest, onClose]);

  const handleSubmit = async () => {
    if (!interest || !preview) return;

    if (preview.passwordRequired && password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await completeFranchiseAccount({
        franchiseInterestId: interest.id,
        password: preview.passwordRequired ? password : undefined,
      });

      toast.success(
        result.created
          ? 'Franchise partner account created.'
          : preview.alreadyHasFranchise
            ? 'Franchise interest marked as resolved.'
            : 'Franchise privilege added to existing account.',
      );
      onClose();
      await onCompleted();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to complete franchise account setup.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = preview?.alreadyHasFranchise
    ? 'Mark as resolved'
    : preview?.emailExists
      ? 'Add franchise privilege'
      : 'Create account';

  return (
    <Dialog
      open={interest != null}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create franchise account</DialogTitle>
          <DialogDescription>
            {interest
              ? `Review account details for ${interest.full_name} before continuing.`
              : 'Review account details before continuing.'}
          </DialogDescription>
        </DialogHeader>

        {loadingPreview ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading preview…
          </div>
        ) : preview ? (
          <div className="space-y-4">
            {preview.emailExists ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                An account already exists for <strong>{preview.preview.email}</strong>.
                {preview.alreadyHasFranchise
                  ? ' This user already has franchise access. You can mark this interest as resolved.'
                  : ' Confirm below to add the franchise privilege to this user.'}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                No existing account was found. A new user will be created with franchise
                access using the details below.
              </div>
            )}

            {preview.existingUser ? (
              <section className="space-y-2 rounded-md border p-3">
                <h4 className="text-sm font-semibold">Current account</h4>
                <ProfilePreviewGrid
                  profile={preview.existingUser}
                  showExistingFields
                />
              </section>
            ) : null}

            <section className="space-y-2 rounded-md border p-3">
              <h4 className="text-sm font-semibold">
                {preview.emailExists && !preview.alreadyHasFranchise
                  ? 'After adding franchise privilege'
                  : preview.alreadyHasFranchise
                    ? 'Franchise interest'
                    : 'New account preview'}
              </h4>
              <ProfilePreviewGrid profile={preview.preview} />
            </section>

            {preview.passwordRequired ? (
              <div className="grid gap-2">
                <Label htmlFor="franchise-account-password">Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="franchise-account-password"
                    type="text"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={submitting}
                    placeholder="At least 8 characters"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => setPassword(generateFranchiseAccountPassword())}
                  >
                    Generate
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loadingPreview || !preview || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Working…
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
