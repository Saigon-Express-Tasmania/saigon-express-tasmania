export const BLOG_NEWS_LOGO_NONE_VALUE = '__none__';
export const BLOG_NEWS_LOGO_CUSTOM_VALUE = '__custom__';

export const BLOG_NEWS_LOGO_PRESETS = [
  { label: 'None', value: BLOG_NEWS_LOGO_NONE_VALUE },
  { label: 'AGFG', value: '/images/agfg-logo.png' },
  { label: 'Delicious 100', value: '/images/delicious-logo.svg' },
  { label: 'Pulse Tasmania', value: '/images/pulse-tasmania.png' },
  { label: 'Mercury', value: '/images/themercury.svg' },
  { label: 'Urban List', value: '/images/urban-list.svg' },
  { label: 'Custom URL', value: BLOG_NEWS_LOGO_CUSTOM_VALUE },
] as const;

const PRESET_VALUES = new Set<string>(
  BLOG_NEWS_LOGO_PRESETS.map((option) => option.value).filter(
    (value) =>
      value !== BLOG_NEWS_LOGO_NONE_VALUE &&
      value !== BLOG_NEWS_LOGO_CUSTOM_VALUE,
  ),
);

export function isPresetNewsLogoUrl(value: string): boolean {
  return PRESET_VALUES.has(value.trim());
}

export function getNewsLogoSelectValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return BLOG_NEWS_LOGO_NONE_VALUE;
  if (isPresetNewsLogoUrl(trimmed)) return trimmed;
  return BLOG_NEWS_LOGO_CUSTOM_VALUE;
}

export function resolveSiteAssetUrl(
  url: string | null | undefined,
  siteUrl?: string | null,
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = (siteUrl?.trim() || 'https://saigonexpress.com.au').replace(
    /\/$/,
    '',
  );
  if (trimmed.startsWith('/')) return `${base}${trimmed}`;
  return trimmed;
}
