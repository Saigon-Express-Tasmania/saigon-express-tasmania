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
} from '@/lib/pending-franchise-interests';
import { type PendingWholesaleEnquiry } from '@/lib/pending-wholesale-enquiries';

export type WholesaleEnquiryViewDialogProps = {
  enquiry: PendingWholesaleEnquiry | null;
  open: boolean;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (enquiry: PendingWholesaleEnquiry, status: InterestStatus) => void;
};

export function WholesaleEnquiryViewDialog({
  enquiry,
  open,
  saving = false,
  onOpenChange,
  onStatusChange,
}: WholesaleEnquiryViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Wholesale enquiry #{enquiry?.id}</DialogTitle>
          <DialogDescription>
            Submitted {enquiry ? formatFranchiseInterestDate(enquiry.created_at) : ''}
          </DialogDescription>
        </DialogHeader>
        {enquiry ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Business name</p>
              <p>{enquiry.business_name ?? '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Contact name</p>
              <p>{enquiry.full_name}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Email</p>
              <p>{enquiry.email}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Phone</p>
              <p>{enquiry.phone ?? '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Business type</p>
              <p>{enquiry.business_type ?? '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Estimated weekly volume</p>
              <p>{enquiry.estimated_weekly_volume ?? '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Status</p>
              <Badge
                variant="secondary"
                className={franchiseInterestStatusBadgeClass(enquiry.status)}
              >
                {enquiry.status}
              </Badge>
            </div>
            {enquiry.message ? (
              <div>
                <p className="font-medium text-muted-foreground">Message</p>
                <p className="whitespace-pre-wrap leading-relaxed">{enquiry.message}</p>
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {enquiry?.status !== 'approved' ? (
              <Button
                disabled={saving}
                onClick={() => onStatusChange(enquiry!, 'approved')}
              >
                Approve
              </Button>
            ) : null}
            {enquiry?.status !== 'rejected' ? (
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => onStatusChange(enquiry!, 'rejected')}
              >
                Reject
              </Button>
            ) : null}
            {enquiry?.status !== 'resolved' ? (
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => onStatusChange(enquiry!, 'resolved')}
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
