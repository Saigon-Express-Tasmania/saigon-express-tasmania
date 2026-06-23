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
  buildApplicantName,
  formatJobApplicationDate,
  formatJobApplicationDateOnly,
  jobApplicationStatusBadgeClass,
} from '@/lib/job-applications';
import type { JobApplication, JobApplicationStatus } from '@/types/JobApplication';

export type JobApplicationViewDialogProps = {
  application: JobApplication | null;
  open: boolean;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (
    application: JobApplication,
    status: JobApplicationStatus,
  ) => void;
};

function AttachmentLink({
  url,
  filename,
}: {
  url: string | null;
  filename: string | null;
}) {
  if (!url?.trim()) return <p>—</p>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {filename?.trim() || url}
    </a>
  );
}

export function JobApplicationViewDialog({
  application,
  open,
  saving = false,
  onOpenChange,
  onStatusChange,
}: JobApplicationViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job application #{application?.id}</DialogTitle>
          <DialogDescription>
            Submitted{' '}
            {application ? formatJobApplicationDate(application.created_at) : ''}
          </DialogDescription>
        </DialogHeader>
        {application ? (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="font-medium text-muted-foreground">Applicant</p>
              <p className="font-medium">{buildApplicantName(application)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Email</p>
              <p>{application.email}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Phone</p>
              <p>{application.phone ?? '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Role</p>
              <p>{application.job_title}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Location</p>
              <p>{application.job_location ?? '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Date of birth</p>
              <p>{formatJobApplicationDateOnly(application.date_of_birth)}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Status</p>
              <Badge
                variant="secondary"
                className={jobApplicationStatusBadgeClass(application.status)}
              >
                {application.status}
              </Badge>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Can work weekends?</p>
              <p>{application.can_work_weekends ?? '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Commute under 20 min?</p>
              <p>{application.commute_under_20_minutes ?? '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-medium text-muted-foreground">Work availability</p>
              <p className="whitespace-pre-wrap leading-relaxed">
                {application.work_availability ?? '—'}
              </p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Resume</p>
              <AttachmentLink
                url={application.resume_url}
                filename={application.resume_filename}
              />
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Cover letter</p>
              <AttachmentLink
                url={application.cover_letter_url}
                filename={application.cover_letter_filename}
              />
            </div>
            {application.candidate_message ? (
              <div className="sm:col-span-2">
                <p className="font-medium text-muted-foreground">Additional message</p>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {application.candidate_message}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {application?.status !== 'reviewing' ? (
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => onStatusChange(application!, 'reviewing')}
              >
                Mark reviewing
              </Button>
            ) : null}
            {application?.status !== 'approved' ? (
              <Button
                disabled={saving}
                onClick={() => onStatusChange(application!, 'approved')}
              >
                Approve
              </Button>
            ) : null}
            {application?.status !== 'rejected' ? (
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => onStatusChange(application!, 'rejected')}
              >
                Reject
              </Button>
            ) : null}
            {application?.status !== 'resolved' ? (
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => onStatusChange(application!, 'resolved')}
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
