"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type FranchiseResourcePdfPageNavProps = {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
  className?: string;
  variant?: "default" | "bottomBar";
};

export default function FranchiseResourcePdfPageNav({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onGoToPage,
  className,
  variant = "default",
}: FranchiseResourcePdfPageNavProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));
  const isBottomBar = variant === "bottomBar";
  const isReady = totalPages > 0;

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const commitPageInput = () => {
    if (!isReady) return;
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(currentPage));
      return;
    }
    onGoToPage(parsed);
  };

  const buttonClass = cn(
    "flex items-center justify-center rounded-md text-foreground transition-colors hover:bg-secondary disabled:opacity-40",
    isBottomBar ? "h-9 w-9" : "h-8 w-8",
  );

  const inputClass = cn(
    "rounded-md border border-input bg-background text-center tabular-nums outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60",
    isBottomBar
      ? "w-11 px-1.5 py-1 text-sm"
      : "w-9 px-1 py-0.5 text-xs sm:w-10 sm:text-sm",
  );

  return (
    <div
      className={cn(
        "flex shrink-0 items-center",
        isBottomBar ? "gap-1" : "gap-0.5 sm:gap-1",
        className,
      )}
      aria-label="PDF page navigation"
    >
      <button
        type="button"
        onClick={onPrevious}
        disabled={!isReady || currentPage <= 1}
        className={buttonClass}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <label
        className={cn(
          "flex items-center gap-1 font-medium text-foreground",
          isBottomBar ? "text-sm" : "text-xs sm:text-sm",
        )}
      >
        <span className="sr-only">Current page</span>
        <input
          type="number"
          min={1}
          max={isReady ? totalPages : undefined}
          value={isReady ? pageInput : ""}
          placeholder={isReady ? undefined : "—"}
          disabled={!isReady}
          onChange={(event) => setPageInput(event.target.value)}
          onBlur={commitPageInput}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitPageInput();
              event.currentTarget.blur();
            }
          }}
          className={inputClass}
          aria-label="Page number"
        />
        <span className="whitespace-nowrap text-muted-foreground">
          / {isReady ? totalPages : "—"}
        </span>
      </label>

      <button
        type="button"
        onClick={onNext}
        disabled={!isReady || currentPage >= totalPages}
        className={buttonClass}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
