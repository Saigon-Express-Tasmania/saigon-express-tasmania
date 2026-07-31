"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  buildCategoryBarItems,
  categorySidebarGroupAccent,
  getCategoryNavVariantStyles,
  getCategorySidebarShellClass,
  isCategoryActiveInBarItem,
  type CategoryNavVariant,
} from "@/lib/category-bar";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SiteCategory, SiteCategoryGroup } from "@/types";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { LayoutGrid } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const CATEGORY_SIDEBAR_WIDTH_CLASS =
  "min-w-56 w-64 shrink-0 lg:w-[24vw] lg:max-w-md xl:w-96 2xl:w-128";

/** Stretch column to main content height so inner sticky sidebar can stick while scrolling. */
export const CATEGORY_SIDEBAR_COLUMN_CLASS = cn(
  "hidden self-stretch lg:flex lg:flex-col",
  CATEGORY_SIDEBAR_WIDTH_CLASS,
);

export const CATEGORY_SIDEBAR_ASIDE_CLASS =
  "sticky top-16 z-30 w-full max-h-[calc(100dvh-4rem)] overflow-x-hidden overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable]";

const CATEGORY_SIDEBAR_LABEL_CLASS = "min-w-0 flex-1 truncate";

export type CategorySidebarProps = {
  allLabel: string;
  activeCategoryId: number | null;
  onCategorySelect: (categoryId: number | null) => void;
  categories: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
  variant?: CategoryNavVariant;
  className?: string;
  renderCategoryLeading?: (category: SiteCategory) => ReactNode;
  /** When false, hides the "All products" control. Default true. */
  showAllOption?: boolean;
  /** Prefetch catalog for a category (e.g. on hover/focus). */
  onCategoryPrefetch?: (categoryId: number) => void;
};

type CategorySidebarAsideProps = {
  "aria-label": string;
  variant?: CategoryNavVariant;
  className?: string;
  children: ReactNode;
};

export function CategorySidebarAside({
  "aria-label": ariaLabel,
  variant = "brand",
  className,
  children,
}: CategorySidebarAsideProps) {
  return (
    <aside
      aria-label={ariaLabel}
      className={cn(
        CATEGORY_SIDEBAR_ASIDE_CLASS,
        getCategorySidebarShellClass(variant),
        className,
      )}
    >
      {children}
    </aside>
  );
}

type SidebarCategoryButtonProps = {
  category: SiteCategory;
  selected: boolean;
  onSelect: () => void;
  onPrefetch?: () => void;
  itemButtonClass: (selected: boolean) => string;
  itemHoverClass?: string;
  renderCategoryLeading?: (category: SiteCategory) => ReactNode;
};

function SidebarCategoryButton({
  category,
  selected,
  onSelect,
  onPrefetch,
  itemButtonClass,
  itemHoverClass,
  renderCategoryLeading,
}: SidebarCategoryButtonProps) {
  const description = category.description?.trim();

  return (
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onSelect}
          onMouseEnter={onPrefetch}
          onFocus={onPrefetch}
          className={cn(itemButtonClass(selected), !selected && itemHoverClass)}
        >
          {renderCategoryLeading?.(category)}
          <span className={CATEGORY_SIDEBAR_LABEL_CLASS}>{category.name}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={10}
        className="max-w-72 px-3 py-2.5 text-left"
      >
        <p className="text-sm font-semibold leading-snug">{category.name}</p>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-background/80">
            {description}
          </p>
        ) : null}
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
}

function getDefaultOpenGroupId(
  groupItems: Extract<
    ReturnType<typeof buildCategoryBarItems>[number],
    { kind: "group" }
  >[],
  activeCategoryId: number | null,
): string | undefined {
  if (groupItems.length === 0) return undefined;

  if (activeCategoryId != null) {
    const activeGroup = groupItems.find((item) =>
      isCategoryActiveInBarItem(item, activeCategoryId),
    );
    if (activeGroup) return `group-${activeGroup.id}`;
  }

  return `group-${groupItems[0].id}`;
}

