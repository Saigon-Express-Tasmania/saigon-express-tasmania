import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function displayValue(value: ReactNode): ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' && value.trim() === '') return '—';
  return value;
}

type SalesOrderFormFieldProps = {
  label: string;
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
    <div className={cn('grid gap-2', className)}>
      {readOnly ? (
        <>
          <span className="text-sm font-medium leading-none">{label}</span>
          <p className={cn('text-sm', valueClassName)}>{displayValue(value)}</p>
        </>
      ) : (
        <>
          <Label htmlFor={htmlFor}>{label}</Label>
          {children}
        </>
      )}
    </div>
  );
}
