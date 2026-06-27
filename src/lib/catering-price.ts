/** Extract the first dollar amount from catering display prices (e.g. "$95", "From $8.50/person"). */
export function parseCateringPrice(price: string | null | undefined): number | null {
  if (!price?.trim()) return null;
  const match = price.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function formatAud(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Lowest–highest label from one or more catering price strings. */
export function formatCateringPriceRange(
  prices: Array<string | null | undefined>,
): string | null {
  const amounts = prices
    .map((price) => parseCateringPrice(price))
    .filter((value): value is number => value != null);

  if (amounts.length === 0) return null;

  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (min === max) return formatAud(min);
  return `${formatAud(min)} - ${formatAud(max)}`;
}

/** Price label for catering menu cards (range when tiers exist). */
export function formatCateringPackCardPriceLabel(
  price: string | null | undefined,
  tierPrices: Array<string | null | undefined>,
): string | null {
  if (tierPrices.length > 0) {
    return formatCateringPriceRange(tierPrices);
  }
  return price?.trim() || null;
}

export function isCateringUnitPriceEstimated(
  catalogUnitPrice: string | null | undefined,
): boolean {
  return !String(catalogUnitPrice ?? "").trim();
}

export function isCateringCartTotalEstimated(
  items: Array<{ catalogUnitPrice?: string | null }>,
): boolean {
  return items.some((item) => isCateringUnitPriceEstimated(item.catalogUnitPrice));
}
