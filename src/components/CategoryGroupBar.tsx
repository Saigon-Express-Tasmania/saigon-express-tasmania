"use client";

import {
  buildCategoryBarItems,
  categoryGroupBarAccent,
  isCategoryActiveInBarItem,
  type CategoryBarItem,
} from "@/lib/category-bar";
import { cn } from "@/lib/utils";
import type { SiteCategory, SiteCategoryGroup } from "@/types";
import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type CategoryGroupBarVariant = "brand" | "wholesale" | "member";

export type CategoryGroupBarProps = {
  id?: string;
  className?: string;
  allLabel: string;
  activeCategoryId: number | null;
  onCategorySelect: (categoryId: number | null) => void;
  categories: SiteCategory[];
  categoryGroups: SiteCategoryGroup[];
  variant?: CategoryGroupBarVariant;
  renderCategoryLeading?: (category: SiteCategory) => ReactNode;
};

function useVariantStyles(variant: CategoryGroupBarVariant) {
  return useMemo(() => {
    if (variant === "brand") {
      return {
        allActive:
          "bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/20",
        allIdle:
          "bg-white text-brand-dark/70 border-gray-200 hover:border-brand-red/40 hover:text-brand-dark",
        orphanActive:
          "bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/20",
        orphanIdle:
          "bg-white text-brand-dark/70 border-gray-200 hover:border-brand-red/40 hover:text-brand-dark",
        dropdownActive: "bg-brand-red/10 text-brand-red font-semibold",
        dropdownIdle:
          "text-brand-dark/80 hover:bg-brand-red/5 hover:text-brand-dark",
        groupRing: "ring-brand-red/70",
      };
    }

    if (variant === "member") {
      return {
        allActive: "bg-primary text-white border-primary shadow-md",
        allIdle:
          "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900 bg-white",
        orphanActive: "bg-primary text-white border-primary shadow-md",
        orphanIdle:
          "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900 bg-white",
        dropdownActive: "bg-primary/10 text-primary font-semibold",
        dropdownIdle: "text-gray-700 hover:bg-primary/5 hover:text-gray-900",
        groupRing: "ring-primary/70",
      };
    }

    return {
      allActive: "bg-foreground text-background border-foreground shadow-md",
      allIdle:
        "border-border text-muted-foreground hover:border-primary/50 hover:text-primary bg-background",
      orphanActive: "bg-foreground text-background border-foreground shadow-md",
      orphanIdle:
        "border-border text-muted-foreground hover:border-primary/50 hover:text-primary bg-background",
      dropdownActive: "bg-primary/10 text-primary font-semibold",
      dropdownIdle: "text-foreground/80 hover:bg-muted hover:text-foreground",
      groupRing: "ring-primary/60",
    };
  }, [variant]);
}

export default function CategoryGroupBar({
  id,
  className,
  allLabel,
  activeCategoryId,
  onCategorySelect,
  categories,
  categoryGroups,
  variant = "brand",
  renderCategoryLeading,
}: CategoryGroupBarProps) {
  const styles = useVariantStyles(variant);
  const barRef = useRef<HTMLDivElement>(null);
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);

  const barItems = useMemo(
    () => buildCategoryBarItems(categories, categoryGroups),
    [categories, categoryGroups],
  );

  const isAllActive = activeCategoryId == null;

  const closeDropdown = useCallback(() => {
    setOpenGroupId(null);
  }, []);

  const handleCategorySelect = useCallback(
    (categoryId: number | null) => {
      onCategorySelect(categoryId);
      closeDropdown();
    },
    [closeDropdown, onCategorySelect],
  );

  useEffect(() => {
    if (openGroupId == null) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closeDropdown, openGroupId]);

  let groupAccentIndex = 0;

  const renderGroup = (item: Extract<CategoryBarItem, { kind: "group" }>) => {
    const accent = categoryGroupBarAccent(groupAccentIndex++);
    const isOpen = openGroupId === item.id;
    const isActive = isCategoryActiveInBarItem(item, activeCategoryId);

    return (
      <div
        key={`group-${item.id}`}
        className="relative shrink-0"
        onMouseEnter={() => setOpenGroupId(item.id)}
        onMouseLeave={() =>
          setOpenGroupId((current) => (current === item.id ? null : current))
        }
      >
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          onClick={() =>
            setOpenGroupId((current) => (current === item.id ? null : item.id))
          }
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all",
            accent,
            isActive && `ring-2 ring-offset-2 ${styles.groupRing}`,
            isOpen && "scale-[1.02] shadow-xl",
          )}
        >
          <span className="max-w-[12rem] truncate">{item.name}</span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 opacity-90 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen ? (
          <div className="absolute left-0 top-full z-50 pt-2">
            <div
              role="listbox"
              className="min-w-[min(100%,14rem)] overflow-hidden rounded-xl border border-black/5 bg-white py-1.5 shadow-2xl"
            >
              {item.categories.map((category) => {
                const selected = activeCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleCategorySelect(category.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors",
                      selected ? styles.dropdownActive : styles.dropdownIdle,
                    )}
                  >
                    {renderCategoryLeading?.(category)}
                    <span className="truncate">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderOrphan = (item: Extract<CategoryBarItem, { kind: "orphan" }>) => {
    const selected = activeCategoryId === item.category.id;
    return (
      <button
        key={`orphan-${item.category.id}`}
        type="button"
        onClick={() => handleCategorySelect(item.category.id)}
        className={cn(
          "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
          selected ? styles.orphanActive : styles.orphanIdle,
        )}
      >
        {item.category.name}
      </button>
    );
  };

  return (
    <div id={id} ref={barRef} className={cn("relative", className)}>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap md:overflow-visible">
        <button
          type="button"
          onClick={() => handleCategorySelect(null)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
            isAllActive ? styles.allActive : styles.allIdle,
          )}
        >
          {allLabel}
        </button>

        {barItems.map((item) =>
          item.kind === "group" ? renderGroup(item) : renderOrphan(item),
        )}
      </div>
    </div>
  );
}
