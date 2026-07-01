/** Extract a dollar amount from catering prices (e.g. "$95", "From $8.50/person", or tier "95"). */
export function parseCateringPrice(price: string | null | undefined): number | null {
  if (!price?.trim()) return null;

  const withDollar = price.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (withDollar) {
    const value = Number(withDollar[1]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const plain = price.trim().match(/^(\d+(?:\.\d{1,2})?)$/);
  if (plain) {
    const value = Number(plain[1]);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  return null;
}

export function formatAud(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Display label with $ for catalog, tier, or cart prices. */
export function formatCateringDisplayPrice(
  price: string | null | undefined,
): string | null {
  const parsed = parseCateringPrice(price);
  if (parsed != null) {
    return Number.isInteger(parsed) ? `$${parsed}` : formatAud(parsed);
  }
  const trimmed = price?.trim();
  return trimmed || null;
}

function formatCateringAmount(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : formatAud(amount);
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
  if (min === max) return formatCateringAmount(min);
  return `${formatCateringAmount(min)} - ${formatCateringAmount(max)}`;
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
