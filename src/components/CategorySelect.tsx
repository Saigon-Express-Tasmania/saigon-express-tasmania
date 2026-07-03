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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CategoryIcon } from "@/components/CategoryIcon";
import {
  buildCategoryBarItems,
  getCategoryNavVariantStyles,
  type CategoryNavVariant,
} from "@/lib/category-bar";
import { cn } from "@/lib/utils";
import type { SiteCategory, SiteCategoryGroup } from "@/types";

export type CategorySelectProps = {
  allLabel: string;
  activeCategory: string;
  onCategorySelect: (categoryName: string) => void;
  categories: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  getCategoryIcon: (categoryName: string) => string | null;
  getCategoryIconFallback: (categoryName: string) => "all" | "category";
  variant?: CategoryNavVariant;
  className?: string;
};

export default function CategorySelect({
  allLabel,
  activeCategory,
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
}: CategorySelectProps) {
  const styles = getCategoryNavVariantStyles(variant);
  const listboxId = useId();
  const [open, setOpen] = useState(false);

  const barItems = useMemo(
    () => buildCategoryBarItems(categories, categoryGroups),
    [categories, categoryGroups],
  );

  const isAllActive = activeCategory === allLabel;

  const handleSelect = (categoryName: string) => {
    onCategorySelect(categoryName);
    setOpen(false);
  };

  const renderOptionIcon = (categoryName: string) => (
    <CategoryIcon
      icon={getCategoryIcon(categoryName)}
      fallback={getCategoryIconFallback(categoryName)}
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
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
            {renderOptionIcon(activeCategory)}
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-semibold",
                styles.triggerText,
              )}
            >
              {activeCategory || placeholder}
            </span>
            <ChevronsUpDown
              className={cn("size-4 shrink-0", styles.triggerChevron)}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-50 w-[var(--radix-popover-trigger-width)] border-gray-200 bg-white p-0 shadow-xl"
        >
          <Command
            id={listboxId}
            className="bg-white"
            filter={(value, query) => {
              const haystack = value.toLowerCase();
              return haystack.includes(query.trim().toLowerCase()) ? 1 : 0;
            }}
          >
            <div className="border-b border-gray-100 px-3 py-2.5">
              <CommandInput
                placeholder={searchPlaceholder}
                className={cn(
                  "h-9 w-full rounded-md border-0 bg-transparent text-sm outline-none",
                  styles.commandText,
                  styles.commandPlaceholder,
                )}
              />
            </div>
            <CommandList className="max-h-72 overflow-y-auto p-1.5">
              <CommandEmpty
                className={cn(
                  "px-3 py-8 text-center text-sm",
                  styles.commandEmpty,
                )}
              >
                {emptyMessage}
              </CommandEmpty>

              <CommandItem
                value={allLabel}
                onSelect={() => handleSelect(allLabel)}
                className={optionItemClass}
              >
                <Check
                  className={cn(
                    "size-4 shrink-0",
                    styles.check,
                    isAllActive ? "opacity-100" : "opacity-0",
                  )}
                />
                {renderOptionIcon(allLabel)}
                <span className="truncate font-medium">{allLabel}</span>
              </CommandItem>

              {barItems.map((item) => {
                if (item.kind === "orphan") {
                  const categoryName = item.category.name;
                  const selected = activeCategory === categoryName;
                  return (
                    <CommandItem
                      key={`orphan-${item.category.id}`}
                      value={categoryName}
                      onSelect={() => handleSelect(categoryName)}
                      className={optionItemClass}
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          styles.check,
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {renderOptionIcon(categoryName)}
                      <span className="truncate">{categoryName}</span>
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
                      const selected = activeCategory === category.name;
                      return (
                        <CommandItem
                          key={category.id}
                          value={`${item.name} ${category.name}`}
                          onSelect={() => handleSelect(category.name)}
                          className={optionItemClass}
                        >
                          <Check
                            className={cn(
                              "size-4 shrink-0",
                              styles.check,
                              selected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {renderOptionIcon(category.name)}
                          <span className="truncate">{category.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
