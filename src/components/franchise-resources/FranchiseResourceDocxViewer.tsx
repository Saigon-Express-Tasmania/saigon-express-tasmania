"use client";

import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { Loader2 } from "lucide-react";

type FranchiseResourceDocxViewerProps = {
  url: string;
  title?: string;
};

export default function FranchiseResourceDocxViewer({
  url,
  title = "Document",
}: FranchiseResourceDocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    async function loadDocument() {
      setLoading(true);
      setError(null);
      if (container) container.innerHTML = "";

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load document (${response.status})`);
        }

        const blob = await response.blob();
        if (cancelled || !containerRef.current) return;

        await renderAsync(blob, containerRef.current, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this document. Try downloading it instead.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
      if (container) container.innerHTML = "";
    };
  }, [url]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2 text-sm font-medium text-foreground">
        {title}
      </div>
      <div className="relative min-h-[240px] overflow-x-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading document…
          </div>
        ) : null}
        {error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : null}
        <div
          ref={containerRef}
          className={`docx-viewer ${loading ? "hidden" : ""}`}
        />
      </div>
    </div>
  );
}
