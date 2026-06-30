import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ElementType, ReactNode } from 'react';
import {
  SALES_ORDER_ACCENT_DOT_CLASS,
  SALES_ORDER_INNER_HEADER_CLASS,
  SALES_ORDER_OUTER_HEADER_CLASS,
  type SalesOrderSectionAccent,
} from './salesOrderUi';

export const salesOrderFormGridClass = 'grid gap-4 md:grid-cols-2';

const formControlClass =
  'w-full min-w-0 [&_[data-slot=select]]:w-full [&_[data-slot=select-trigger]]:w-full [&_input]:w-full [&_textarea]:w-full';

export function displayValue(value: ReactNode): ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' && value.trim() === '') return '—';
  return value;
}

type SalesOrderSectionHeadingProps = {
  title: string;
  accent?: SalesOrderSectionAccent;
  size?: 'inner' | 'outer';
  as?: ElementType;
  className?: string;
  /** Stretch outer header edge-to-edge within a padded container. */
  bleed?: boolean;
};

export function SalesOrderSectionHeading({
  title,
  accent = 'emerald',
  size = 'inner',
  as: Tag = size === 'outer' ? 'h2' : 'h3',
  className,
  bleed = false,
}: SalesOrderSectionHeadingProps) {
  const isOuter = size === 'outer';

  const heading = (
    <Tag
      className={cn(
        'flex items-center font-semibold tracking-tight',
        isOuter
          ? 'w-full gap-2.5 py-2.5 text-lg'
          : 'inline-flex w-fit max-w-full gap-2 rounded-md px-2.5 py-1 text-sm',
        isOuter && bleed ? 'px-6' : isOuter ? 'px-4' : null,
        isOuter
          ? SALES_ORDER_OUTER_HEADER_CLASS[accent]
          : SALES_ORDER_INNER_HEADER_CLASS[accent],
        isOuter && bleed && 'rounded-none',
        className,
      )}
    >
      <span
        className={cn(
          'shrink-0 rounded-full',
          isOuter ? 'h-2 w-2' : 'h-1.5 w-1.5',
          SALES_ORDER_ACCENT_DOT_CLASS[accent],
        )}
        aria-hidden
      />
      {title}
    </Tag>
  );

  if (isOuter && bleed) {
    return <div className="-mx-6">{heading}</div>;
  }

  return heading;
}

type SalesOrderFormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  accent?: SalesOrderSectionAccent;
};

export function SalesOrderFormSection({
  title,
  description,
  children,
  className,
  accent = 'emerald',
}: SalesOrderFormSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <SalesOrderSectionHeading title={title} accent={accent} size="inner" />
        {description ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
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
    <div className={cn('grid min-w-0 gap-1.5', className)}>
      {readOnly ? (
        <>
          {label ? (
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          ) : null}
          <div
            className={cn(
              'min-h-9 rounded-md border border-border/50 bg-muted/25 px-3 py-2 text-sm text-foreground',
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
