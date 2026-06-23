import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function DashboardDataTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-md border', className)}>
      <table className="w-full table-fixed text-xs">{children}</table>
    </div>
  );
}

export const dashboardThClass =
  'px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';

export const dashboardTdClass = 'min-w-0 px-2 py-2 align-middle';

export function DashboardTruncate({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="truncate" title={title}>
      {children}
    </div>
  );
}
