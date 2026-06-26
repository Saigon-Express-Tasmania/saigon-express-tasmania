import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type FranchiseResourcePreviewPdfViewerProps = {
  url: string;
  title: string;
};

export function FranchiseResourcePreviewPdfViewer({
  url,
  title,
}: FranchiseResourcePreviewPdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setBlobUrl(null);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Unable to load PDF (${response.status})`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setBlobUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load this PDF. Try opening it in a new tab.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-6 py-8 text-center text-sm">
        <p className="text-destructive">{error}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-primary underline"
        >
          Open PDF in new tab
        </a>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading PDF…
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl}
      title={title}
      className="h-[min(70vh,900px)] w-full rounded-lg border border-border bg-muted"
    />
  );
}
