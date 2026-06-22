import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  formatFranchiseInterestDate,
  franchiseInterestStatusBadgeClass,
  type InterestStatus,
  type PendingFranchiseInterest,
} from '@/lib/pending-franchise-interests';

export type FranchiseInterestViewDialogProps = {
  interest: PendingFranchiseInterest | null;
  open: boolean;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (interest: PendingFranchiseInterest, status: InterestStatus) => void;
};

export function FranchiseInterestViewDialog({
  interest,
  open,
  saving = false,
  onOpenChange,
  onStatusChange,
}: FranchiseInterestViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Franchise interest #{interest?.id}</DialogTitle>
          <DialogDescription>
            Submitted {interest ? formatFranchiseInterestDate(interest.created_at) : ''}
          </DialogDescription>
        </DialogHeader>
        {interest ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Name</p>
              <p>{interest.full_name}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Email</p>
              <p>{interest.email}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Phone</p>
              <p>{interest.phone ?? '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Location</p>
              <p>
                {[interest.city, interest.state].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Investment budget</p>
              <p>{interest.investment_budget ?? '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Status</p>
              <Badge
                variant="secondary"
                className={franchiseInterestStatusBadgeClass(interest.status)}
              >
                {interest.status}
              </Badge>
            </div>
            {interest.business_experience ? (
              <div>
                <p className="font-medium text-muted-foreground">Business experience</p>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {interest.business_experience}
                </p>
              </div>
            ) : null}
            {interest.message ? (
              <div>
                <p className="font-medium text-muted-foreground">Message</p>
                <p className="whitespace-pre-wrap leading-relaxed">{interest.message}</p>
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {interest?.status !== 'approved' ? (
              <Button
                disabled={saving}
                onClick={() => onStatusChange(interest!, 'approved')}
              >
                Approve
              </Button>
            ) : null}
            {interest?.status !== 'rejected' ? (
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => onStatusChange(interest!, 'rejected')}
              >
                Reject
              </Button>
            ) : null}
            {interest?.status !== 'resolved' ? (
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => onStatusChange(interest!, 'resolved')}
              >
                Resolve
              </Button>
            ) : null}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
