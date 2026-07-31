"use client";

import { useId, useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  buildCategoryBarItems,
  getActiveCategoryLabel,
  getCategoryNavVariantStyles,
  type CategoryNavVariant,
} from "@/lib/category-bar";
import { cn } from "@/lib/utils";
import type { SiteCategory, SiteCategoryGroup } from "@/types";

export type CategorySelectProps = {
  allLabel: string;
  activeCategoryId: number | null;
  onCategorySelect: (categoryId: number | null) => void;
  categories: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  getCategoryIcon: (categoryId: number | null) => string | null;
  getCategoryIconFallback: (categoryId: number | null) => "all" | "category";
  variant?: CategoryNavVariant;
  className?: string;
  /** When false, hides the "All products" option. Default true. */
  showAllOption?: boolean;
  onCategoryPrefetch?: (categoryId: number) => void;
};

export default function CategorySelect({
  allLabel,
  activeCategoryId,
  onCategorySelect,
  categories,
  categoryGroups,
  label,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  getCategoryIcon,
  getCategoryIconFallback,
  variant = "brand",
  className,
  showAllOption = true,
  onCategoryPrefetch,
}: CategorySelectProps) {
  const styles = getCategoryNavVariantStyles(variant);
  const listboxId = useId();
  const [open, setOpen] = useState(false);

  const barItems = useMemo(
    () => buildCategoryBarItems(categories, categoryGroups),
    [categories, categoryGroups],
  );

  const activeCategoryLabel = getActiveCategoryLabel(
    activeCategoryId,
    allLabel,
    categories,
  );
  const isAllActive = activeCategoryId == null;

  const handleSelect = (categoryId: number | null) => {
    onCategorySelect(categoryId);
    setOpen(false);
  };

  const renderOptionIcon = (categoryId: number | null) => (
    <CategoryIcon
      icon={getCategoryIcon(categoryId)}
      fallback={getCategoryIconFallback(categoryId)}
      accent={variant === "brand"}
      className="size-5 shrink-0 text-base"
      fallbackClassName="size-3.5"
    />
  );

  const optionItemClass = cn(
    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm",
    styles.optionItem,
  );

  return (
    <div className={cn("space-y-2", className)}>
      <span
        className={cn(
          "block text-xs font-bold uppercase tracking-wider",
          styles.label,
        )}
      >
        {label}
      </span>
      <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground>
        <DrawerTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            className={cn(
              "flex h-12 w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left shadow-sm transition-colors",
              styles.triggerHover,
              styles.triggerFocus,
              open && styles.triggerOpen,
            )}
          >
            {renderOptionIcon(activeCategoryId)}
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-semibold",
                styles.triggerText,
              )}
            >
              {activeCategoryLabel || placeholder}
            </span>
            <ChevronsUpDown
              className={cn("size-4 shrink-0", styles.triggerChevron)}
            />
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[75dvh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>{label}</DrawerTitle>
          </DrawerHeader>
          <Command
            id={listboxId}
            className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
            filter={(value, query) => {
              const haystack = value.toLowerCase();
              return haystack.includes(query.trim().toLowerCase()) ? 1 : 0;
            }}
          >
            <div className="border-b border-gray-100 px-1 py-2.5">
              <CommandInput
                placeholder={searchPlaceholder}
                className={cn(
                  "h-9 w-full rounded-md border-0 bg-transparent text-sm outline-none",
                  styles.commandText,
                  styles.commandPlaceholder,
                )}
              />
            </div>
            <CommandList className="min-h-0 flex-1 overflow-y-auto p-1.5">
              <CommandEmpty
                className={cn(
                  "px-3 py-8 text-center text-sm",
                  styles.commandEmpty,
                )}
              >
                {emptyMessage}
              </CommandEmpty>

              {showAllOption ? (
                <CommandItem
                  value={allLabel}
                  onSelect={() => handleSelect(null)}
                  className={optionItemClass}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      styles.check,
                      isAllActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {renderOptionIcon(null)}
                  <span className="truncate font-medium">{allLabel}</span>
                </CommandItem>
              ) : null}

              {barItems.map((item) => {
                if (item.kind === "orphan") {
                  const category = item.category;
                  const selected = activeCategoryId === category.id;
                  return (
                    <CommandItem
                      key={`orphan-${category.id}`}
                      value={category.name}
                      onSelect={() => handleSelect(category.id)}
                      onMouseEnter={
                        onCategoryPrefetch
                          ? () => onCategoryPrefetch(category.id)
                          : undefined
                      }
                      className={optionItemClass}
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          styles.check,
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {renderOptionIcon(category.id)}
                      <span className="truncate">{category.name}</span>
                    </CommandItem>
                  );
                }

                return (
                  <CommandGroup
                    key={`group-${item.id}`}
                    heading={item.name}
                    className={cn(
                      "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider",
                      variant === "member" &&
                        "[&_[cmdk-group-heading]]:text-gray-500",
                      variant === "wholesale" &&
                        "[&_[cmdk-group-heading]]:text-muted-foreground",
                      variant === "brand" &&
                        "[&_[cmdk-group-heading]]:text-brand-dark/45",
                    )}
                  >
                    {item.categories.map((category) => {
                      const selected = activeCategoryId === category.id;
                      return (
                        <CommandItem
                          key={category.id}
                          value={`${item.name} ${category.name}`}
                          onSelect={() => handleSelect(category.id)}
                          onMouseEnter={
                            onCategoryPrefetch
                              ? () => onCategoryPrefetch(category.id)
                              : undefined
                          }
                          className={optionItemClass}
                        >
                          <Check
                            className={cn(
                              "size-4 shrink-0",
                              styles.check,
                              selected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {renderOptionIcon(category.id)}
                          <span className="truncate">{category.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
