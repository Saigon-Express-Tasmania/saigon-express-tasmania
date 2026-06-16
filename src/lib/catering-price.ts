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
