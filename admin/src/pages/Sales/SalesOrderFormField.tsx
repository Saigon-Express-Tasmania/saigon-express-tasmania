import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export const salesOrderFormGridClass = 'grid gap-4 md:grid-cols-2';

const formControlClass =
  'w-full min-w-0 [&_[data-slot=select]]:w-full [&_[data-slot=select-trigger]]:w-full [&_input]:w-full [&_textarea]:w-full';

export function displayValue(value: ReactNode): ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' && value.trim() === '') return '—';
  return value;
}

type SalesOrderFormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SalesOrderFormSection({
  title,
  description,
  children,
  className,
}: SalesOrderFormSectionProps) {
  return (
    <section className={cn('rounded-lg border bg-muted/20 p-4 shadow-xs', className)}>
      <div className="mb-4 border-b border-border/50 pb-3">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type SalesOrderFormFieldProps = {
  label?: string;
  htmlFor?: string;
  readOnly?: boolean;
  value?: ReactNode;
  className?: string;
  valueClassName?: string;
  children?: ReactNode;
};

export function SalesOrderFormField({
  label,
  htmlFor,
  readOnly = false,
  value,
  className,
  valueClassName,
  children,
}: SalesOrderFormFieldProps) {
  return (
    <div className={cn('grid min-w-0 gap-2', className)}>
      {readOnly ? (
        <>
          {label ? (
            <span className="text-sm font-medium leading-none text-foreground/90">{label}</span>
          ) : null}
          <div
            className={cn(
              'min-h-9 rounded-md border border-input/60 bg-muted/35 px-3 py-2 text-sm text-foreground',
              valueClassName,
            )}
          >
            {displayValue(value)}
          </div>
        </>
      ) : (
        <>
          {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
          {children ? <div className={formControlClass}>{children}</div> : null}
        </>
      )}
    </div>
  );
}
