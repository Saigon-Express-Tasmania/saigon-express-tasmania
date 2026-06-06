import { Button } from '@/components/ui/button';
import { useSalesOrderMode, type SalesOrderMode } from '@/contexts/SalesOrderModeContext';
import { cn } from '@/lib/utils';

const MODES: { value: SalesOrderMode; label: string; compactLabel: string }[] = [
  { value: 'live', label: 'Live', compactLabel: 'L' },
  { value: 'test', label: 'Test', compactLabel: 'T' },
];

export function SalesOrderModeSwitch({ className }: { className?: string }) {
  const { mode, setMode } = useSalesOrderMode();

  return (
    <div
      className={cn(
        'inline-flex rounded border bg-background p-px shadow-sm',
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
          className="h-5 min-w-5 px-1 text-[10px] leading-none font-medium"
          onClick={() => setMode(option.value)}
          title={`${option.label} orders`}
        >
          {option.compactLabel}
        </Button>
      ))}
    </div>
  );
}
