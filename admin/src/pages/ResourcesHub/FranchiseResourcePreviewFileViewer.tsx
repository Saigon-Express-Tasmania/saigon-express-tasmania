import { useStorage } from '@/hooks/useStorage';
import FranchiseResourceDocxViewer from '@/components/franchise-resources/FranchiseResourceDocxViewer';
import FranchiseResourceImageViewer from '@/components/franchise-resources/FranchiseResourceImageViewer';
import FranchiseResourceTextViewer from '@/components/franchise-resources/FranchiseResourceTextViewer';
import FranchiseResourceXlsxViewer from '@/components/franchise-resources/FranchiseResourceXlsxViewer';
import { Download, FileText } from 'lucide-react';
import { useMemo } from 'react';
import { resolveImagePreview } from './franchiseResourceShared';
import { FranchiseResourcePreviewPdfViewer } from './FranchiseResourcePreviewPdfViewer';

function getUrlExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split('/').pop() ?? '';
    const dot = segment.lastIndexOf('.');
    return dot >= 0 ? segment.slice(dot + 1).toLowerCase() : '';
  } catch {
    const clean = url.split('?')[0] ?? url;
    const dot = clean.lastIndexOf('.');
    return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
  }
}

function isPdfUrl(url: string, mimeType?: string): boolean {
  if (mimeType?.toLowerCase().includes('pdf')) return true;
  return getUrlExtension(url) === 'pdf';
}

function isDocxUrl(url: string, mimeType?: string): boolean {
  const mime = mimeType?.toLowerCase() ?? '';
  if (mime.includes('wordprocessingml') || mime.includes('msword')) return true;
  const ext = getUrlExtension(url);
  return ext === 'docx' || ext === 'doc';
}

function isXlsxUrl(url: string, mimeType?: string): boolean {
  const mime = mimeType?.toLowerCase() ?? '';
  if (
    mime.includes('spreadsheetml') ||
    mime.includes('ms-excel') ||
    mime.includes('excel')
  ) {
    return true;
  }
  const ext = getUrlExtension(url);
  return ext === 'xlsx' || ext === 'xls' || ext === 'xlsm';
}

function isImageUrl(url: string, mimeType?: string): boolean {
  const mime = mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return true;
  const ext = getUrlExtension(url);
  return (
    ext === 'png' ||
    ext === 'jpg' ||
    ext === 'jpeg' ||
    ext === 'gif' ||
    ext === 'webp' ||
    ext === 'svg'
  );
}

function isTextUrl(url: string, mimeType?: string): boolean {
  const mime = mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('text/')) return true;
  const ext = getUrlExtension(url);
  return ext === 'txt' || ext === 'text';
}

function matchesFileType(
  check: (url: string, mimeType?: string) => boolean,
  resolvedUrl: string,
  originalUrl: string,
  mimeType?: string,
): boolean {
  return (
    check(resolvedUrl, mimeType) ||
    (originalUrl !== resolvedUrl && check(originalUrl, mimeType))
  );
}

type FranchiseResourcePreviewFileViewerProps = {
  url: string;
  title?: string;
  mimeType?: string;
};

export function FranchiseResourcePreviewFileViewer({
  url,
  title = 'Document',
  mimeType,
}: FranchiseResourcePreviewFileViewerProps) {
  const { getPublicUrl } = useStorage();
  const resolvedUrl = useMemo(
    () => resolveImagePreview(url, getPublicUrl) ?? '',
    [getPublicUrl, url],
  );

  if (!resolvedUrl) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No file URL is available for preview.
      </p>
    );
  }

  if (matchesFileType(isPdfUrl, resolvedUrl, url, mimeType)) {
    return <FranchiseResourcePreviewPdfViewer url={resolvedUrl} title={title} />;
  }

  if (matchesFileType(isDocxUrl, resolvedUrl, url, mimeType)) {
    return <FranchiseResourceDocxViewer url={resolvedUrl} title={title} />;
  }

  if (matchesFileType(isXlsxUrl, resolvedUrl, url, mimeType)) {
    return <FranchiseResourceXlsxViewer url={resolvedUrl} title={title} />;
  }

  if (matchesFileType(isImageUrl, resolvedUrl, url, mimeType)) {
    return <FranchiseResourceImageViewer url={resolvedUrl} title={title} />;
  }

  if (matchesFileType(isTextUrl, resolvedUrl, url, mimeType)) {
    return <FranchiseResourceTextViewer url={resolvedUrl} title={title} />;
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/20 px-6 py-10 text-center">
      <FileText className="h-10 w-10 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">
        This file type cannot be previewed in the browser.
      </p>
      <a
        href={resolvedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Download className="h-4 w-4" />
        Download {title}
      </a>
    </div>
  );
}
