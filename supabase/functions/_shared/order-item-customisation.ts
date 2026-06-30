export type OrderItemCustomisationGroupSnapshot = {
  key: string;
  title: string;
  options: { key: string; title: string }[];
};

export type OrderItemCustomisation = {
  selections: Record<string, string[]>;
  groups?: OrderItemCustomisationGroupSnapshot[];
  qty: number;
  note: string;
  extraPrice: number;
};

export function parseCustomisationGroupSnapshots(
  value: unknown,
): OrderItemCustomisationGroupSnapshot[] {
  if (!Array.isArray(value)) return [];

  const groups: OrderItemCustomisationGroupSnapshot[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const optionsRaw = row.options;
    if (!key || !title || !Array.isArray(optionsRaw)) continue;

    const options: { key: string; title: string }[] = [];
    for (const opt of optionsRaw) {
      if (!opt || typeof opt !== "object") continue;
      const optRow = opt as Record<string, unknown>;
      const optKey = typeof optRow.key === "string" ? optRow.key.trim() : "";
      const optTitle = typeof optRow.title === "string" ? optRow.title.trim() : "";
      if (!optKey || !optTitle) continue;
      options.push({ key: optKey, title: optTitle });
    }

    if (options.length === 0) continue;
    groups.push({ key, title, options });
  }

  return groups;
}

export function parseOrderItemCustomisation(
  value: unknown,
): OrderItemCustomisation | null {
  let row: Record<string, unknown> | null = null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        row = parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    row = value as Record<string, unknown>;
  }

  if (!row) return null;

  const selections = row.selections;
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) {
    return null;
  }

  const parsedSelections: Record<string, string[]> = {};
  for (const [groupId, ids] of Object.entries(selections)) {
    if (!Array.isArray(ids)) continue;
    parsedSelections[groupId] = ids.filter((id): id is string => typeof id === "string");
  }

  const groups = parseCustomisationGroupSnapshots(row.groups);
  const extraPrice = Number(row.extraPrice ?? 0);
  const qty = Number(row.qty ?? 1);
  const note = typeof row.note === "string" ? row.note : "";

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
