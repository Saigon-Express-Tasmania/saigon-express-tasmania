export type ItemCustomisation = {
  selections: Record<string, string[]>;
  qty: number;
  note: string;
  extraPrice: number;
};

export type ProductCustomizationOption = {
  key: string;
  title: string;
};

export type ProductCustomizationGroup = {
  key: string;
  options: ProductCustomizationOption[];
};

export type ProductCustomizationsCatalog = Record<number, ProductCustomizationGroup & { id: number }>;

export function formatCustomisationOptionId(optionId: string): string {
  return optionId
    .replace(/^(no_|extra_|sauce_|well_|rare_)/, (match) => {
      if (match === 'no_') return 'No ';
      if (match === 'extra_') return 'Extra ';
      if (match === 'sauce_') return '';
      if (match === 'well_') return 'Well ';
      if (match === 'rare_') return 'Rare ';
      return match;
    })
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function parseStoredItemCustomisation(value: unknown): ItemCustomisation | null {
  if (value == null) return null;

  let row: Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      row = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof value === 'object' && !Array.isArray(value)) {
    row = value as Record<string, unknown>;
  } else {
    return null;
  }

  const selections = row.selections;
  if (!selections || typeof selections !== 'object' || Array.isArray(selections)) {
    return null;
  }

  const parsedSelections: Record<string, string[]> = {};
  for (const [groupId, ids] of Object.entries(selections)) {
    if (!Array.isArray(ids)) continue;
    parsedSelections[groupId] = ids.filter((id): id is string => typeof id === 'string');
  }

  const extraPrice = Number(row.extraPrice ?? row.extra_price ?? 0);
  const qty = Number(row.qty ?? 1);
  const note = typeof row.note === 'string' ? row.note : '';

  if (
    Object.values(parsedSelections).every((ids) => ids.length === 0) &&
    !note.trim()
  ) {
    return null;
  }

  return {
    selections: parsedSelections,
    qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
    note,
    extraPrice: Number.isFinite(extraPrice) && extraPrice >= 0 ? extraPrice : 0,
  };
}

export function getCustomisationSummaryLabels(
  customisation: ItemCustomisation,
  catalog?: ProductCustomizationsCatalog,
): string[] {
  const groupsByKey = catalog
    ? Object.values(catalog).reduce<Record<string, ProductCustomizationGroup>>(
        (acc, group) => {
          acc[group.key] = group;
          return acc;
        },
        {},
      )
    : null;

  const labels: string[] = [];
  for (const [groupKey, optionIds] of Object.entries(customisation.selections)) {
    const group = groupsByKey?.[groupKey];
    for (const optionId of optionIds) {
      const option = group?.options.find((entry) => entry.key === optionId);
      labels.push(option?.title ?? formatCustomisationOptionId(optionId));
    }
  }
  return labels;
}
