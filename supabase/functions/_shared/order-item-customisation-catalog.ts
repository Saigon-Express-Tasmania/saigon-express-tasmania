import type { OrderItemCustomisation } from "./order-item-customisation.ts";
import { createServiceClient } from "./supabase.ts";

export type CustomisationLabelCatalog = Record<
  string,
  { title: string; options: Record<string, string> }
>;

type CatalogOptionRow = {
  key: string;
  title: string;
};

type CatalogGroupRow = {
  key: string;
  title: string;
  product_customization_options?: CatalogOptionRow[] | null;
};

function normalizeCustomisationLabel(label: string): string {
  return label.trim().replace(/:+\s*$/u, "");
}

export async function fetchCustomisationLabelCatalog(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<CustomisationLabelCatalog> {
  const { data, error } = await supabase
    .from("product_customizations")
    .select(`
      key,
      title,
      product_customization_options (
        key,
        title
      )
    `)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load customisation catalog: ${error.message}`);
  }

  const catalog: CustomisationLabelCatalog = {};
  for (const row of data ?? []) {
    const group = row as CatalogGroupRow;
    const key = String(group.key ?? "").trim();
    const title = normalizeCustomisationLabel(String(group.title ?? ""));
    if (!key || !title) continue;

    const options: Record<string, string> = {};
    for (const option of group.product_customization_options ?? []) {
      const optionKey = String(option.key ?? "").trim();
      const optionTitle = normalizeCustomisationLabel(String(option.title ?? ""));
      if (!optionKey || !optionTitle) continue;
      options[optionKey] = optionTitle;
    }

    catalog[key] = { title, options };
  }

  return catalog;
}

export type CustomisationSummaryGroup = {
  groupKey: string;
  groupTitle: string;
  optionLabels: string[];
};

export function resolveCustomisationSummaryGroups(
  customisation: OrderItemCustomisation,
  catalog?: CustomisationLabelCatalog,
): CustomisationSummaryGroup[] {
  if (customisation.groups?.length) {
    return customisation.groups.map((group) => ({
      groupKey: group.key,
      groupTitle: normalizeCustomisationLabel(group.title),
      optionLabels: group.options.map((option) =>
        normalizeCustomisationLabel(option.title),
      ),
    }));
  }

  const groups: CustomisationSummaryGroup[] = [];
  for (const [groupKey, optionIds] of Object.entries(customisation.selections)) {
    if (optionIds.length === 0) continue;

    const catalogGroup = catalog?.[groupKey];
    groups.push({
      groupKey,
      groupTitle: normalizeCustomisationLabel(
        catalogGroup?.title ?? formatCustomisationGroupKey(groupKey),
      ),
      optionLabels: optionIds.map((optionId) =>
        normalizeCustomisationLabel(
          catalogGroup?.options[optionId] ?? formatCustomisationOptionId(optionId),
        ),
      ),
    });
  }

  return groups;
}

function formatCustomisationGroupKey(groupKey: string): string {
  return groupKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatCustomisationOptionId(optionId: string): string {
  return optionId
    .replace(/^(no_|extra_|sauce_|well_|rare_)/, (match) => {
      if (match === "no_") return "No ";
      if (match === "extra_") return "Extra ";
      if (match === "sauce_") return "";
      if (match === "well_") return "Well ";
      if (match === "rare_") return "Rare ";
      return match;
    })
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
