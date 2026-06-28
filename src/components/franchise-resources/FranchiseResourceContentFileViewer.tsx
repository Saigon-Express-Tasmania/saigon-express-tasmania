"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { resolveFranchiseResourceFileUrl } from "@/types/franchise-resources";

const FranchiseResourcePdfViewer = dynamic(
  () => import("./FranchiseResourcePdfViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Preparing PDF viewer…
      </div>
    ),
  },
);

const FranchiseResourceDocxViewer = dynamic(
  () => import("./FranchiseResourceDocxViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Preparing document viewer…
      </div>
    ),
  },
);

const FranchiseResourceXlsxViewer = dynamic(
  () => import("./FranchiseResourceXlsxViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Preparing spreadsheet viewer…
      </div>
    ),
  },
);

const FranchiseResourceImageViewer = dynamic(
  () => import("./FranchiseResourceImageViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Preparing image viewer…
      </div>
    ),
  },
);

const FranchiseResourceTextViewer = dynamic(
  () => import("./FranchiseResourceTextViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-12 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Preparing text viewer…
      </div>
    ),
  },
);

function getUrlExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split("/").pop() ?? "";
    const dot = segment.lastIndexOf(".");
    return dot >= 0 ? segment.slice(dot + 1).toLowerCase() : "";
  } catch {
    const clean = url.split("?")[0] ?? url;
    const dot = clean.lastIndexOf(".");
    return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : "";
  }
}

function isPdfUrl(url: string, mimeType?: string): boolean {
  if (mimeType?.toLowerCase().includes("pdf")) return true;
  return getUrlExtension(url) === "pdf";
}

function isDocxUrl(url: string, mimeType?: string): boolean {
  const mime = mimeType?.toLowerCase() ?? "";
  if (mime.includes("wordprocessingml") || mime.includes("msword")) return true;
  const ext = getUrlExtension(url);
  return ext === "docx" || ext === "doc";
}

function isXlsxUrl(url: string, mimeType?: string): boolean {
  const mime = mimeType?.toLowerCase() ?? "";
  if (
    mime.includes("spreadsheetml") ||
    mime.includes("ms-excel") ||
    mime.includes("excel")
  ) {
    return true;
  }
  const ext = getUrlExtension(url);
  return ext === "xlsx" || ext === "xls" || ext === "xlsm";
}

function isImageUrl(url: string, mimeType?: string): boolean {
  const mime = mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return true;
  const ext = getUrlExtension(url);
  return (
    ext === "png" ||
    ext === "jpg" ||
    ext === "jpeg" ||
    ext === "gif" ||
    ext === "webp" ||
    ext === "svg"
  );
}

function isTextUrl(url: string, mimeType?: string): boolean {
  const mime = mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("text/")) return true;
  const ext = getUrlExtension(url);
  return ext === "txt" || ext === "text";
}

type FranchiseResourceContentFileViewerProps = {
  url: string;
  title?: string;
  mimeType?: string;
  fillHeight?: boolean;
  externalBottomBar?: boolean;
};

export default function FranchiseResourceContentFileViewer({
  url,
  title = "Document",
  mimeType,
  fillHeight = false,
  externalBottomBar = false,
}: FranchiseResourceContentFileViewerProps) {
  const { getPublicUrl } = useSupabaseStorage();
  const resolvedUrl = useMemo(
    () => resolveFranchiseResourceFileUrl(url, getPublicUrl),
    [getPublicUrl, url],
  );

  if (isPdfUrl(resolvedUrl, mimeType)) {
    return (
      <FranchiseResourcePdfViewer
        url={resolvedUrl}
        title={title}
        fillHeight={fillHeight}
        externalBottomBar={externalBottomBar}
      />
    );
  }

  if (isDocxUrl(resolvedUrl, mimeType)) {
    return (
      <FranchiseResourceDocxViewer
        url={resolvedUrl}
        title={title}
        fillHeight={fillHeight}
        externalBottomBar={externalBottomBar}
      />
    );
  }

  if (isXlsxUrl(resolvedUrl, mimeType)) {
    return (
      <FranchiseResourceXlsxViewer
        url={resolvedUrl}
        title={title}
        fillHeight={fillHeight}
        externalBottomBar={externalBottomBar}
      />
    );
  }

  if (isImageUrl(resolvedUrl, mimeType)) {
    return (
      <FranchiseResourceImageViewer
        url={resolvedUrl}
        title={title}
        fillHeight={fillHeight}
        externalBottomBar={externalBottomBar}
      />
    );
  }

  if (isTextUrl(resolvedUrl, mimeType)) {
    return (
      <FranchiseResourceTextViewer
        url={resolvedUrl}
        title={title}
        fillHeight={fillHeight}
        externalBottomBar={externalBottomBar}
      />
    );
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
