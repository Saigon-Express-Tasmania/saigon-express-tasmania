import {
  getCustomisationSummaryLabels,
  type ItemCustomisation,
  type ProductCustomizationsCatalog,
} from '@/lib/order-item-customisation';
import { cn } from '@/lib/utils';

type SalesOrderItemCustomisationSummaryProps = {
  customisation: ItemCustomisation;
  catalog?: ProductCustomizationsCatalog;
  className?: string;
};

export function SalesOrderItemCustomisationSummary({
  customisation,
  catalog,
  className,
}: SalesOrderItemCustomisationSummaryProps) {
  const { note, extraPrice } = customisation;
  const labels = getCustomisationSummaryLabels(customisation, catalog);

  if (labels.length === 0 && !note.trim()) return null;

  return (
    <div className={cn('mt-1 space-y-0.5', className)}>
      {labels.length > 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {labels.join(' · ')}
          {extraPrice > 0 ? (
            <span className="ml-1 font-medium text-emerald-600">
              +${extraPrice.toFixed(2)}
            </span>
          ) : null}
        </p>
      ) : null}
      {note.trim() ? (
        <p className="text-xs italic text-muted-foreground/80">&ldquo;{note}&rdquo;</p>
      ) : null}
    </div>
  );
}
