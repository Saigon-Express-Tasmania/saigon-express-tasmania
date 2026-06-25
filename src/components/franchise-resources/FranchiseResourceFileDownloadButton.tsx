"use client";

import { Download, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { downloadFranchiseResourceFile } from "@/lib/franchise-resource-file-download";
import { cn } from "@/lib/utils";

type FranchiseResourceFileDownloadButtonProps = {
  url: string;
  fileName: string;
  className?: string;
  variant?: "icon" | "header";
  label?: string;
};

export default function FranchiseResourceFileDownloadButton({
  url,
  fileName,
  className,
  variant = "icon",
  label = "Download",
}: FranchiseResourceFileDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!url.trim() || downloading) return;
    setDownloading(true);
    try {
      await downloadFranchiseResourceFile(url, fileName);
    } finally {
      setDownloading(false);
    }
  }, [downloading, fileName, url]);

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloading || !url.trim()}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50 sm:px-3 sm:text-sm",
          className,
        )}
        aria-label={`Download ${fileName}`}
      >
        {downloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
        ) : (
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        )}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={downloading || !url.trim()}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary disabled:opacity-50 sm:h-9 sm:w-9",
        className,
      )}
      aria-label={`Download ${fileName}`}
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  );
}
