import type { ReactNode } from "react";
import type { ItemCustomisation, ProductCustomizationsCatalog } from "@/lib/product-customizations";
import { getCustomisationSummaryGroups } from "@/lib/product-customizations";
import { cn } from "@/lib/utils";

type CustomisationSummaryProps = {
  customisation: ItemCustomisation;
  catalog?: ProductCustomizationsCatalog;
  variant?: "light" | "dark";
  compact?: boolean;
  className?: string;
};

function joinNodes(
  nodes: ReactNode[],
  renderSeparator: (index: number) => ReactNode,
): ReactNode[] {
  return nodes.flatMap((node, index) =>
    index === 0 ? [node] : [renderSeparator(index), node],
  );
}

function OptionSeparator({ isLight }: { isLight: boolean }) {
  return (
    <span className="mx-1 inline-flex items-center align-middle" aria-hidden>
      <span
        className={cn(
          "h-[3px] w-[3px] rounded-full",
          isLight ? "bg-gray-300" : "bg-white/35",
        )}
      />
    </span>
  );
}

function GroupSeparator({ isLight }: { isLight: boolean }) {
  return (
    <span className="mx-1.5 inline-flex items-center align-middle" aria-hidden>
      <span
        className={cn(
          "h-px w-3 rounded-full",
          isLight ? "bg-gray-400/55" : "bg-white/30",
        )}
      />
    </span>
  );
}

export default function CustomisationSummary({
  customisation,
  catalog,
  variant = "dark",
  compact = false,
  className,
}: CustomisationSummaryProps) {
  const { note, extraPrice } = customisation;
  const groups = getCustomisationSummaryGroups(customisation, catalog);
  const multipleGroups = groups.length > 1;

  if (groups.length === 0 && !note) return null;

  const isLight = variant === "light";
  const lineClass = cn(
    compact ? "text-[10px] leading-snug" : "text-xs leading-relaxed",
    isLight ? "text-gray-500" : "text-white/40",
  );
  const titleClass = cn(
    "font-semibold",
    isLight ? "text-emerald-900/75" : "text-emerald-300/80",
  );
  const valueClass = cn(isLight ? "text-gray-600" : "text-white/50");

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
            <span className={titleClass}>{group.groupTitle}:</span>{" "}
            {joinNodes(optionNodes, (optionIndex) => (
              <OptionSeparator
                key={`${group.groupKey}-opt-sep-${optionIndex}`}
                isLight={isLight}
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
    <GroupSeparator key={`group-sep-${groupIndex}`} isLight={isLight} />
  ));

  return (
    <div className={cn(compact ? "mt-0.5" : "mt-1", className)}>
      {groupBlocks.length > 0 ? (
        <p className={lineClass}>
          {summaryLine}
          {extraPrice > 0 ? (
            <span
              className={cn(
                "ml-1 font-medium",
                isLight ? "text-emerald-600" : "text-emerald-300",
              )}
            >
              +${extraPrice.toFixed(2)}
            </span>
          ) : null}
        </p>
      ) : null}
      {note ? (
        <p
          className={cn(
            compact ? "text-[10px] leading-snug" : "text-[11px]",
            "italic",
            isLight ? "text-gray-400" : "text-white/35",
          )}
        >
          &ldquo;{note}&rdquo;
        </p>
      ) : null}
    </div>
  );
}
