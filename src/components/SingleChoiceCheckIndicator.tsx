import { cn } from "@/lib/utils";

/** Check mark used for single-choice options (matches ItemCustomiseModal). */
export function SingleChoiceCheckMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-3 w-3 text-white", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export function SingleChoiceOptionIndicator({
  selected,
  className,
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        selected
          ? "border-brand-red bg-brand-red"
          : "border-gray-300 bg-transparent",
        className,
      )}
      aria-hidden
    >
      {selected ? <SingleChoiceCheckMark /> : null}
    </span>
  );
}
