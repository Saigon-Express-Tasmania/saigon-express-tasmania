import type { MenuItem } from "@/contexts/CartContext";

export type CustomOption = { id: string; label: string; price: number };

export type OptionGroup = {
  id: string;
  title: string;
  type: "single" | "multi";
  required?: boolean;
  options: CustomOption[];
};

export type ItemCustomisation = {
  selections: Record<string, string[]>;
  qty: number;
  note: string;
  extraPrice: number;
};

export type ProductCustomizationOption = {
  id: number;
  key: string;
  title: string;
  price: number;
  sortOrder: number;
};

export type ProductCustomizationGroup = {
  id: number;
  kind: "menu" | "wholesale" | "catering";
  key: string;
  title: string;
  type: "single" | "multi";
  required: boolean;
  sortOrder: number;
  options: ProductCustomizationOption[];
};

/** id → group, SSR-serializable for client components. */
export type ProductCustomizationsCatalog = Record<
  number,
  ProductCustomizationGroup
>;

function sortOptions(
  options: ProductCustomizationOption[],
): ProductCustomizationOption[] {
  return [...options].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id - b.id;
  });
}

export function mapGroupToOptionGroup(
  group: ProductCustomizationGroup,
): OptionGroup {
  return {
    id: group.key,
    title: group.title,
    type: group.type,
    required: group.required,
    options: sortOptions(group.options).map((opt) => ({
      id: opt.key,
      label: opt.title,
      price: Number(opt.price) || 0,
    })),
  };
}

export function resolveCustomizationIdsForProduct(
  productCustomizationIds: number[] | undefined,
  categoryCustomizationIds: number[] | undefined,
  customizationsDisabled: boolean | undefined,
): number[] {
  if (customizationsDisabled) return [];
  if (productCustomizationIds && productCustomizationIds.length > 0) {
    return productCustomizationIds;
  }
  return categoryCustomizationIds ?? [];
}

export function resolveOptionGroups(
  catalog: ProductCustomizationsCatalog,
  customizationIds: number[],
  kind: ProductCustomizationGroup["kind"] = "menu",
): OptionGroup[] {
  return customizationIds
    .map((id) => catalog[id])
    .filter(
      (group): group is ProductCustomizationGroup =>
        group != null && group.kind === kind,
    )
    .map(mapGroupToOptionGroup);
}

export function resolveOptionGroupsForMenuItem(
  catalog: ProductCustomizationsCatalog,
  item: Pick<
    MenuItem,
    "customizationIds" | "customizationsDisabled" | "category"
  >,
  categoryCustomizationIds: number[],
): OptionGroup[] {
  const ids = resolveCustomizationIdsForProduct(
    item.customizationIds,
    categoryCustomizationIds,
    item.customizationsDisabled,
  );
  return resolveOptionGroups(catalog, ids, "menu");
}

export function initialSelections(
  groups: OptionGroup[],
): Record<string, string[]> {
  const init: Record<string, string[]> = {};
  for (const group of groups) {
    if (group.id.includes("spice")) {
      const medium = group.options.find((opt) => opt.id === "medium");
      init[group.id] = medium ? ["medium"] : [];
    } else {
      init[group.id] = [];
    }
  }
  return init;
}

export function getMissingRequiredOptionGroups(
  groups: OptionGroup[],
  selections: Record<string, string[]>,
): OptionGroup[] {
  return groups.filter(
    (group) => group.required && (selections[group.id] ?? []).length === 0,
  );
}

export function computeExtraPrice(
  groups: OptionGroup[],
  selections: Record<string, string[]>,
): number {
  let total = 0;
  groups.forEach((group) => {
    (selections[group.id] ?? []).forEach((optId) => {
      const opt = group.options.find((option) => option.id === optId);
      if (opt) total += opt.price;
    });
  });
  return total;
}

export function isSpiceGroupKey(groupKey: string): boolean {
  return groupKey.includes("spice");
}

export function isVeggieGroupKey(groupKey: string): boolean {
  return groupKey === "veggies" || groupKey.includes("veggie");
}
