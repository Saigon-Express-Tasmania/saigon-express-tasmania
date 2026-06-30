import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FormFieldLabelProps = {
  label: string;
  required?: boolean;
  filled?: boolean;
  className?: string;
};

export function FormFieldLabel({
  label,
  required = false,
  filled = false,
  className,
}: FormFieldLabelProps) {
  const showRequired = required && !filled;
  const showComplete = required && filled;

  return (
    <span
      className={cn(
        "flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/45",
        className,
      )}
    >
      <span>{label}</span>
      {showRequired ? (
        <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-white shadow-sm">
          Required
        </span>
      ) : null}
      {showComplete ? (
        <span
          className="inline-flex items-center rounded-full bg-green-600 px-1.5 py-0.5 text-white shadow-sm"
          aria-label="Complete"
        >
          <CheckCircle2 className="h-3 w-3" />
        </span>
      ) : null}
    </span>
  );
}
