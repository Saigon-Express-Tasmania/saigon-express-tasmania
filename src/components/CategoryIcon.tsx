import { LayoutGrid, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

function isSvgMarkup(value: string): boolean {
  return value.trim().toLowerCase().includes("<svg");
}

type CategoryIconProps = {
  icon?: string | null;
  className?: string;
  fallbackClassName?: string;
  fallback?: "category" | "all";
  accent?: boolean;
};

export function CategoryIcon({
  icon,
  className,
  fallbackClassName,
  fallback = "category",
  accent = false,
}: CategoryIconProps) {
  const trimmed = icon?.trim();
  const accentClasses = accent
    ? "text-brand-red [&>svg]:fill-brand-red [&>svg]:stroke-brand-red"
    : "";

  if (trimmed && isSvgMarkup(trimmed)) {
    return (
      <span
        className={cn(
          "category-icon inline-flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full",
          accentClasses,
          className,
        )}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }

  if (trimmed) {
    return (
      <span
        className={cn(
          "category-icon inline-flex shrink-0 items-center justify-center leading-none",
          accentClasses,
          className,
        )}
        aria-hidden
      >
        {trimmed}
      </span>
    );
  }

  const FallbackIcon = fallback === "all" ? LayoutGrid : UtensilsCrossed;

  return (
    <FallbackIcon
      className={cn(
        "category-icon shrink-0",
        accent && "text-brand-red",
        fallbackClassName ?? className,
      )}
      aria-hidden
    />
  );
}
