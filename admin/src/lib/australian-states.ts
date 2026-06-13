export type AustralianStateCode =
  | 'ACT'
  | 'NSW'
  | 'NT'
  | 'QLD'
  | 'SA'
  | 'TAS'
  | 'VIC'
  | 'WA';

export const AUSTRALIAN_STATES: {
  value: AustralianStateCode;
  label: string;
}[] = [
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NSW', label: 'New South Wales' },
  { value: 'NT', label: 'Northern Territory' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'WA', label: 'Western Australia' },
];

export function parseAustralianStateCode(value: unknown): AustralianStateCode | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const byCode = AUSTRALIAN_STATES.find((state) => state.value === raw);
  if (byCode) return byCode.value;

  const byLabel = AUSTRALIAN_STATES.find(
    (state) => state.label.toLowerCase() === raw.toLowerCase(),
  );
  return byLabel?.value ?? null;
}

export function australianStateLabel(value: string | null | undefined): string {
  const raw = value?.trim() ?? '';
  if (!raw) return '—';
  if (raw === 'N/A') return 'N/A';

  const code = parseAustralianStateCode(raw);
  if (!code) return raw;

  return AUSTRALIAN_STATES.find((state) => state.value === code)?.label ?? raw;
}

export function normalizeAustralianStateForStorage(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'N/A') return trimmed;
  return parseAustralianStateCode(trimmed) ?? trimmed;
}
