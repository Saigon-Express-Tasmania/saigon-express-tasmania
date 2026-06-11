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
import { formatFeedbackDate, statusBadgeVariant } from '@/lib/feedbacks';
import type { Feedback, FeedbackStatus } from '@/types/Feedback';

export type FeedbackViewDialogProps = {
  feedback: Feedback | null;
  open: boolean;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (feedback: Feedback, status: FeedbackStatus) => void;
  onEdit?: (feedback: Feedback) => void;
};

export function FeedbackViewDialog({
  feedback,
  open,
  saving = false,
  onOpenChange,
  onStatusChange,
  onEdit,
}: FeedbackViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Feedback #{feedback?.id}</DialogTitle>
          <DialogDescription>
            Submitted{' '}
            {feedback ? formatFeedbackDate(feedback.created_at) : ''}
          </DialogDescription>
        </DialogHeader>
        {feedback && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Name</p>
              <p>{feedback.name}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Email</p>
              <p>{feedback.email ?? '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Source</p>
              <Badge variant="secondary">{feedback.source}</Badge>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Status</p>
              <Badge variant={statusBadgeVariant(feedback.status)}>
                {feedback.status}
              </Badge>
            </div>
            {feedback.resolved_at && (
              <div>
                <p className="font-medium text-muted-foreground">Resolved at</p>
                <p>{formatFeedbackDate(feedback.resolved_at)}</p>
              </div>
            )}
            <div>
              <p className="font-medium text-muted-foreground">Question</p>
              <p className="whitespace-pre-wrap leading-relaxed">
                {feedback.question}
              </p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">IP hash</p>
              <p className="break-all font-mono text-xs text-muted-foreground">
                {feedback.ip_hash}
              </p>
            </div>
          </div>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {feedback?.status !== 'approved' && (
              <Button
                disabled={saving}
                onClick={() => onStatusChange(feedback!, 'approved')}
              >
                Approve
              </Button>
            )}
            {feedback?.status !== 'rejected' && (
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => onStatusChange(feedback!, 'rejected')}
              >
                Reject
              </Button>
            )}
            {feedback?.status !== 'resolved' && (
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => onStatusChange(feedback!, 'resolved')}
              >
                Resolve
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {feedback && onEdit ? (
              <Button
                onClick={() => {
                  onEdit(feedback);
                  onOpenChange(false);
                }}
              >
                Edit
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
