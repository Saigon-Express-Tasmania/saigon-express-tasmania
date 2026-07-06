import type { AdminCategoryFilterSection } from '@/lib/category-filter-sections';
import type { AdminCategoryOption } from '@/lib/categories';

export const TAXONOMY_LABEL_SEPARATOR = ' / ';

export type TaxonomyFilterOption = {
  id: number;
  label: string;
  sortOrder?: number;
};

export function parseTaxonomyLabel(label: string): {
  prefix: string | null;
  child: string;
} {
  const index = label.indexOf(TAXONOMY_LABEL_SEPARATOR);
  if (index === -1) {
    return { prefix: null, child: label };
  }

  return {
    prefix: label.slice(0, index).trim() || null,
    child:
      label.slice(index + TAXONOMY_LABEL_SEPARATOR.length).trim() || label,
  };
}

function compareTaxonomy(
  a: TaxonomyFilterOption,
  b: TaxonomyFilterOption,
): number {
  const aOrder = a.sortOrder ?? 0;
  const bOrder = b.sortOrder ?? 0;
  const aExplicit = aOrder !== 0;
  const bExplicit = bOrder !== 0;
  if (aExplicit && bExplicit) return aOrder - bOrder;
  if (aExplicit !== bExplicit) return aExplicit ? -1 : 1;
  return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
}

function groupSortKey(categories: TaxonomyFilterOption[]): number {
  const explicitOrders = categories
    .map((category) => category.sortOrder ?? 0)
    .filter((order) => order !== 0);
  if (explicitOrders.length === 0) return Number.MAX_SAFE_INTEGER;
  return Math.min(...explicitOrders);
}

function categoryNameMatchesGroupPrefix(
  taxonomy: TaxonomyFilterOption,
  prefix: string,
): boolean {
  const parsed = parseTaxonomyLabel(taxonomy.label);
  if (parsed.prefix) return false;
  return (
    parsed.child.localeCompare(prefix, undefined, { sensitivity: 'base' }) ===
    0
  );
}

function toCategoryOption(
  taxonomy: TaxonomyFilterOption,
  displayName: string,
  index: number,
): AdminCategoryOption {
  return {
    id: taxonomy.id,
    name: displayName,
    kind: '',
    categoryGroupId: null,
    sortOrder: taxonomy.sortOrder ?? index,
  };
}

export function buildTaxonomyFilterSections(
  taxonomies: readonly TaxonomyFilterOption[],
  options?: { useChildLabel?: boolean },
): AdminCategoryFilterSection[] {
  const useChildLabel = options?.useChildLabel ?? true;
  const sorted = [...taxonomies].sort(compareTaxonomy);
  const groupsMap = new Map<string, TaxonomyFilterOption[]>();
  const orphans: TaxonomyFilterOption[] = [];

  for (const taxonomy of sorted) {
    const { prefix } = parseTaxonomyLabel(taxonomy.label);
    if (!prefix) {
      orphans.push(taxonomy);
      continue;
    }

    const list = groupsMap.get(prefix) ?? [];
    list.push(taxonomy);
    groupsMap.set(prefix, list);
  }

  const groups = [...groupsMap.entries()]
    .map(([prefix, categories]) => ({
      prefix,
      categories: [...categories].sort(compareTaxonomy),
    }))
    .sort((a, b) => {
      const aKey = groupSortKey(a.categories);
      const bKey = groupSortKey(b.categories);
      const aExplicit = aKey !== Number.MAX_SAFE_INTEGER;
      const bExplicit = bKey !== Number.MAX_SAFE_INTEGER;
      if (aExplicit && bExplicit && aKey !== bKey) return aKey - bKey;
      if (aExplicit !== bExplicit) return aExplicit ? -1 : 1;
      return a.prefix.localeCompare(b.prefix, undefined, {
        sensitivity: 'base',
      });
    });

  const linkedParentIds = new Set<number>();
  for (const group of groups) {
    const parentCategory = orphans.find((taxonomy) =>
      categoryNameMatchesGroupPrefix(taxonomy, group.prefix),
    );
    if (parentCategory) {
      linkedParentIds.add(parentCategory.id);
    }
  }

  const filteredOrphans = orphans
    .filter((taxonomy) => !linkedParentIds.has(taxonomy.id))
    .sort(compareTaxonomy);

  const sections: AdminCategoryFilterSection[] = [];
  let groupIdCounter = 1;

  for (const group of groups) {
    sections.push({
      type: 'group',
      groupId: groupIdCounter++,
      groupName: group.prefix,
      categories: group.categories.map((taxonomy, index) => {
        const displayName = useChildLabel
          ? parseTaxonomyLabel(taxonomy.label).child
          : taxonomy.label;
        return toCategoryOption(taxonomy, displayName, index);
      }),
    });
  }

  if (filteredOrphans.length > 0) {
    sections.push({
      type: 'orphans',
      categories: filteredOrphans.map((taxonomy, index) =>
        toCategoryOption(taxonomy, taxonomy.label, index),
      ),
    });
  }

  return sections;
}

export function taxonomyLabelById(
  taxonomies: readonly TaxonomyFilterOption[],
): Map<number, string> {
  return new Map(taxonomies.map((taxonomy) => [taxonomy.id, taxonomy.label]));
}
