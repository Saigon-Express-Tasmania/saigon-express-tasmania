import type { ItemCustomisation, ProductCustomizationsCatalog } from "@/lib/product-customizations";
import { getCustomisationSummaryLabels } from "@/lib/product-customizations";
import { cn } from "@/lib/utils";

type CustomisationSummaryProps = {
  customisation: ItemCustomisation;
  catalog?: ProductCustomizationsCatalog;
  variant?: "light" | "dark";
  className?: string;
};

export default function CustomisationSummary({
  customisation,
  catalog,
  variant = "dark",
  className,
}: CustomisationSummaryProps) {
  const { note, extraPrice } = customisation;
  const labels = getCustomisationSummaryLabels(customisation, catalog);

  if (labels.length === 0 && !note) return null;

  const isLight = variant === "light";

  return (
    <div className={cn("mt-1 space-y-0.5", className)}>
      {labels.length > 0 ? (
        <p
          className={cn(
            "text-xs leading-relaxed",
            isLight ? "text-gray-600" : "text-white/45",
          )}
        >
          {labels.join(" · ")}
          {extraPrice > 0 ? (
            <span
              className={cn(
                "ml-1 font-medium",
                isLight ? "text-emerald-600" : "text-emerald-300",
              )}
            >
              +${extraPrice.toFixed(2)}
            </span>
          ) : null}
        </p>
      ) : null}
      {note ? (
        <p
          className={cn(
            "text-[11px] italic",
            isLight ? "text-gray-400" : "text-white/35",
          )}
        >
          &ldquo;{note}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
