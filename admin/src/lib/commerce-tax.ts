import { fetchSettingsByKeys } from '@/lib/settings';

const DEFAULT_GST_TAX_RATE = 0.1;
const DEFAULT_IS_GST_INCLUSIVE = true;

export type CommerceTaxSettings = {
  isGstInclusive: boolean;
  gstTaxRate: number;
};

function parseGstTaxRate(raw: string | undefined): number {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return DEFAULT_GST_TAX_RATE;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_GST_TAX_RATE;

  if (parsed > 1) return parsed / 100;
  return parsed;
}

function parseIsGstInclusive(raw: string | undefined): boolean {
  const trimmed = String(raw ?? '').trim().toLowerCase();
  if (!trimmed) return DEFAULT_IS_GST_INCLUSIVE;
  return trimmed === 'true';
}

export function resolveCommerceTaxSettings(
  settings: Record<string, string>,
): CommerceTaxSettings {
  return {
    isGstInclusive: parseIsGstInclusive(settings.is_gst_inclusive),
    gstTaxRate: parseGstTaxRate(settings.gst_tax_rate),
  };
}

export async function fetchCommerceTaxSettings(): Promise<CommerceTaxSettings> {
  const settings = await fetchSettingsByKeys(['is_gst_inclusive', 'gst_tax_rate']);
  return resolveCommerceTaxSettings(settings);
}
