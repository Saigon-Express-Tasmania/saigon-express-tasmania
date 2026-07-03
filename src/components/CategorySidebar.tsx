"use client";

import {
  buildCategoryBarItems,
  getCategoryNavVariantStyles,
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
import { useMemo, type ReactNode } from "react";

export const CATEGORY_SIDEBAR_WIDTH_CLASS =
  "w-[25vw] max-w-[25vw] min-w-52 2xl:w-max 2xl:max-w-none";

/** Stretch column to main content height so inner sticky sidebar can stick while scrolling. */
export const CATEGORY_SIDEBAR_COLUMN_CLASS = cn(
  "hidden shrink-0 self-stretch lg:flex lg:flex-col",
  CATEGORY_SIDEBAR_WIDTH_CLASS,
);

export const CATEGORY_SIDEBAR_ASIDE_CLASS = "sticky top-16 z-30 w-full";

const CATEGORY_SIDEBAR_LABEL_CLASS =
  "min-w-0 truncate 2xl:truncate-none 2xl:whitespace-nowrap";

export type CategorySidebarProps = {
  allLabel: string;
  activeCategory: string;
  onCategorySelect: (categoryName: string) => void;
  categories: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
  variant?: CategoryNavVariant;
  className?: string;
  renderCategoryLeading?: (category: SiteCategory) => ReactNode;
};

type SidebarCategoryButtonProps = {
  category: SiteCategory;
  selected: boolean;
  onSelect: () => void;
  itemButtonClass: (selected: boolean) => string;
  renderCategoryLeading?: (category: SiteCategory) => ReactNode;
};

function SidebarCategoryButton({
  category,
  selected,
  onSelect,
  itemButtonClass,
  renderCategoryLeading,
}: SidebarCategoryButtonProps) {
  const description = category.description?.trim();

  return (
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onSelect}
          className={itemButtonClass(selected)}
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

export default function CategorySidebar({
  allLabel,
  activeCategory,
  onCategorySelect,
  categories,
  categoryGroups,
  variant = "brand",
  className,
  renderCategoryLeading,
}: CategorySidebarProps) {
  const styles = getCategoryNavVariantStyles(variant);

  const barItems = useMemo(
    () => buildCategoryBarItems(categories, categoryGroups),
    [categories, categoryGroups],
  );

  const orphanItems = barItems.filter((item) => item.kind === "orphan");
  const groupItems = barItems.filter((item) => item.kind === "group");

  const isAllActive = activeCategory === allLabel;

  const itemButtonClass = (selected: boolean) =>
    cn(
      "flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors 2xl:w-max 2xl:min-w-full",
      selected ? styles.itemSelected : styles.itemIdle,
    );

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        className={cn(
          "flex w-full min-w-0 flex-col gap-4 py-4 2xl:w-max",
          className,
        )}
      >
        <div>
          <TooltipPrimitive.Root>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onCategorySelect(allLabel)}
                className={itemButtonClass(isAllActive)}
              >
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

        {orphanItems.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {orphanItems.map((item) => {
              const selected = activeCategory === item.category.name;
              return (
                <SidebarCategoryButton
                  key={`orphan-${item.category.id}`}
                  category={item.category}
                  selected={selected}
                  onSelect={() => onCategorySelect(item.category.name)}
                  itemButtonClass={itemButtonClass}
                  renderCategoryLeading={renderCategoryLeading}
                />
              );
            })}
          </div>
        ) : null}

        {groupItems.map((item) => {
          const groupActive = isCategoryActiveInBarItem(item, activeCategory);

          return (
            <div key={`group-${item.id}`}>
              <p
                className={cn(
                  "mb-1 px-3 text-xs font-bold uppercase tracking-wider",
                  CATEGORY_SIDEBAR_LABEL_CLASS,
                  groupActive ? styles.groupActive : styles.groupIdle,
                )}
              >
                {item.name}
              </p>
              <ul className="flex flex-col gap-0.5">
                {item.categories.map((category) => {
                  const selected = activeCategory === category.name;
                  return (
                    <li key={category.id}>
                      <SidebarCategoryButton
                        category={category}
                        selected={selected}
                        onSelect={() => onCategorySelect(category.name)}
                        itemButtonClass={itemButtonClass}
                        renderCategoryLeading={renderCategoryLeading}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
