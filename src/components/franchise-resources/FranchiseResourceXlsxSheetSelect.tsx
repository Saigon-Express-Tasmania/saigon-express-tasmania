"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type FranchiseResourceXlsxSheetSelectProps = {
  sheetNames: string[];
  activeSheetIndex: number;
  onSelectSheet: (index: number) => void;
  variant?: "default" | "compact";
  className?: string;
  id?: string;
};

export default function FranchiseResourceXlsxSheetSelect({
  sheetNames,
  activeSheetIndex,
  onSelectSheet,
  variant = "default",
  className,
  id,
}: FranchiseResourceXlsxSheetSelectProps) {
  if (sheetNames.length <= 1) return null;

  const isCompact = variant === "compact";

  return (
    <Select
      value={String(activeSheetIndex)}
      onValueChange={(value) => onSelectSheet(Number.parseInt(value, 10))}
    >
      <SelectTrigger
        id={id}
        className={cn(
          isCompact
            ? "h-7 min-w-[5.5rem] max-w-[9rem] shrink-0 rounded-md border-border bg-background px-2 text-[11px] shadow-none sm:h-8 sm:max-w-[10rem] sm:text-xs [&>svg]:size-3"
            : "h-8 w-auto min-w-[8rem] max-w-full rounded-md border-border bg-background text-xs shadow-none sm:h-9 sm:min-w-[10rem] sm:text-sm",
          className,
        )}
        aria-label="Select worksheet"
      >
        <SelectValue placeholder="Sheet" />
      </SelectTrigger>
      <SelectContent
        align={isCompact ? "end" : "start"}
        className={isCompact ? "min-w-[8rem]" : undefined}
      >
        {sheetNames.map((name, index) => (
          <SelectItem
            key={`${name}-${index}`}
            value={String(index)}
            className={isCompact ? "text-xs" : undefined}
          >
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
