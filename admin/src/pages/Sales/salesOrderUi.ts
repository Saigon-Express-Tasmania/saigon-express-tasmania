import type { OrderStatus, PaymentStatus } from './salesOrderShared';

/** Full-viewport dialog shell used by sales order editors. */
export const SALES_ORDER_FULLSCREEN_DIALOG_CLASS =
  'fixed inset-0 top-0 left-0 z-50 flex h-[100dvh] w-screen max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-lg sm:max-w-none';

export type SalesOrderSectionAccent =
  | 'emerald'
  | 'sky'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'slate';

export const SALES_ORDER_ACCENT_DOT_CLASS: Record<SalesOrderSectionAccent, string> = {
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
};

/** Tinted pill behind inner subsection titles (Order metadata, Customer contact, …). */
export const SALES_ORDER_INNER_HEADER_CLASS: Record<SalesOrderSectionAccent, string> = {
  emerald:
    'bg-emerald-500/12 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100',
  sky: 'bg-sky-500/12 text-sky-900 dark:bg-sky-500/15 dark:text-sky-100',
  violet:
    'bg-violet-500/12 text-violet-900 dark:bg-violet-500/15 dark:text-violet-100',
  amber: 'bg-amber-500/12 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100',
  rose: 'bg-rose-500/12 text-rose-900 dark:bg-rose-500/15 dark:text-rose-100',
  slate: 'bg-slate-500/10 text-slate-800 dark:bg-slate-500/15 dark:text-slate-100',
};

/** Full-width gradient bar for major section titles (Customer, Addresses, Items, …). */
export const SALES_ORDER_OUTER_HEADER_CLASS: Record<SalesOrderSectionAccent, string> = {
  emerald:
    'bg-gradient-to-r from-emerald-500/28 via-emerald-500/12 to-transparent text-emerald-950 dark:from-emerald-500/35 dark:via-emerald-500/16 dark:to-transparent dark:text-emerald-50',
  sky: 'bg-gradient-to-r from-sky-500/28 via-sky-500/12 to-transparent text-sky-950 dark:from-sky-500/35 dark:via-sky-500/16 dark:to-transparent dark:text-sky-50',
  violet:
    'bg-gradient-to-r from-violet-500/28 via-violet-500/12 to-transparent text-violet-950 dark:from-violet-500/35 dark:via-violet-500/16 dark:to-transparent dark:text-violet-50',
  amber:
    'bg-gradient-to-r from-amber-500/28 via-amber-500/12 to-transparent text-amber-950 dark:from-amber-500/35 dark:via-amber-500/16 dark:to-transparent dark:text-amber-50',
  rose: 'bg-gradient-to-r from-rose-500/28 via-rose-500/12 to-transparent text-rose-950 dark:from-rose-500/35 dark:via-rose-500/16 dark:to-transparent dark:text-rose-50',
  slate:
    'bg-gradient-to-r from-slate-500/22 via-slate-500/10 to-transparent text-slate-900 dark:from-slate-500/28 dark:via-slate-500/12 dark:to-transparent dark:text-slate-50',
};

export function orderStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200';
    case 'cancelled':
      return 'border-rose-200 bg-rose-500/15 text-rose-800 dark:text-rose-200';
    case 'awaiting_payment':
      return 'border-amber-200 bg-amber-500/15 text-amber-900 dark:text-amber-100';
    case 'pending':
      return 'border-slate-200 bg-slate-500/10 text-slate-700 dark:text-slate-200';
    case 'confirmed':
    case 'preparing':
    case 'packed':
      return 'border-sky-200 bg-sky-500/15 text-sky-900 dark:text-sky-100';
    case 'ready_to_pickup':
    case 'out_for_delivery':
      return 'border-violet-200 bg-violet-500/15 text-violet-900 dark:text-violet-100';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

export function paymentStatusBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'border-emerald-200 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200';
    case 'unpaid':
      return 'border-amber-200 bg-amber-500/15 text-amber-900 dark:text-amber-100';
    case 'refunded':
      return 'border-rose-200 bg-rose-500/15 text-rose-800 dark:text-rose-200';
    default:
      return 'border-border bg-muted text-foreground';
  }
}
