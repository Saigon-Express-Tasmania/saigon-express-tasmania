import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type DashboardAccent =
  | 'indigo'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'violet';

const accentStyles: Record<
  DashboardAccent,
  { bar: string; iconWrap: string }
> = {
  indigo: {
    bar: 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600',
    iconWrap: 'bg-white/20 text-white ring-1 ring-white/25',
  },
  blue: {
    bar: 'bg-gradient-to-r from-blue-600 via-blue-500 to-sky-600',
    iconWrap: 'bg-white/20 text-white ring-1 ring-white/25',
  },
  emerald: {
    bar: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600',
    iconWrap: 'bg-white/20 text-white ring-1 ring-white/25',
  },
  amber: {
    bar: 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500',
    iconWrap: 'bg-white/20 text-white ring-1 ring-white/25',
  },
  rose: {
    bar: 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-500',
    iconWrap: 'bg-white/20 text-white ring-1 ring-white/25',
  },
  sky: {
    bar: 'bg-gradient-to-r from-sky-600 via-cyan-500 to-blue-500',
    iconWrap: 'bg-white/20 text-white ring-1 ring-white/25',
  },
  violet: {
    bar: 'bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-600',
    iconWrap: 'bg-white/20 text-white ring-1 ring-white/25',
  },
};

export type DashboardSectionCardProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  accent: DashboardAccent;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardSectionCard({
  title,
  description,
  icon: Icon,
  accent,
  action,
  children,
  className,
}: DashboardSectionCardProps) {
  const styles = accentStyles[accent];

  return (
    <Card
      className={cn(
        'h-full min-w-0 gap-0 overflow-hidden py-0 shadow-sm ring-1 ring-black/5',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-start justify-between gap-4 px-5 py-4 text-white',
          styles.bar,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              styles.iconWrap,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-tight tracking-tight">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm leading-snug text-white/85">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
      </div>
      <CardContent className="flex min-w-0 flex-1 flex-col px-5 py-5">
        {children}
      </CardContent>
    </Card>
  );
}

export function DashboardViewAllLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn(
        'border-white/35 bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white',
        className,
      )}
    >
      {children}
    </Button>
  );
}
