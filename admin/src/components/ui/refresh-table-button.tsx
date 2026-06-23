import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

type RefreshTableButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export function RefreshTableButton({
  onClick,
  disabled,
  className,
  label = 'Refresh',
}: RefreshTableButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <RefreshCw className="size-4" />
      {label}
    </Button>
  );
}

export function DashboardRefreshTableButton({
  onClick,
  disabled,
  className,
  label = 'Refresh',
}: RefreshTableButtonProps) {
  return (
    <RefreshTableButton
      onClick={onClick}
      disabled={disabled}
      label={label}
      className={cn(
        'border-white/35 bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white',
        className,
      )}
    />
  );
}
