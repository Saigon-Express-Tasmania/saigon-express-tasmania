"use client";

import type { MenuItem } from "@/contexts/CartContext";
import type {
  OptionGroup,
  ProductCustomizationsCatalog,
} from "@/lib/product-customizations";
import { resolveOptionGroupsForMenuItem } from "@/lib/product-customizations";
import type { SiteCategory } from "@/types";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type ProductCustomizationsContextValue = {
  catalog: ProductCustomizationsCatalog;
  getOptionGroupsForItem: (item: MenuItem) => OptionGroup[];
};

const ProductCustomizationsContext =
  createContext<ProductCustomizationsContextValue | null>(null);

type ProviderProps = {
  catalog: ProductCustomizationsCatalog;
  categories: Pick<SiteCategory, "alias" | "customizationIds">[];
  children: ReactNode;
};

export function ProductCustomizationsProvider({
  catalog,
  categories,
  children,
}: ProviderProps) {
  const categoryCustomizationIdsByAlias = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const category of categories) {
      map[category.alias] = category.customizationIds ?? [];
    }
    return map;
  }, [categories]);

  const getOptionGroupsForItem = useCallback(
    (item: MenuItem) =>
      resolveOptionGroupsForMenuItem(
        catalog,
        item,
        categoryCustomizationIdsByAlias[item.category] ?? [],
      ),
    [catalog, categoryCustomizationIdsByAlias],
  );

  const value = useMemo(
    () => ({ catalog, getOptionGroupsForItem }),
    [catalog, getOptionGroupsForItem],
  );

  return (
    <ProductCustomizationsContext.Provider value={value}>
      {children}
    </ProductCustomizationsContext.Provider>
  );
}

export function useProductCustomizations(): ProductCustomizationsContextValue {
  const ctx = useContext(ProductCustomizationsContext);
  if (!ctx) {
    throw new Error(
      "useProductCustomizations must be used within ProductCustomizationsProvider",
    );
  }
  return ctx;
}