export default function CategorySidebar({
  allLabel,
  activeCategoryId,
  onCategorySelect,
  categories,
  categoryGroups,
  variant = "brand",
  className,
  renderCategoryLeading,
  showAllOption = true,
  onCategoryPrefetch,
}: CategorySidebarProps) {
  const styles = getCategoryNavVariantStyles(variant);

  const barItems = useMemo(
    () => buildCategoryBarItems(categories, categoryGroups),
    [categories, categoryGroups],
  );

  const orphanItems = useMemo(
    () => barItems.filter((item) => item.kind === "orphan"),
    [barItems],
  );
  const groupItems = useMemo(
    () =>
      barItems.filter(
        (item): item is Extract<typeof item, { kind: "group" }> =>
          item.kind === "group",
      ),
    [barItems],
  );

  const [openGroup, setOpenGroup] = useState<string | undefined>(() =>
    getDefaultOpenGroupId(groupItems, activeCategoryId),
  );

  const prevActiveCategoryIdRef = useRef(activeCategoryId);

  useEffect(() => {
    const categoryChanged = prevActiveCategoryIdRef.current !== activeCategoryId;
    prevActiveCategoryIdRef.current = activeCategoryId;

    if (!categoryChanged) return;
    if (activeCategoryId == null) return;

    const activeGroup = groupItems.find((item) =>
      isCategoryActiveInBarItem(item, activeCategoryId),
    );
    if (!activeGroup) return;

    setOpenGroup(`group-${activeGroup.id}`);
  }, [activeCategoryId, groupItems]);

  useEffect(() => {
    if (activeCategoryId == null || groupItems.length === 0) return;

    setOpenGroup((current) => {
      if (current != null) return current;

      return getDefaultOpenGroupId(groupItems, activeCategoryId);
    });
  }, [activeCategoryId, groupItems]);

  const isAllActive = activeCategoryId == null;

  const allIconClass = isAllActive
    ? variant === "brand"
      ? "bg-brand-red/10 text-brand-red"
      : "bg-primary/10 text-primary"
    : variant === "brand"
      ? "bg-gray-100 text-gray-500"
      : "bg-muted text-muted-foreground";

  const itemButtonClass = (selected: boolean) =>
    cn(
      "relative flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
      selected
        ? cn(styles.itemSelected, "shadow-sm")
        : cn(styles.itemIdle, "border border-transparent"),
    );

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        className={cn(
          "flex w-full min-w-0 flex-col gap-3 py-2",
          className,
        )}
      >
        {showAllOption ? (
          <div className="rounded-xl border border-black/[0.04] bg-white/70 p-1.5 shadow-sm backdrop-blur-sm">
            <TooltipPrimitive.Root>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onCategorySelect(null)}
                  className={cn(
                    itemButtonClass(isAllActive),
                    "gap-3 px-3.5 py-2.5 font-medium",
                    isAllActive && "ring-1 ring-inset ring-black/[0.06]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      allIconClass,
                    )}
                  >
                    <LayoutGrid className="size-4" />
                  </span>
                  <span className={CATEGORY_SIDEBAR_LABEL_CLASS}>{allLabel}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={10}
                className="max-w-72 px-3 py-2.5 text-left"
              >
                <p className="text-sm font-semibold leading-snug">{allLabel}</p>
              </TooltipContent>
            </TooltipPrimitive.Root>
          </div>
        ) : null}

        {orphanItems.length > 0 ? (
          <div className="rounded-xl border border-black/[0.04] bg-white/60 p-1.5 shadow-sm">
            <div className="flex flex-col gap-0.5">
              {orphanItems.map((item) => {
                const selected = activeCategoryId === item.category.id;
                return (
                  <SidebarCategoryButton
                    key={`orphan-${item.category.id}`}
                    category={item.category}
                    selected={selected}
                    onSelect={() => onCategorySelect(item.category.id)}
                    onPrefetch={
                      onCategoryPrefetch
                        ? () => onCategoryPrefetch(item.category.id)
                        : undefined
                    }
                    itemButtonClass={itemButtonClass}
                    renderCategoryLeading={renderCategoryLeading}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {groupItems.length > 0 ? (
          <Accordion
            type="single"
            collapsible
            value={openGroup}
            onValueChange={setOpenGroup}
            className="w-full overflow-hidden rounded-xl border border-black/[0.04] bg-white/60 shadow-sm"
          >
            {groupItems.map((item, groupIndex) => {
              const groupActive = isCategoryActiveInBarItem(
                item,
                activeCategoryId,
              );
              const accent = categorySidebarGroupAccent(groupIndex);
              const groupKey = `group-${item.id}`;

              return (
                <AccordionItem
                  key={groupKey}
                  value={groupKey}
                  className="border-black/[0.05] px-1.5 first:pt-1.5 last:pb-1.5"
                >
                  <AccordionTrigger
                    className={cn(
                      "w-full rounded-lg px-2.5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] no-underline hover:no-underline",
                      accent.header,
                      groupActive ? accent.headerActive : accent.label,
                    )}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
                      <span
                        className={cn(
                          "h-5 w-1 shrink-0 rounded-full",
                          accent.bar,
                        )}
                        aria-hidden
                      />
                      <span className={CATEGORY_SIDEBAR_LABEL_CLASS}>
                        {item.name}
                      </span>
                      <span
                        className={cn(
                          "ml-auto mr-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums tracking-normal normal-case",
                          groupActive
                            ? "bg-white/80 text-current"
                            : "bg-black/[0.04] text-current/70",
                        )}
                      >
                        {item.categories.length}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-1.5">
                    <ul className="flex flex-col gap-0.5 border-l-2 border-black/[0.04] pl-2 ml-3.5">
                      {item.categories.map((category) => {
                        const selected = activeCategoryId === category.id;
                        return (
                          <li key={category.id}>
                            <SidebarCategoryButton
                              category={category}
                              selected={selected}
                              onSelect={() => onCategorySelect(category.id)}
                              onPrefetch={
                                onCategoryPrefetch
                                  ? () => onCategoryPrefetch(category.id)
                                  : undefined
                              }
                              itemButtonClass={itemButtonClass}
                              itemHoverClass={accent.itemHover}
                              renderCategoryLeading={renderCategoryLeading}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : null}
      </nav>
    </TooltipProvider>
  );
}
