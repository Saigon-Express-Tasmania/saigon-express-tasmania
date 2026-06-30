import type { ReactNode } from 'react';
import {
  getCustomisationSummaryGroups,
  type ItemCustomisation,
} from '@/lib/order-item-customisation';
import { cn } from '@/lib/utils';

type SalesOrderItemCustomisationSummaryProps = {
  customisation: ItemCustomisation;
  compact?: boolean;
  className?: string;
  hideNote?: boolean;
};

function joinNodes(
  nodes: ReactNode[],
  renderSeparator: (index: number) => ReactNode,
): ReactNode[] {
  return nodes.flatMap((node, index) =>
    index === 0 ? [node] : [renderSeparator(index), node],
  );
}

function OptionSeparator({ separatorKey }: { separatorKey: string }) {
  return (
    <span key={separatorKey} className="mx-1 inline-flex items-center align-middle" aria-hidden>
      <span className="h-[3px] w-[3px] rounded-full bg-emerald-400/50 dark:bg-emerald-500/40" />
    </span>
  );
}

function GroupSeparator({ separatorKey }: { separatorKey: string }) {
  return (
    <span key={separatorKey} className="mx-1.5 inline-flex items-center align-middle" aria-hidden>
      <span className="h-px w-3 rounded-full bg-border/80" />
    </span>
  );
}

export function SalesOrderItemCustomisationSummary({
  customisation,
  compact = true,
  className,
  hideNote = false,
}: SalesOrderItemCustomisationSummaryProps) {
  const { note, extraPrice } = customisation;
  const groups = getCustomisationSummaryGroups(customisation);
  const multipleGroups = groups.length > 1;
  const showNote = !hideNote && note.trim();

  if (groups.length === 0 && !showNote) return null;

  const lineClass = cn(
    compact ? 'text-[10px] leading-snug' : 'text-xs leading-relaxed',
    'text-muted-foreground',
  );
  const titleClass = 'font-semibold text-emerald-800/90 dark:text-emerald-300/90';
  const valueClass = 'text-foreground/75';

  const groupBlocks = groups.map((group) => {
    const showGroupTitle =
      group.optionLabels.length > 1 || multipleGroups;
    const optionNodes = group.optionLabels.map((label, optionIndex) => (
      <span
        key={`${group.groupKey}-${optionIndex}`}
        className={valueClass}
      >
        {label}
      </span>
    ));

    return (
      <span key={group.groupKey}>
        {showGroupTitle ? (
          <>
            <span className={titleClass}>{group.groupTitle}:</span>{' '}
            {joinNodes(optionNodes, (optionIndex) => (
              <OptionSeparator
                separatorKey={`${group.groupKey}-opt-sep-${optionIndex}`}
              />
            ))}
          </>
        ) : (
          optionNodes[0]
        )}
      </span>
    );
  });

  const summaryLine = joinNodes(groupBlocks, (groupIndex) => (
    <GroupSeparator separatorKey={`group-sep-${groupIndex}`} />
  ));

  return (
    <div className={cn(compact ? 'mt-1' : 'mt-1.5', className)}>
      {groupBlocks.length > 0 ? (
        <p className={lineClass}>
          {summaryLine}
          {extraPrice > 0 ? (
            <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">
              +${extraPrice.toFixed(2)}
            </span>
          ) : null}
        </p>
      ) : null}
      {showNote ? (
        <p
          className={cn(
            compact ? 'text-[10px] leading-snug' : 'text-[11px]',
            'mt-0.5 italic text-muted-foreground/80',
          )}
        >
          &ldquo;{note}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
