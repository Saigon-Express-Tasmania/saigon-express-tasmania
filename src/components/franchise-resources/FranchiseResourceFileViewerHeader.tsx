"use client";

import FranchiseResourceFileDownloadButton from "@/components/franchise-resources/FranchiseResourceFileDownloadButton";
import { DOCUMENT_VIEWER_HEADER_CLASS } from "@/components/franchise-resources/document-viewer-layout";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type FranchiseResourceFileViewerHeaderProps = {
  title: string;
  downloadUrl: string;
  downloadFileName: string;
  externalBottomBar?: boolean;
  className?: string;
  children?: ReactNode;
};

export default function FranchiseResourceFileViewerHeader({
  title,
  downloadUrl,
  downloadFileName,
  externalBottomBar = false,
  className,
  children,
}: FranchiseResourceFileViewerHeaderProps) {
  const hasDownload = Boolean(downloadUrl.trim());

  if (externalBottomBar && !hasDownload) return null;

  return (
    <div
      className={cn(
        DOCUMENT_VIEWER_HEADER_CLASS,
        externalBottomBar ? "gap-3" : "flex-wrap gap-x-3 gap-y-2",
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
        {title}
      </span>

      <div className="flex shrink-0 items-center gap-2">
        {!externalBottomBar ? children : null}
        {hasDownload ? (
          <FranchiseResourceFileDownloadButton
            url={downloadUrl}
            fileName={downloadFileName}
            variant="header"
          />
        ) : null}
      </div>
    </div>
  );
}
