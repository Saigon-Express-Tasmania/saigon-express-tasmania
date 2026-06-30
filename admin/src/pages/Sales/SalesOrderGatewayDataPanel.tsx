import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

function formatGatewayKey(key: string): string {
  return key
    .replace(/^stripe_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatGatewayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (Number.isInteger(value) && Math.abs(value) > 1_000_000_000) {
      const date = new Date(value * 1000);
      if (!Number.isNaN(date.getTime())) {
        return `${value} (${date.toLocaleString()})`;
      }
    }
    return String(value);
  }
  if (typeof value === 'string') return value.trim() || '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    if (value.every((entry) => typeof entry !== 'object' || entry === null)) {
      return value.map((entry) => formatGatewayValue(entry)).join(', ');
    }
    return JSON.stringify(value, null, 2);
  }
  return JSON.stringify(value, null, 2);
}

function isNestedRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function countGatewayFields(data: Record<string, unknown>): number {
  return Object.entries(data).reduce((count, [, value]) => {
    if (isNestedRecord(value)) {
      return count + countGatewayFields(value);
    }
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((entry) => isNestedRecord(entry))
    ) {
      return (
        count +
        value.reduce(
          (inner, entry) => inner + countGatewayFields(entry as Record<string, unknown>),
          0,
        )
      );
    }
    return count + 1;
  }, 0);
}

function CollapsibleGatewayGroup({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className={cn('min-w-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center gap-1.5 rounded-md py-1 text-left text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform',
            open ? 'rotate-0' : '-rotate-90',
          )}
          aria-hidden
        />
        <span>{title}</span>
      </button>
      {open ? (
        <div id={contentId} className="pt-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function GatewayDataRows({
  data,
  depth = 0,
}: {
  data: Record<string, unknown>;
  depth?: number;
}) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={cn(depth > 0 && 'mt-1 space-y-1 border-l border-border/50 pl-3')}>
      {entries.map(([key, value]) => {
        const nested = isNestedRecord(value);
        const arrayOfObjects =
          Array.isArray(value) &&
          value.length > 0 &&
          value.every((entry) => isNestedRecord(entry));
        const label = formatGatewayKey(key);

        if (nested) {
          return (
            <CollapsibleGatewayGroup
              key={`${depth}-${key}`}
              title={label}
              defaultOpen={depth < 1}
            >
              <GatewayDataRows data={value} depth={depth + 1} />
            </CollapsibleGatewayGroup>
          );
        }

        if (arrayOfObjects) {
          return (
            <CollapsibleGatewayGroup
              key={`${depth}-${key}`}
              title={`${label} (${value.length})`}
              defaultOpen={depth < 1}
            >
              <div className="space-y-2">
                {value.map((entry, index) => (
                  <CollapsibleGatewayGroup
                    key={`${key}-${index}`}
                    title={`${label} ${index + 1}`}
                    defaultOpen={false}
                    className="rounded-md border border-border/50 bg-background/70 px-3 py-1"
                  >
                    <GatewayDataRows
                      data={entry as Record<string, unknown>}
                      depth={depth + 1}
                    />
                  </CollapsibleGatewayGroup>
                ))}
              </div>
            </CollapsibleGatewayGroup>
          );
        }

        return (
          <div
            key={`${depth}-${key}`}
            className="grid gap-x-4 gap-y-1 border-b border-border/40 py-2 last:border-b-0 sm:grid-cols-[minmax(9rem,12rem)_1fr]"
          >
            <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-sm text-foreground">
              <span
                className={cn(
                  'break-all',
                  typeof value === 'string' &&
                    (value.startsWith('http') ||
                      value.startsWith('pi_') ||
                      value.startsWith('cs_'))
                    ? 'font-mono text-xs'
                    : null,
                )}
              >
                {formatGatewayValue(value)}
              </span>
            </dd>
          </div>
        );
      })}
    </div>
  );
}

export function parseGatewayData(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (isNestedRecord(parsed)) return parsed;
      return null;
    } catch {
      return null;
    }
  }

  if (isNestedRecord(value)) return value;
  return null;
}

export function SalesOrderGatewayDataPanel({
  gatewayData,
  className,
  defaultOpen = false,
}: {
  gatewayData: Record<string, unknown> | null;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  const fieldCount = gatewayData ? countGatewayFields(gatewayData) : 0;
  const topLevelCount = gatewayData ? Object.keys(gatewayData).length : 0;

  if (!gatewayData || topLevelCount === 0) {
    return (
      <div className={cn('min-w-0', className)}>
        <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          No gateway data recorded for this payment.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('min-w-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted/40"
      >
        <span className="text-foreground">
          {open ? 'Hide gateway data' : 'Show gateway data'}
        </span>
        <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          {topLevelCount} group{topLevelCount === 1 ? '' : 's'} · {fieldCount} field
          {fieldCount === 1 ? '' : 's'}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-foreground transition-transform',
              open ? 'rotate-180' : 'rotate-0',
            )}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <dl
          id={contentId}
          className="mt-2 divide-y divide-border/40 rounded-lg border border-border/60 bg-muted/20 px-3 py-1"
        >
          <GatewayDataRows data={gatewayData} />
        </dl>
      ) : null}
    </div>
  );
}
