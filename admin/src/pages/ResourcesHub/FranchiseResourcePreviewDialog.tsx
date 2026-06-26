import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FranchiseResourceDocumentViewerProvider } from '@/components/franchise-resources/FranchiseResourceDocumentViewerContext';
import { cn } from '@/lib/utils';
import { Streamdown } from 'streamdown';
import 'streamdown/styles.css';
import type { FranchiseResourceRow } from './franchiseResourceShared';
import { FranchiseResourcePreviewFileViewer } from './FranchiseResourcePreviewFileViewer';

const PROSE_CLASS =
  'space-y-4 text-foreground leading-relaxed [&_a]:text-primary [&_a]:underline [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-4 [&_p]:text-muted-foreground [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-4';

function PreviewBodyContent({
  content,
  contentFormat,
}: {
  content: string;
  contentFormat: string;
}) {
  const format =
    contentFormat === 'markdown' || contentFormat === 'plain'
      ? contentFormat
      : 'html';

  if (format === 'markdown') {
    return (
      <div className={PROSE_CLASS}>
        <Streamdown>{content}</Streamdown>
      </div>
    );
  }

  if (format === 'plain') {
    return (
      <div className={cn(PROSE_CLASS, 'whitespace-pre-wrap')}>{content}</div>
    );
  }

  return (
    <div
      className={PROSE_CLASS}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

function PreviewVideoPlayer({ url, title }: { url: string; title: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-black">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black"
        aria-label={`Video: ${title}`}
      >
        <track kind="captions" />
        Your browser does not support embedded video playback.
      </video>
    </div>
  );
}

type FranchiseResourcePreviewDialogProps = {
  resource: FranchiseResourceRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FranchiseResourcePreviewDialog({
  resource,
  open,
  onOpenChange,
}: FranchiseResourcePreviewDialogProps) {
  const contentText = resource?.content?.trim() ?? '';
  const videoUrl = resource?.video_file?.trim() ?? '';
  const contentFileUrl = resource?.content_file?.trim() ?? '';
  const summaryText = resource?.summary?.trim() ?? '';
  const descriptionText = resource?.description?.trim() ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {resource ? (
      <DialogContent className="flex max-h-[90vh] w-[min(98vw,90rem)] max-w-[min(98vw,90rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(98vw,90rem)]">
        <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
          <DialogTitle>{resource.title}</DialogTitle>
          <DialogDescription>
            Preview how members see this resource.
          </DialogDescription>
        </DialogHeader>

        <FranchiseResourceDocumentViewerProvider>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {summaryText ? (
              <p className="text-sm font-medium text-foreground">{summaryText}</p>
            ) : null}

            {descriptionText ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {descriptionText}
              </p>
            ) : null}

            {contentFileUrl ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Primary file
                </h3>
                <FranchiseResourcePreviewFileViewer
                  url={contentFileUrl}
                  title={resource.title}
                />
              </section>
            ) : null}

            {videoUrl ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Training video
                </h3>
                <PreviewVideoPlayer url={videoUrl} title={resource.title} />
              </section>
            ) : null}

            {contentText ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Content
                </h3>
                <PreviewBodyContent
                  content={contentText}
                  contentFormat={resource.content_format}
                />
              </section>
            ) : null}

            {!contentText && !videoUrl && !contentFileUrl ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No content, video, or primary file has been added yet.
              </p>
            ) : null}
          </div>
        </FranchiseResourceDocumentViewerProvider>
      </DialogContent>
      ) : null}
    </Dialog>
  );
}
