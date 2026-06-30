"use client";

import type { MenuItem } from "@/contexts/CartContext";
import type {
  OptionGroup,
  ProductCustomizationsCatalog,
} from "@/lib/product-customizations";
import { resolveOptionGroupsForProduct } from "@/lib/product-customizations";
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
  categories: Pick<SiteCategory, "alias" | "name" | "customizationIds">[];
  categoryKey?: "alias" | "name";
  kind?: "menu" | "wholesale" | "catering";
  children: ReactNode;
};

export function ProductCustomizationsProvider({
  catalog,
  categories,
  categoryKey = "alias",
  kind = "menu",
  children,
}: ProviderProps) {
  const categoryCustomizationIdsByKey = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const category of categories) {
      const key = categoryKey === "name" ? category.name : category.alias;
      map[key] = category.customizationIds ?? [];
    }
    return map;
  }, [categories, categoryKey]);

  const getOptionGroupsForItem = useCallback(
    (item: MenuItem) =>
      resolveOptionGroupsForProduct(
        catalog,
        item,
        categoryCustomizationIdsByKey[item.category] ?? [],
        kind,
      ),
    [catalog, categoryCustomizationIdsByKey, kind],
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

export function useOptionalProductCustomizations(): ProductCustomizationsContextValue | null {
  return useContext(ProductCustomizationsContext);
}
