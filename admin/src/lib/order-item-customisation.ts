export type ItemCustomisationGroupSnapshot = {
  key: string;
  title: string;
  options: { key: string; title: string }[];
};

export type ItemCustomisation = {
  selections: Record<string, string[]>;
  groups?: ItemCustomisationGroupSnapshot[];
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
  title: string;
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

/** Trim whitespace and trailing ":" from labels before display. */
export function normalizeCustomisationLabel(label: string): string {
  return label.trim().replace(/:+\s*$/u, '');
}

export function applyItemSpecialNote(
  customisation: ItemCustomisation | null | undefined,
  note: string,
  qty: number,
): ItemCustomisation | null | undefined {
  const trimmed = note.trim();
  const resolvedQty = Number.isFinite(qty) && qty > 0 ? qty : 1;

  if (!customisation) {
    return trimmed
      ? { selections: {}, qty: resolvedQty, note: trimmed, extraPrice: 0 }
      : undefined;
  }

  const updated: ItemCustomisation = {
    ...customisation,
    note: trimmed,
    qty: resolvedQty,
  };

  const hasSelections = Object.values(updated.selections).some((ids) => ids.length > 0);
  const hasGroups = (updated.groups?.length ?? 0) > 0;
  const hasExtra = updated.extraPrice > 0;

  if (!trimmed && !hasSelections && !hasGroups && !hasExtra) {
    return undefined;
  }

  return updated;
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
  const groups = parseCustomisationGroupSnapshots(row.groups);

  if (
    groups.length === 0 &&
    Object.values(parsedSelections).every((ids) => ids.length === 0) &&
    !note.trim()
  ) {
    return null;
  }

  return {
    selections: parsedSelections,
    ...(groups.length > 0 ? { groups } : {}),
    qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
    note,
    extraPrice: Number.isFinite(extraPrice) && extraPrice >= 0 ? extraPrice : 0,
  };
}

export function parseCustomisationGroupSnapshots(
  value: unknown,
): ItemCustomisationGroupSnapshot[] {
  if (!Array.isArray(value)) return [];

  const groups: ItemCustomisationGroupSnapshot[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const key = typeof row.key === 'string' ? row.key.trim() : '';
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const optionsRaw = row.options;
    if (!key || !title || !Array.isArray(optionsRaw)) continue;

    const options: { key: string; title: string }[] = [];
    for (const opt of optionsRaw) {
      if (!opt || typeof opt !== 'object') continue;
      const optRow = opt as Record<string, unknown>;
      const optKey = typeof optRow.key === 'string' ? optRow.key.trim() : '';
      const optTitle = typeof optRow.title === 'string' ? optRow.title.trim() : '';
      if (!optKey || !optTitle) continue;
      options.push({ key: optKey, title: optTitle });
    }

    if (options.length === 0) continue;
    groups.push({ key, title, options });
  }

  return groups;
}

export function formatCustomisationGroupKey(groupKey: string): string {
  return groupKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export type CustomisationSummaryGroup = {
  groupKey: string;
  groupTitle: string;
  optionLabels: string[];
};

function buildGroupsByKey(
  catalog?: ProductCustomizationsCatalog,
): Record<string, ProductCustomizationGroup> | null {
  if (!catalog) return null;
  return Object.values(catalog).reduce<Record<string, ProductCustomizationGroup>>(
    (acc, group) => {
      acc[group.key] = group;
      return acc;
    },
    {},
  );
}

export function getCustomisationSummaryGroups(
  customisation: ItemCustomisation,
  catalog?: ProductCustomizationsCatalog,
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

  const groupsByKey = buildGroupsByKey(catalog);
  const groups: CustomisationSummaryGroup[] = [];

  for (const [groupKey, optionIds] of Object.entries(customisation.selections)) {
    if (optionIds.length === 0) continue;

    const group = groupsByKey?.[groupKey];
    const optionLabels = optionIds.map((optionId) => {
      const option = group?.options.find((entry) => entry.key === optionId);
      return normalizeCustomisationLabel(
        option?.title ?? formatCustomisationOptionId(optionId),
      );
    });

    groups.push({
      groupKey,
      groupTitle: normalizeCustomisationLabel(
        group?.title ?? formatCustomisationGroupKey(groupKey),
      ),
      optionLabels,
    });
  }

  return groups;
}

export function formatCustomisationSummaryGroupLine(
  group: CustomisationSummaryGroup,
  options?: { multipleGroups?: boolean },
): string {
  const joined = group.optionLabels.join(' · ');
  const multipleGroups = options?.multipleGroups ?? false;
  const groupTitle = normalizeCustomisationLabel(group.groupTitle);

  if (group.optionLabels.length > 1 || multipleGroups) {
    return `${groupTitle}: ${joined}`;
  }

  return joined;
}

export function formatCustomisationSummaryText(
  groups: CustomisationSummaryGroup[],
): string {
  const multipleGroups = groups.length > 1;
  return groups
    .map((group) =>
      formatCustomisationSummaryGroupLine(group, { multipleGroups }),
    )
    .join(' · ');
}

export function getCustomisationSummaryLabels(
  customisation: ItemCustomisation,
  catalog?: ProductCustomizationsCatalog,
): string[] {
  return getCustomisationSummaryGroups(customisation, catalog).flatMap(
    (group) => group.optionLabels,
  );
}
