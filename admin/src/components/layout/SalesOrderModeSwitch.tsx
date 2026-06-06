import { Button } from '@/components/ui/button';
import { useSalesOrderMode, type SalesOrderMode } from '@/contexts/SalesOrderModeContext';
import { cn } from '@/lib/utils';

const MODES: { value: SalesOrderMode; label: string; compactLabel: string }[] = [
  { value: 'live', label: 'Live', compactLabel: 'L' },
  { value: 'test', label: 'Test', compactLabel: 'T' },
];

export function SalesOrderModeSwitch({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { mode, setMode } = useSalesOrderMode();

  return (
    <div
      className={cn(
        'flex rounded-lg border bg-background p-0.5',
        compact ? 'w-full justify-center' : 'w-full',
        className,
      )}
      role="group"
      aria-label="Order data mode"
    >
      {MODES.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={mode === option.value ? 'default' : 'ghost'}
          className={cn(
            'h-7 flex-1 px-2 text-xs',
            compact && 'min-w-0',
          )}
          onClick={() => setMode(option.value)}
          title={compact ? `${option.label} orders` : undefined}
        >
          {compact ? option.compactLabel : option.label}
        </Button>
      ))}
    </div>
  );
}
