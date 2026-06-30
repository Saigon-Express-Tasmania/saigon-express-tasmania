import {
  parseOrderItemCustomisation,
  type OrderItemCustomisation,
} from "./order-item-customisation.ts";
import {
  resolveCustomisationSummaryGroups,
  type CustomisationLabelCatalog,
} from "./order-item-customisation-catalog.ts";

export type OrderEmailItemRow = {
  sku: string;
  uom: string;
  is_catch_weight: boolean;
  customisation?: unknown;
};

function formatCustomisationSummaryGroupLine(
  group: { groupTitle: string; optionLabels: string[] },
  multipleGroups: boolean,
): string {
  const joined = group.optionLabels.join(" · ");
  const groupTitle = group.groupTitle.trim().replace(/:+\s*$/u, "");

  if (group.optionLabels.length > 1 || multipleGroups) {
    return `${groupTitle}: ${joined}`;
  }

  return joined;
}

export function formatOrderItemCustomisationSpecs(
  customisation: OrderItemCustomisation,
  catalog?: CustomisationLabelCatalog,
): string {
  const groups = resolveCustomisationSummaryGroups(customisation, catalog);
  const multipleGroups = groups.length > 1;

  const parts = groups.map((group) =>
    formatCustomisationSummaryGroupLine(group, multipleGroups),
  );

  const note = customisation.note.trim();
  if (note) {
    parts.push(`"${note}"`);
  }

  return parts.join(" · ");
}

export function formatOrderItemSpecsForEmail(
  item: OrderEmailItemRow,
  catalog?: CustomisationLabelCatalog,
): string {
  const customisation = parseOrderItemCustomisation(item.customisation);
  if (customisation) {
    const parts = [formatOrderItemCustomisationSpecs(customisation, catalog)].filter(
      Boolean,
    );
    if (item.is_catch_weight) parts.push("Catch weight");
    return parts.join(" · ");
  }

  const parts = [item.sku.trim(), item.uom.trim()];
  if (item.is_catch_weight) parts.push("Catch weight");
  return parts.filter(Boolean).join(" · ");
}
